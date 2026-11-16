import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { publicPrize } from '../../../../lib/prizes'
import { getBalance } from '../../../../lib/game'

/**
 * Цель-копилка: приз, к которому копит ученик.
 * GET  — { goal: приз | null, balance }
 * POST — { prizeId } выбрать цель, { prizeId: null } убрать
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  const me = guard.payload.id
  try {
    const [g, balance] = await Promise.all([
      pool.query(
        `SELECT p.id, p.code, p.title, p.description, p.price, p.image, p.updated_at, p.stock, p.active
           FROM users u JOIN prizes p ON p.id = u.goal_prize_id WHERE u.id = $1`, [me]),
      getBalance(pool, me)
    ])
    const p = g.rows[0]
    return NextResponse.json({ goal: p && p.active ? publicPrize(p) : null, balance })
  } catch (err) {
    console.error('[shop/goal GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  const me = guard.payload.id
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const prizeId = body?.prizeId === null ? null : parseInt(body?.prizeId)
  try {
    if (prizeId) {
      const p = await pool.query('SELECT id FROM prizes WHERE id = $1 AND active', [prizeId])
      if (!p.rows[0]) return NextResponse.json({ error: 'Такого приза нет' }, { status: 400 })
    }
    await pool.query('UPDATE users SET goal_prize_id = $2 WHERE id = $1', [me, prizeId || null])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[shop/goal POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
