import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth, isTeamleadEmail } from '../../../../../lib/auth'

/**
 * PATCH /api/team/people/[userId] — тимлид меняет должность, роль, команды.
 * Body: { title?, platformRole?: 'lead'|'member', teamIds?: number[] }
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['teamlead'])
  if (!guard.ok) return guard.response
  const userId = parseInt((await params).userId)

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const cur = await client.query('SELECT user_id FROM team_members WHERE user_id = $1', [userId])
    if (!cur.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Участник не найден' }, { status: 404 })
    }
    if ('title' in body) {
      await client.query('UPDATE team_members SET title = $1 WHERE user_id = $2',
        [String(body.title || '').trim().slice(0, 60) || null, userId])
    }
    if (body.platformRole === 'lead' || body.platformRole === 'member') {
      if (userId === guard.payload.id && body.platformRole === 'member') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Нельзя снять роль тимлида с самого себя' }, { status: 400 })
      }
      await client.query('UPDATE team_members SET platform_role = $1 WHERE user_id = $2', [body.platformRole, userId])
    }
    if (Array.isArray(body.teamIds)) {
      const ids = body.teamIds.map(Number).filter(Number.isInteger)
      await client.query('DELETE FROM team_memberships WHERE user_id = $1', [userId])
      for (const teamId of ids) {
        await client.query(
          `INSERT INTO team_memberships (team_id, user_id) SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM teams WHERE id = $1)
           ON CONFLICT DO NOTHING`, [teamId, userId])
      }
    }
    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[team/people PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}

/**
 * DELETE /api/team/people/[userId] — убрать с платформы (аккаунт остаётся).
 */
export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['teamlead'])
  if (!guard.ok) return guard.response
  const userId = parseInt((await params).userId)

  if (userId === guard.payload.id) {
    return NextResponse.json({ error: 'Нельзя убрать самого себя' }, { status: 400 })
  }
  try {
    const u = await pool.query('SELECT email FROM users WHERE id = $1', [userId])
    if (u.rows[0] && isTeamleadEmail(u.rows[0].email)) {
      return NextResponse.json({ error: 'Этот тимлид задан в настройках сервера (TEAMLEAD_EMAILS)' }, { status: 400 })
    }
    await pool.query('DELETE FROM team_memberships WHERE user_id = $1', [userId])
    await pool.query('DELETE FROM team_members WHERE user_id = $1', [userId])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/people DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
