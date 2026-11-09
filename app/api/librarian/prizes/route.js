import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { publicPrize, validatePrize } from '../../../../lib/prizes'

const ROLES = ['librarian', 'teamlead']

/** GET /api/librarian/prizes — все призы (и скрытые) со статистикой заказов. */
export async function GET(req) {
  const guard = await requireAuth(req, ROLES)
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query(`
      SELECT p.id, p.code, p.title, p.description, p.price, p.image, p.sort, p.needs_note, p.active, p.stock, p.updated_at,
             COUNT(o.id) FILTER (WHERE o.status = 'pending')::int AS pending,
             COUNT(o.id) FILTER (WHERE o.status = 'issued')::int AS issued
        FROM prizes p LEFT JOIN prize_orders o ON o.prize_id = p.id
       GROUP BY p.id
       ORDER BY p.sort ASC, p.price ASC`)
    return NextResponse.json(r.rows.map(publicPrize))
  } catch (err) {
    console.error('[prizes GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/** POST /api/librarian/prizes — новый приз. Body: { title, description?, price, stock?, image?, needs_note? } */
export async function POST(req) {
  const guard = await requireAuth(req, ROLES)
  if (!guard.ok) return guard.response
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const { value, error } = validatePrize(body)
  if (error) return NextResponse.json({ error }, { status: 400 })
  try {
    const r = await pool.query(
      `INSERT INTO prizes (code, title, description, price, image, sort, needs_note, active, stock)
       VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(sort), 0) + 1 FROM prizes), $6, TRUE, $7)
       RETURNING id`,
      ['custom_' + Date.now().toString(36), value.title, value.description ?? null, value.price,
        value.image ?? null, value.needs_note ?? false, value.stock ?? null])
    return NextResponse.json({ success: true, id: r.rows[0].id })
  } catch (err) {
    console.error('[prizes POST]', err)
    return NextResponse.json({ error: 'Не удалось добавить приз' }, { status: 500 })
  }
}
