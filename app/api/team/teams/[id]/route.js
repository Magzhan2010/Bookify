import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { TEAM_COLORS } from '../../../../../lib/team'

/**
 * PATCH /api/team/teams/[id] — Body: { name?, description?, color?, memberIds? }
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['teamlead'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const cur = await client.query('SELECT * FROM teams WHERE id = $1 FOR UPDATE', [id])
    const team = cur.rows[0]
    if (!team) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }
    const name = 'name' in body ? String(body.name || '').trim().slice(0, 60) : team.name
    if (!name) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Назови команду' }, { status: 400 })
    }
    const description = 'description' in body ? (String(body.description || '').trim().slice(0, 300) || null) : team.description
    const color = TEAM_COLORS.includes(body.color) ? body.color : team.color
    await client.query('UPDATE teams SET name = $1, description = $2, color = $3 WHERE id = $4', [name, description, color, id])

    if (Array.isArray(body.memberIds)) {
      const ids = body.memberIds.map(Number).filter(Number.isInteger)
      await client.query('DELETE FROM team_memberships WHERE team_id = $1', [id])
      for (const uid of ids) {
        await client.query(
          `INSERT INTO team_memberships (team_id, user_id)
           SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM team_members WHERE user_id = $2)
           ON CONFLICT DO NOTHING`, [id, uid])
      }
    }
    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[team/teams PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}

/** DELETE /api/team/teams/[id] — задачи команды остаются, но без команды. */
export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['teamlead'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  try {
    await pool.query('DELETE FROM teams WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/teams DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
