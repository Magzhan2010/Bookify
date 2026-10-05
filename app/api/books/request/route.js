import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * POST /api/books/request
 * Ученик хочет забрать книгу — создаёт запись в book_requests.
 * Body: { bookId }
 *
 * Если ученик уже оставил заявку на эту книгу — ошибка.
 * Если ученик уже взял эту книгу — ошибка.
 */
export async function POST(req) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const { bookId } = await req.json()
  if (!bookId) return NextResponse.json({ error: 'Не указана книга' }, { status: 400 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Проверяем книгу
    const bookRes = await client.query('SELECT id, title, available_copies FROM books WHERE id = $1', [bookId])
    if (!bookRes.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    }

    // Нельзя запрашивать книгу, если она недоступна
    if (bookRes.rows[0].available_copies <= 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Все экземпляры на руках' }, { status: 400 })
    }

    // Нельзя дублировать заявку
    const dup = await client.query(
      `SELECT id FROM book_requests
        WHERE user_id = $1 AND book_id = $2 AND status IN ('pending','approved')`,
      [guard.payload.id, bookId]
    )
    if (dup.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Ты уже оставил заявку на эту книгу' }, { status: 400 })
    }

    // Уже взял эту книгу?
    const active = await client.query(
      `SELECT id FROM borrows
        WHERE user_id = $1 AND book_id = $2 AND status = 'active'`,
      [guard.payload.id, bookId]
    )
    if (active.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Эта книга уже у тебя' }, { status: 400 })
    }

    const result = await client.query(
      `INSERT INTO book_requests (user_id, book_id, status) VALUES ($1, $2, 'pending') RETURNING *`,
      [guard.payload.id, bookId]
    )

    await client.query('COMMIT')
    return NextResponse.json({
      success: true,
      request: result.rows[0],
      book_title: bookRes.rows[0].title
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Request error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
  }
}

/**
 * GET /api/books/request
 * Список своих заявок (ученик видит свои).
 */
export async function GET(req) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  try {
    const res = await pool.query(
      `SELECT r.*, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover
       FROM book_requests r
       JOIN books b ON b.id = r.book_id
       WHERE r.user_id = $1
         AND r.status IN ('pending','approved')
       ORDER BY r.requested_at DESC`,
      [guard.payload.id]
    )
    return NextResponse.json(res.rows)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/books/request
 * Ученик отменяет свою заявку.
 * Body: { requestId }
 */
export async function DELETE(req) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const { requestId } = await req.json()
  if (!requestId) return NextResponse.json({ error: 'Не указан ID заявки' }, { status: 400 })

  try {
    const res = await pool.query(
      `UPDATE book_requests SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING id`,
      [requestId, guard.payload.id]
    )
    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Заявка не найдена или уже обработана' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}