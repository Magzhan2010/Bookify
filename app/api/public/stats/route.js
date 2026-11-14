import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../../lib/db'

/**
 * Публичные цифры для главной страницы — только общие суммы, без имён и личных данных.
 * Кэшируется на 5 минут, чтобы главная не дёргала базу на каждый заход.
 */
export async function GET() {
  try {
    await ensureSchema()
    const r = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM books WHERE archived_at IS NULL)::int AS books,
         (SELECT COUNT(*) FROM users
           WHERE role = 'student'
              OR (role = 'teacher' AND NOT COALESCE(teacher_pending, FALSE)))::int AS readers,
         (SELECT COUNT(*) FROM (
            SELECT DISTINCT p.user_id, p.book_id
              FROM user_points p
             WHERE p.reason LIKE 'pages%' AND NOT COALESCE(p.reverted, FALSE)
          ) t)::int AS read,
         (SELECT GREATEST(COALESCE(SUM(p.points), 0), 0)
            FROM user_points p
            JOIN users u ON u.id = p.user_id
           WHERE u.role IN ('student', 'teacher'))::int AS coins`
    )
    return NextResponse.json(r.rows[0], {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    })
  } catch (e) {
    return NextResponse.json({ error: 'stats unavailable' }, { status: 500 })
  }
}
