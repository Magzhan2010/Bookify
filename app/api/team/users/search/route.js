import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/**
 * GET /api/team/users/search?q= — поиск аккаунтов, ещё не добавленных на платформу.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['teamlead'])
  if (!guard.ok) return guard.response

  const q = new URL(req.url).searchParams.get('q')?.trim() || ''
  if (q.length < 2) return NextResponse.json([])

  try {
    const res = await pool.query(
      `SELECT u.id, u.name, u.email, u.class_name, u.role, u.avatar_url
         FROM users u
        WHERE NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id)
          AND (LOWER(u.name) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))
        ORDER BY u.name
        LIMIT 12`,
      [`%${q}%`]
    )
    return NextResponse.json(res.rows)
  } catch (err) {
    console.error('[team/users/search]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
