import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { syncAchievements } from '../../../../lib/achievements'

/** GET /api/profile/achievements[?user=id] — значки, прогресс и серия чтения. */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const other = parseInt(new URL(req.url).searchParams.get('user'))
  // смотреть чужие значки может библиотекарь, команда и учитель; себя — любой
  let userId = guard.payload.id
  if (other && other !== userId) {
    if (!(guard.payload.role === 'librarian' || guard.payload.role === 'teacher' || guard.payload.platform_role)) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }
    userId = other
  }
  try {
    return NextResponse.json(await syncAchievements(pool, userId))
  } catch (err) {
    console.error('[achievements]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
