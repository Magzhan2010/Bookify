import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/profile/points
 * Баланс баллов ученика + история начислений + личная полка.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response

  const userId = guard.payload.id

  try {
    // Баланс
    const balanceRes = await pool.query(
      `SELECT
         COALESCE(SUM(points), 0)::int AS total,
         COALESCE(SUM(points) FILTER (WHERE spent = FALSE), 0)::int AS available,
         COALESCE(SUM(points) FILTER (WHERE spent = TRUE), 0)::int AS spent
       FROM user_points WHERE user_id = $1`,
      [userId]
    )

    // История начислений
    const historyRes = await pool.query(
      `SELECT up.*, b.title AS book_title, b.cover_url AS book_cover, b.author AS book_author
       FROM user_points up
       LEFT JOIN books b ON b.id = up.book_id
       WHERE up.user_id = $1
       ORDER BY up.created_at DESC
       LIMIT 50`,
      [userId]
    )

    // Личная полка — прочитанные книги
    const shelfRes = await pool.query(
      `SELECT br.id AS borrow_id, br.rating, br.returned_at, br.borrowed_at,
              b.id AS book_id, b.title, b.author, b.cover_url, b.genre, b.pages,
              r.content AS review_content, r.status AS review_status, r.created_at AS review_at
       FROM borrows br
       JOIN books b ON b.id = br.book_id
       LEFT JOIN book_reviews r ON r.borrow_id = br.id
       WHERE br.user_id = $1 AND br.status IN ('reviewed','approved')
       ORDER BY COALESCE(r.created_at, br.returned_at) DESC`,
      [userId]
    )

    // Статистика по баллам
    const statsRes = await pool.query(
      `SELECT
         COUNT(DISTINCT book_id) FILTER (WHERE reason LIKE 'pages%')::int AS books_count,
         COUNT(*) FILTER (WHERE reason = 'review')::int AS reviews_count,
         COUNT(*) FILTER (WHERE reason = 'video')::int AS videos_count,
         COUNT(*) FILTER (WHERE reason = 'tedx')::int AS tedx_count
       FROM user_points WHERE user_id = $1`,
      [userId]
    )

    // Правила начисления (для справки в профиле)
    const rulesRes = await pool.query(
      'SELECT code, title, points, description FROM point_rules ORDER BY points DESC'
    )

    return NextResponse.json({
      balance: balanceRes.rows[0],
      history: historyRes.rows,
      shelf: shelfRes.rows,
      stats: statsRes.rows[0],
      rules: rulesRes.rows
    })
  } catch (err) {
    console.error('Points error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}