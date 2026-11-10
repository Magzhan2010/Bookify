import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth, isTeamleadEmail } from '../../../../lib/auth'

/**
 * GET /api/team/me — кто я на командной платформе.
 * { member: false } — если пользователь не участник (интерфейс не покажет вход).
 * Тимлид из TEAMLEAD_EMAILS при первом входе сам записывается в team_members.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const me = guard.payload

  try {
    if (isTeamleadEmail(me.email)) {
      await pool.query(
        `INSERT INTO team_members (user_id, platform_role, title)
         VALUES ($1, 'lead', 'Teamlead')
         ON CONFLICT (user_id) DO UPDATE SET platform_role = 'lead'`,
        [me.id]
      )
    }

    // Библиотекарь всегда на платформе: ставит задачи команде
    if (me.role === 'librarian') {
      await pool.query(
        `INSERT INTO team_members (user_id, platform_role, title)
         VALUES ($1, 'member', 'Библиотекарь')
         ON CONFLICT (user_id) DO NOTHING`,
        [me.id]
      )
    }

    const res = await pool.query(
      `SELECT tm.platform_role, tm.title, u.class_name, u.avatar_url,
              COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
                FILTER (WHERE t.id IS NOT NULL), '[]') AS teams
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         LEFT JOIN team_memberships m ON m.user_id = tm.user_id
         LEFT JOIN teams t ON t.id = m.team_id
        WHERE tm.user_id = $1
        GROUP BY tm.user_id, u.id`,
      [me.id]
    )
    const row = res.rows[0]
    if (!row) return NextResponse.json({ member: false })

    return NextResponse.json({
      member: true,
      id: me.id,
      name: me.name,
      email: me.email,
      role: me.role,
      platform_role: row.platform_role,
      is_lead: row.platform_role === 'lead',
      can_assign: row.platform_role === 'lead' || me.role === 'librarian',
      title: row.title,
      avatar_url: row.avatar_url,
      teams: row.teams
    })
  } catch (err) {
    console.error('[team/me]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
