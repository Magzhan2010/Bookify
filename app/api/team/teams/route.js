import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { TEAM_COLORS } from '../../../../lib/team'

/**
 * GET /api/team/teams — команды с участниками и прогрессом задач.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response

  try {
    const res = await pool.query(`
      SELECT t.id, t.name, t.description, t.color, t.created_at,
             COALESCE((SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url) ORDER BY u.name)
                         FROM team_memberships m JOIN users u ON u.id = m.user_id
                        WHERE m.team_id = t.id), '[]') AS members,
             (SELECT COUNT(*) FROM team_tasks x WHERE x.team_id = t.id)::int AS tasks_total,
             (SELECT COUNT(*) FROM team_tasks x WHERE x.team_id = t.id AND x.status = 'done')::int AS tasks_done
        FROM teams t
       ORDER BY t.created_at ASC
    `)
    return NextResponse.json(res.rows)
  } catch (err) {
    console.error('[team/teams]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * POST /api/team/teams — тимлид создаёт команду.
 * Body: { name, description?, color?, memberIds? }
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['teamlead'])
  if (!guard.ok) return guard.response

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const name = String(body?.name || '').trim().slice(0, 60)
  if (!name) return NextResponse.json({ error: 'Назови команду' }, { status: 400 })
  const description = String(body?.description || '').trim().slice(0, 300) || null
  const color = TEAM_COLORS.includes(body?.color) ? body.color : TEAM_COLORS[0]
  const memberIds = (Array.isArray(body?.memberIds) ? body.memberIds : []).map(Number).filter(Number.isInteger)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const t = await client.query(
      `INSERT INTO teams (name, description, color, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, description, color, guard.payload.id]
    )
    for (const uid of memberIds) {
      await client.query(
        `INSERT INTO team_memberships (team_id, user_id)
         SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM team_members WHERE user_id = $2)
         ON CONFLICT DO NOTHING`, [t.rows[0].id, uid])
    }
    await client.query('COMMIT')
    return NextResponse.json({ success: true, id: t.rows[0].id })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[team/teams POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
