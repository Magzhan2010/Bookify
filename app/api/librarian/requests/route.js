import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/librarian/requests
 * Все заявки учеников на книги.
 * Query: ?status=pending (по умолчанию), approved, all
 */
export async function GET(req) {
  const guard = requireAuth(req, ['librarian', 'admin'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  try {
    const where = status === 'all' ? '' : 'WHERE r.status = $1'
    const params = status === 'all' ? [] : [status]

    const res = await pool.query(
      `SELECT r.*,
              u.name AS student_name, u.email AS student_email, u.class_name AS student_class,
              b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover,
              b.available_copies
       FROM book_requests r
       JOIN users u ON u.id = r.user_id
       JOIN books b ON b.id = r.book_id
       ${where}
       ORDER BY r.requested_at DESC
       LIMIT 100`,
      params
    )
    return NextResponse.json(res.rows)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}