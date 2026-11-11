import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/** GET /api/librarian/shelf-requests — заявки «на полку без отзыва», ждут решения. */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query(`
      SELECT s.id, s.user_id, s.book_id, s.borrow_id, s.created_at,
             u.name AS student_name, u.class_name AS student_class, u.avatar_url AS student_avatar,
             b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover,
             (SELECT COUNT(*)::int FROM shelf_requests x WHERE x.user_id = s.user_id AND x.status = 'pending') AS pending_total
        FROM shelf_requests s
        JOIN users u ON u.id = s.user_id
        JOIN books b ON b.id = s.book_id
       WHERE s.status = 'pending'
       ORDER BY s.created_at
       LIMIT 200`)
    return NextResponse.json(r.rows)
  } catch (err) {
    console.error('[shelf-requests GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
