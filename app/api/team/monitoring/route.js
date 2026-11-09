import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { BONUSES } from '../../../../lib/points'
import { getGameStart } from '../../../../lib/game'

/**
 * GET /api/team/monitoring?class=
 * По каждому ученику: сколько взял и сдал, отзывы (одобрены / ждут / отклонены /
 * не написаны по сданным книгам), видео, TEDx, монеты, последняя активность.
 * Участники самой платформы в список не попадают.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response

  const className = new URL(req.url).searchParams.get('class')?.trim()
  try {
    // Учитываем только то, что было после старта программы
    const start = await getGameStart(pool)
    const params = [start || '-infinity']
    let classCond = ''
    if (className) { params.push(className); classCond = `AND u.class_name = $2` }

    const res = await pool.query(`
      WITH b AS (
        SELECT user_id,
               COUNT(*) FILTER (WHERE status = 'active' OR borrowed_at >= $1::timestamptz OR returned_at >= $1::timestamptz)::int AS borrowed,
               COUNT(*) FILTER (WHERE status = 'active')::int AS reading,
               COUNT(*) FILTER (WHERE status <> 'active' AND returned_at >= $1::timestamptz)::int AS finished,
               MAX(GREATEST(borrowed_at, COALESCE(returned_at, borrowed_at))) AS last_borrow
          FROM borrows GROUP BY user_id
      ),
      rv AS (
        SELECT user_id,
               COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
               COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
               COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
               MAX(created_at) AS last_review
          FROM book_reviews WHERE created_at >= $1::timestamptz GROUP BY user_id
      ),
      miss AS (
        SELECT br.user_id, COUNT(*)::int AS missing,
               COALESCE(json_agg(json_build_object('borrow_id', br.id, 'title', bk.title, 'returned_at', br.returned_at)
                          ORDER BY br.returned_at DESC NULLS LAST), '[]') AS missing_books
          FROM borrows br
          JOIN books bk ON bk.id = br.book_id
         WHERE br.status <> 'active'
           AND br.returned_at >= $1::timestamptz
           AND NOT EXISTS (SELECT 1 FROM book_reviews r WHERE r.borrow_id = br.id)
         GROUP BY br.user_id
      ),
      pt AS (
        SELECT user_id,
               COALESCE(SUM(points), 0)::int AS earned,
               COUNT(*) FILTER (WHERE reason = 'video')::int AS videos,
               COUNT(*) FILTER (WHERE reason = 'tedx')::int AS tedx
          FROM user_points GROUP BY user_id
      )
      SELECT u.id, u.name, u.class_name, u.avatar_url,
             COALESCE(b.borrowed, 0) AS borrowed,
             COALESCE(b.reading, 0) AS reading,
             COALESCE(b.finished, 0) AS finished,
             COALESCE(rv.approved, 0) AS reviews_approved,
             COALESCE(rv.pending, 0) AS reviews_pending,
             COALESCE(rv.rejected, 0) AS reviews_rejected,
             COALESCE(miss.missing, 0) AS reviews_missing,
             COALESCE(miss.missing_books, '[]') AS missing_books,
             COALESCE(pt.videos, 0) AS videos,
             COALESCE(pt.tedx, 0) AS tedx,
             COALESCE(pt.earned, 0) AS earned,
             GREATEST(b.last_borrow, rv.last_review) AS last_activity
        FROM users u
        LEFT JOIN b ON b.user_id = u.id
        LEFT JOIN rv ON rv.user_id = u.id
        LEFT JOIN miss ON miss.user_id = u.id
        LEFT JOIN pt ON pt.user_id = u.id
       WHERE u.role = 'student' ${classCond}
         AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id)
       ORDER BY u.class_name ASC NULLS LAST, u.name ASC
       LIMIT 1000
    `, params)

    const classes = await pool.query(
      `SELECT DISTINCT class_name FROM users WHERE role = 'student' AND class_name IS NOT NULL ORDER BY class_name`
    )

    const rows = res.rows
    const summary = {
      students: rows.length,
      reading: rows.filter(r => r.reading > 0).length,
      finished_books: rows.reduce((s, r) => s + r.finished, 0),
      reviews_written: rows.reduce((s, r) => s + r.reviews_approved + r.reviews_pending + r.reviews_rejected, 0),
      reviews_missing: rows.reduce((s, r) => s + r.reviews_missing, 0),
      students_missing: rows.filter(r => r.reviews_missing > 0).length,
      videos: rows.reduce((s, r) => s + r.videos, 0),
      tedx: rows.reduce((s, r) => s + r.tedx, 0),
      tedx_students: rows.filter(r => r.tedx > 0).length
    }

    return NextResponse.json({ summary, game_start: start, classes: classes.rows.map(r => r.class_name), students: rows })
  } catch (err) {
    console.error('[team/monitoring]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * POST /api/team/monitoring — отметить выступление на TEDx или видео ученика
 * (начисляет баллы по правилам). Body: { userId, kind: 'tedx'|'video', note? }
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const userId = parseInt(body?.userId)
  const bonus = body?.kind === 'tedx' ? BONUSES.tedx : body?.kind === 'video' ? BONUSES.video : null
  if (!userId || !bonus) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 })
  const note = String(body?.note || '').trim().slice(0, 200)

  try {
    const u = await pool.query(`SELECT id FROM users WHERE id = $1 AND role = 'student'`, [userId])
    if (!u.rows[0]) return NextResponse.json({ error: 'Ученик не найден' }, { status: 404 })
    await pool.query(
      `INSERT INTO user_points (user_id, points, reason, description, created_by) VALUES ($1, $2, $3, $4, $5)`,
      [userId, bonus.points, bonus.code, note ? `${bonus.title}: ${note}` : bonus.title, guard.payload.id]
    )
    return NextResponse.json({ success: true, points: bonus.points })
  } catch (err) {
    console.error('[team/monitoring POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
