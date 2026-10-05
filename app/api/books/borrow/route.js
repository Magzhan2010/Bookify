import pool from '../../../../lib/db'
import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"

export async function POST(req) {
  const client = await pool.connect()
  try {
    const { bookId } = await req.json()
    const auth = req.headers.get('authorization')
    const token = auth?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Токен не найден' }, { status: 401 })
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'JWT_SECRET не задан' }, { status: 500 })
    }

    let payload
    try {
      payload = jwt.verify(token, secret)
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return NextResponse.json({ error: 'Токен истёк' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    const userId = payload.id

    await client.query('BEGIN')

    // Лимит: максимум 3 книги одновременно
    const userLoans = await client.query(
      "SELECT COUNT(*) as count FROM borrows WHERE user_id = $1 AND status = 'active'",
      [userId]
    )
    const count = parseInt(userLoans.rows[0].count)
    if (count >= 3) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'У тебя уже 3 книги. Верни одну, чтобы взять новую' }, { status: 400 })
    }

    // Проверяем доступность
    const bookCheck = await client.query(
      'SELECT id, available_copies, title FROM books WHERE id = $1 FOR UPDATE',
      [bookId]
    )
    if (!bookCheck.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    }
    if (bookCheck.rows[0].available_copies <= 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: `Все экземпляры "${bookCheck.rows[0].title}" на руках` }, { status: 400 })
    }

    // Не дать взять одну книгу дважды
    const alreadyBorrowed = await client.query(
      "SELECT id FROM borrows WHERE user_id = $1 AND book_id = $2 AND status = 'active'",
      [userId, bookId]
    )
    if (alreadyBorrowed.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Ты уже взял эту книгу' }, { status: 400 })
    }

    // Срок — 14 дней
    const result = await client.query(
      `INSERT INTO borrows (book_id, user_id, due_date, status, borrowed_at)
       VALUES ($1, $2, NOW() + INTERVAL '14 days', 'active', NOW())
       RETURNING id, due_date`,
      [bookId, userId]
    )

    // Уменьшаем available_copies
    await client.query(
      'UPDATE books SET available_copies = available_copies - 1, updated_at = NOW() WHERE id = $1',
      [bookId]
    )

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      borrowId: result.rows[0].id,
      due_date: result.rows[0].due_date,
      message: 'Книга у тебя. Верни в библиотеку до ' + due_date.toLocaleDateString('ru-RU') + '.'
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Borrow error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}