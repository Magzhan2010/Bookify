import { NextResponse } from 'next/server'
import pool from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/**
 * «Фокус» — таймер Помодоро по книге. Монет не даёт, только личная статистика.
 * Дни считаем по времени школы (Казахстан, UTC+5).
 */
const TZ = 'Asia/Qyzylorda'

/**
 * GET /api/focus — книги, на которых можно сфокусироваться, и статистика.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  const me = guard.payload.id

  try {
    const [books, custom, stats, week, byBook] = await Promise.all([
      // Книги, которые сейчас на руках (из библиотеки)
      pool.query(
        `SELECT DISTINCT ON (b.id) b.id AS book_id, b.title, b.author, b.cover_url, br.due_date
           FROM borrows br JOIN books b ON b.id = br.book_id
          WHERE br.user_id = $1 AND br.status = 'active' AND NOT COALESCE(br.own_book, FALSE)
          ORDER BY b.id, br.borrowed_at DESC`, [me]),
      // Свои книги, которые уже вписывали раньше — чтобы не набирать заново
      pool.query(
        `SELECT custom_title AS title, MAX(ended_at) AS last
           FROM focus_sessions WHERE user_id = $1 AND custom_title IS NOT NULL
          GROUP BY custom_title ORDER BY last DESC LIMIT 6`, [me]),
      pool.query(
        `SELECT
           COALESCE(SUM(minutes) FILTER (WHERE (ended_at AT TIME ZONE '${TZ}')::date = (NOW() AT TIME ZONE '${TZ}')::date), 0)::int AS today,
           COALESCE(SUM(minutes) FILTER (WHERE ended_at >= NOW() - INTERVAL '7 days'), 0)::int AS week,
           COALESCE(SUM(minutes), 0)::int AS total,
           COUNT(*) FILTER (WHERE completed)::int AS sessions,
           COUNT(*) FILTER (WHERE completed AND (ended_at AT TIME ZONE '${TZ}')::date = (NOW() AT TIME ZONE '${TZ}')::date)::int AS today_sessions
         FROM focus_sessions WHERE user_id = $1`, [me]),
      // Последние 7 дней по дням + дни для серии
      pool.query(
        `SELECT (ended_at AT TIME ZONE '${TZ}')::date AS day, SUM(minutes)::int AS minutes
           FROM focus_sessions
          WHERE user_id = $1 AND ended_at >= NOW() - INTERVAL '60 days'
          GROUP BY 1 ORDER BY 1 DESC`, [me]),
      pool.query(
        `SELECT COALESCE(b.title, f.custom_title) AS title, b.author, b.cover_url,
                SUM(f.minutes)::int AS minutes, COUNT(*) FILTER (WHERE f.completed)::int AS sessions
           FROM focus_sessions f LEFT JOIN books b ON b.id = f.book_id
          WHERE f.user_id = $1
          GROUP BY COALESCE(b.title, f.custom_title), b.author, b.cover_url
          ORDER BY minutes DESC LIMIT 5`, [me])
    ])

    // Серия: сколько дней подряд (сегодня или со вчера) был хотя бы один фокус
    const days = new Set(week.rows.map(r => String(r.day instanceof Date ? r.day.toISOString() : r.day).slice(0, 10)))
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const cursor = new Date(today)
    if (!days.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1)
    let streak = 0
    while (days.has(iso(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }

    // Последние 7 дней для графика, включая пустые
    const map = new Map(week.rows.map(r => [String(r.day instanceof Date ? r.day.toISOString() : r.day).slice(0, 10), r.minutes]))
    const last7 = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      last7.push({ day: iso(d), minutes: map.get(iso(d)) || 0 })
    }

    return NextResponse.json({
      books: books.rows,
      custom: custom.rows.map(r => r.title),
      stats: { ...stats.rows[0], streak },
      last7,
      by_book: byBook.rows
    })
  } catch (err) {
    console.error('[focus GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * POST /api/focus — записать отрезок фокуса.
 * Body: { bookId?, customTitle?, minutes, completed }
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  const me = guard.payload.id

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }

  const minutes = Math.round(Number(body?.minutes))
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) {
    return NextResponse.json({ error: 'Неверная длительность' }, { status: 400 })
  }
  const bookId = parseInt(body?.bookId) || null
  const customTitle = bookId ? null : String(body?.customTitle || '').trim().slice(0, 160) || null
  if (!bookId && !customTitle) return NextResponse.json({ error: 'Выбери книгу' }, { status: 400 })

  try {
    if (bookId) {
      // Только книга, которая была у тебя на руках
      const own = await pool.query('SELECT 1 FROM borrows WHERE user_id = $1 AND book_id = $2 LIMIT 1', [me, bookId])
      if (!own.rows[0]) return NextResponse.json({ error: 'Эта книга не у тебя' }, { status: 400 })
    }
    // Защита от накрутки: отрезки не могут пересекаться по времени (минута запаса)
    const recent = await pool.query(
      `SELECT COUNT(*)::int AS n FROM focus_sessions
        WHERE user_id = $1 AND ended_at > NOW() - make_interval(mins => $2)`, [me, Math.max(0, minutes - 1)])
    if (recent.rows[0].n > 0) {
      return NextResponse.json({ error: 'Этот отрезок уже записан' }, { status: 409 })
    }
    await pool.query(
      `INSERT INTO focus_sessions (user_id, book_id, custom_title, minutes, completed) VALUES ($1, $2, $3, $4, $5)`,
      [me, bookId, customTitle, minutes, body?.completed !== false]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[focus POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
