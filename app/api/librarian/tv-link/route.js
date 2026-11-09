import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/** GET — ссылка на экран для холла; POST — выдать новый ключ (старая ссылка перестанет работать). */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const r = await pool.query(`SELECT value FROM app_meta WHERE key = 'tv_key'`)
  return NextResponse.json({ path: `/tv?key=${r.rows[0]?.value || ''}` })
}

export async function POST(req) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  const r = await pool.query(
    `INSERT INTO app_meta (key, value) VALUES ('tv_key', substr(md5(random()::text || clock_timestamp()::text), 1, 16))
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value RETURNING value`)
  return NextResponse.json({ path: `/tv?key=${r.rows[0].value}` })
}
