import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { getGameStart } from '../../../../lib/game'

/** GET /api/team/settings — дата старта программы. */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  return NextResponse.json({ game_start: await getGameStart(pool) })
}

/**
 * PATCH /api/team/settings — Body: { gameStart: 'YYYY-MM-DD' }
 * Меняет тимлид или библиотекарь. До этой даты история не считается:
 * сданные книги не требуют отзыва и не дают монет.
 */
export async function PATCH(req) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const d = String(body?.gameStart || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(new Date(d).getTime())) {
    return NextResponse.json({ error: 'Укажи дату' }, { status: 400 })
  }
  const value = `${d}T00:00:00+05:00` // полночь по времени школы
  try {
    await pool.query(
      `INSERT INTO app_meta (key, value) VALUES ('game_start', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [value])
    return NextResponse.json({ success: true, game_start: value })
  } catch (err) {
    console.error('[team/settings]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
