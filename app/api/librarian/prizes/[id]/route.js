import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { validatePrize } from '../../../../../lib/prizes'

/** PATCH /api/librarian/prizes/[id] — изменить цену, остаток, название, фото, показ в магазине. */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const { value, error } = validatePrize(body, { partial: true })
  if (error) return NextResponse.json({ error }, { status: 400 })
  const keys = Object.keys(value)
  if (!keys.length) return NextResponse.json({ error: 'Нечего менять' }, { status: 400 })
  try {
    const sets = keys.map((k, i) => `${k} = $${i + 1}`)
    const r = await pool.query(
      `UPDATE prizes SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING id`,
      [...keys.map(k => value[k]), id])
    if (!r.rows[0]) return NextResponse.json({ error: 'Приз не найден' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[prizes PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
