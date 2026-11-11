import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { NextResponse } from 'next/server'

/**
 * POST /api/librarian/return
 * Принимает возврат книги от ученика.
 * Body: { borrowId, rating?, notes?, noReview? }
 *   noReview: true — ученик вернул, не прочитав (не понравилась): книга на полку,
 *   отзыв не нужен, монет нет, в «прочитанные» и «без отзыва» не попадает.
 *   rating: 1-5 (опционально) — ученик сам поставил оценку, библиотекарь передаёт
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response

  const { borrowId, rating, notes, noReview } = await req.json()
  if (!borrowId) return NextResponse.json({ error: 'Не указан ID займа' }, { status: 400 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const borrowRes = await client.query(
      `SELECT b.*, u.name AS student_name, bk.title AS book_title
       FROM borrows b
       JOIN users u ON u.id = b.user_id
       JOIN books bk ON bk.id = b.book_id
       WHERE b.id = $1 FOR UPDATE`,
      [borrowId]
    )
    if (!borrowRes.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 })
    }
    const borrow = borrowRes.rows[0]
    // Участник команды не принимает возврат сам у себя
    if (Number(borrow.user_id) === Number(guard.payload.id) && guard.payload.role !== 'librarian') {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Свою книгу сдай другому участнику или библиотекарю' }, { status: 403 })
    }
    if (borrow.status !== 'active') {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Уже возвращена' }, { status: 400 })
    }

    // Валидация рейтинга
    const validRating = (rating >= 1 && rating <= 5) ? rating : null

    await client.query(
      `UPDATE borrows
       SET status = $4, returned_at = NOW(), rating = $2, notes = COALESCE($3, notes), updated_at = NOW()
       WHERE id = $1`,
      [borrowId, validRating, notes || (noReview === true ? 'Вернул без отзыва' : null), noReview === true ? 'cancelled' : 'returned']
    )

    await client.query(
      'UPDATE books SET available_copies = LEAST(available_copies + 1, total_copies), updated_at = NOW() WHERE id = $1',
      [borrow.book_id]
    )

    await client.query('COMMIT')
    return NextResponse.json({
      success: true,
      student_name: borrow.student_name,
      book_title: borrow.book_title,
      no_review: noReview === true
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Return error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
  }
}