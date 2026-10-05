import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * POST /api/librarian/return
 * Body: { borrowId, condition?, notes? }
 * Принимает возврат книги от ученика.
 */
export async function POST(req) {
  const guard = requireAuth(req, ['librarian', 'admin', 'teacher'])
  if (!guard.ok) return guard.response

  const { borrowId, notes } = await req.json()
  if (!borrowId) {
    return NextResponse.json({ error: 'Не указан ID займа' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const borrowRes = await client.query(
      `SELECT b.*, u.name AS student_name, bk.title, bk.id AS book_id
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

    if (borrow.status === 'returned') {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Книга уже возвращена' },
        { status: 400 }
      )
    }

    // Обновляем запись
    const updated = await client.query(
      `UPDATE borrows
       SET status = 'returned', returned_at = NOW(), notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [borrowId, notes || null]
    )

    // Возвращаем экземпляр в доступные
    await client.query(
      'UPDATE books SET available_copies = LEAST(available_copies + 1, total_copies), updated_at = NOW() WHERE id = $1',
      [borrow.book_id]
    )

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      borrow: updated.rows[0],
      student_name: borrow.student_name,
      book_title: borrow.title
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Return error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
  }
}