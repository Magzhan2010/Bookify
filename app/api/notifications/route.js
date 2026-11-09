import { NextResponse } from 'next/server'
import pool from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { notify, fmtDate } from '../../../lib/notify'
import { syncAchievements } from '../../../lib/achievements'

/**
 * GET /api/notifications — последние уведомления и число непрочитанных.
 * Заодно создаёт напоминания о сроке (за 2 дня и при просрочке) и проверяет
 * новые достижения у ученика — поэтому отдельный планировщик не нужен.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const me = guard.payload

  try {
    const due = await pool.query(
      `SELECT b.id, b.due_date, bk.title, b.book_id, to_char(b.due_date, 'YYYY-MM-DD') AS d,
              (b.due_date < NOW()) AS overdue
         FROM borrows b JOIN books bk ON bk.id = b.book_id
        WHERE b.user_id = $1 AND b.status = 'active' AND b.due_date < NOW() + INTERVAL '2 days'`, [me.id])
    for (const b of due.rows) {
      await notify(pool, me.id, b.overdue
        ? { kind: 'overdue', title: `Срок прошёл: ${b.title}`, body: 'Верни книгу или попроси библиотекаря продлить срок.', link: `/books/${b.book_id}`, dedupeKey: `overdue-${b.id}-${b.d}` }
        : { kind: 'due_soon', title: `Скоро вернуть: ${b.title}`, body: `Срок — ${fmtDate(b.due_date)}. Не успеваешь? Попроси продлить.`, link: `/books/${b.book_id}`, dedupeKey: `due-${b.id}-${b.d}` })
    }
    if (me.role === 'student' || me.role === 'teacher') await syncAchievements(pool, me.id).catch(e => console.error('[ach]', e.message))

    const [list, unread] = await Promise.all([
      pool.query(
        `SELECT id, kind, title, body, link, read_at, created_at
           FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`, [me.id]),
      pool.query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL`, [me.id])
    ])
    return NextResponse.json({ unread: unread.rows[0].n, items: list.rows })
  } catch (err) {
    console.error('[notifications]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
