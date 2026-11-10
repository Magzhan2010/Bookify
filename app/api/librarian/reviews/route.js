import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/librarian/reviews
 * Все отзывы учеников (библиотекарь).
 * Query: ?status=pending|approved|rejected|all
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  try {
    const where = status === 'all' ? '' : 'WHERE r.status = $1'
    const params = status === 'all' ? [] : [status]

    const result = await pool.query(
      `SELECT r.*,
              u.name AS student_name, u.avatar_url AS student_avatar, u.class_name AS student_class, u.email AS student_email,
              b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover,
              b.pages AS book_pages,
              br.borrowed_at, br.returned_at,
              (SELECT COALESCE(SUM(up.points), 0) FROM user_points up
                WHERE up.user_id = u.id AND up.spent = FALSE) AS user_points_total
       FROM book_reviews r
       JOIN users u ON u.id = r.user_id
       JOIN books b ON b.id = r.book_id
       JOIN borrows br ON br.id = r.borrow_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT 100`,
      params
    )

    return NextResponse.json(result.rows)
  } catch (err) {
    console.error('Reviews list error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}