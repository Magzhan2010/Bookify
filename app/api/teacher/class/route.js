import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { approvedTeacher } from '../../../../lib/teachers'
import { getGameStart } from '../../../../lib/game'
import { MONTH_START } from '../../../../lib/seasons'

/**
 * GET /api/teacher/class?class=9A — как читает класс (для учителя).
 * Без class — класс, где учитель классный руководитель.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['teacher'])
  if (!guard.ok) return guard.response
  const { teacher, error, status } = await approvedTeacher(pool, guard.payload.id)
  if (error) return NextResponse.json({ error }, { status })

  const cls = (new URL(req.url).searchParams.get('class') || teacher.class_name || '').trim()
  try {
    const classes = await pool.query(
      `SELECT DISTINCT class_name FROM users WHERE role = 'student' AND class_name IS NOT NULL AND class_name <> '' ORDER BY class_name`)
    const list = classes.rows.map(r => r.class_name).sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }))
    if (!cls) return NextResponse.json({ class_name: null, classes: list, students: [] })

    const start = (await getGameStart(pool)) || '-infinity'
    const r = await pool.query(`
      SELECT u.id, u.name, u.avatar_url,
             (SELECT COUNT(*) FROM borrows b WHERE b.user_id = u.id AND b.status = 'active')::int AS reading,
             (SELECT COUNT(*) FROM borrows b WHERE b.user_id = u.id AND b.status = 'active' AND b.due_date < NOW())::int AS overdue,
             (SELECT COUNT(*) FROM borrows b WHERE b.user_id = u.id AND b.status <> 'active' AND b.returned_at >= $2::timestamptz)::int AS finished,
             (SELECT COUNT(*) FROM book_reviews r WHERE r.user_id = u.id AND r.status = 'approved' AND r.created_at >= $2::timestamptz)::int AS reviews,
             (SELECT COALESCE(SUM(points), 0) FROM user_points p WHERE p.user_id = u.id AND p.created_at >= ${MONTH_START})::int AS coins_month,
             (SELECT COALESCE(SUM(points), 0) FROM user_points p WHERE p.user_id = u.id)::int AS coins_total,
             (SELECT bk.title FROM borrows b JOIN books bk ON bk.id = b.book_id WHERE b.user_id = u.id AND b.status = 'active' ORDER BY b.borrowed_at DESC LIMIT 1) AS current_book
        FROM users u
       WHERE u.role = 'student' AND u.class_name = $1
       ORDER BY coins_month DESC, finished DESC, u.name`, [cls, start])
    const s = r.rows
    return NextResponse.json({
      class_name: cls,
      classes: list,
      students: s,
      summary: {
        students: s.length,
        reading: s.filter(x => x.reading > 0).length,
        finished: s.reduce((a, x) => a + x.finished, 0),
        reviews: s.reduce((a, x) => a + x.reviews, 0),
        coins_month: s.reduce((a, x) => a + x.coins_month, 0),
        idle: s.filter(x => x.reading === 0 && x.finished === 0).length
      }
    })
  } catch (err) {
    console.error('[teacher/class]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
