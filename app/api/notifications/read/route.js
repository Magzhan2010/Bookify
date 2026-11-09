import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/** POST /api/notifications/read — Body: { ids?: number[] } (без ids — все). */
export async function POST(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  let body = {}
  try { body = await req.json() } catch {}
  const ids = (Array.isArray(body?.ids) ? body.ids : []).map(Number).filter(Number.isInteger)
  try {
    if (ids.length) {
      await pool.query(`UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND id = ANY($2::int[]) AND read_at IS NULL`, [guard.payload.id, ids])
    } else {
      await pool.query(`UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`, [guard.payload.id])
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[notifications/read]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
