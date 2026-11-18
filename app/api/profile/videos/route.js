import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { VIDEOS_SQL } from '../../../../lib/videosQuery'

/** GET /api/profile/videos — мои видео о книгах (добавляет команда или библиотекарь). */
export async function GET(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query(VIDEOS_SQL, [guard.payload.id])
    return NextResponse.json(r.rows)
  } catch (err) {
    console.error('[profile/videos]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
