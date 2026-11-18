import { NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'
import { requireAuth } from '../../../../../../lib/auth'
import { VIDEOS_SQL } from '../../../../../../lib/videosQuery'

/** GET /api/librarian/students/[id]/videos — видео ученика (библиотекарь и команда). */
export async function GET(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query(VIDEOS_SQL, [parseInt((await params).id)])
    return NextResponse.json(r.rows)
  } catch (err) {
    console.error('[student videos]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
