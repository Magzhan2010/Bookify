import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/**
 * GET /api/books/[id]/readers — кто брал и читал эту книгу, с отзывами и бонусами.
 * Только библиотекарь и тимлид.
 */
export async function GET(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  try {
    const r = await pool.query(`
      SELECT b.id AS borrow_id, b.status, b.borrowed_at, b.returned_at, b.notes, b.own_book,
             u.id AS user_id, u.name, u.class_name, u.avatar_url, u.role,
             rv.content AS review, rv.rating, rv.status AS review_status, rv.created_at AS review_at,
             EXISTS (SELECT 1 FROM user_points p WHERE p.borrow_id = b.id AND p.reason = 'video' AND NOT p.reverted) AS video,
             EXISTS (SELECT 1 FROM user_points p WHERE p.borrow_id = b.id AND p.reason = 'tedx' AND NOT p.reverted) AS tedx,
             (SELECT COALESCE(SUM(p.points), 0) FROM user_points p WHERE p.borrow_id = b.id)::int AS coins
        FROM borrows b
        JOIN users u ON u.id = b.user_id
        LEFT JOIN book_reviews rv ON rv.borrow_id = b.id
       WHERE b.book_id = $1
       ORDER BY COALESCE(b.returned_at, b.borrowed_at) DESC
       LIMIT 300`, [id])
    const rows = r.rows
    return NextResponse.json({
      summary: {
        readers: new Set(rows.filter(x => ['approved', 'reviewed', 'returned'].includes(x.status)).map(x => x.user_id)).size,
        reading: rows.filter(x => x.status === 'active').length,
        reviews: rows.filter(x => x.review_status === 'approved').length,
        avg_rating: (() => { const v = rows.filter(x => x.review_status === 'approved' && x.rating).map(x => x.rating); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null })()
      },
      items: rows
    })
  } catch (err) {
    console.error('[book readers]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
