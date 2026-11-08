import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { emailBaseFromName, generatePassword, pickFreeEmail } from '../../../../lib/students'

/**
 * GET /api/team/people — участники платформы со статистикой задач и отчётов.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response

  try {
    const res = await pool.query(`
      SELECT u.id, u.name, u.email, u.class_name, u.avatar_url,
             tm.platform_role, tm.title, tm.created_at AS joined_at,
             COALESCE((SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name)
                         FROM team_memberships m JOIN teams t ON t.id = m.team_id
                        WHERE m.user_id = u.id), '[]') AS teams,
             (SELECT COUNT(*) FROM team_tasks x WHERE x.assignee_id = u.id AND x.status <> 'done')::int AS open_tasks,
             (SELECT COUNT(*) FROM team_tasks x WHERE x.assignee_id = u.id AND x.status = 'done')::int AS done_tasks,
             (SELECT COUNT(*) FROM task_reports r WHERE r.user_id = u.id)::int AS reports,
             (SELECT MAX(r.created_at) FROM task_reports r WHERE r.user_id = u.id) AS last_report_at
        FROM team_members tm
        JOIN users u ON u.id = tm.user_id
       ORDER BY (tm.platform_role = 'lead') DESC, u.name ASC
    `)
    return NextResponse.json(res.rows)
  } catch (err) {
    console.error('[team/people]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * POST /api/team/people — тимлид добавляет участника.
 * Body: { userId, title?, teamIds? }              — существующий аккаунт
 *    или { name, email?, title?, teamIds? }       — новый аккаунт (пароль генерируется)
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['teamlead'])
  if (!guard.ok) return guard.response

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }

  const title = String(body?.title || '').trim().slice(0, 60) || null
  const teamIds = (Array.isArray(body?.teamIds) ? body.teamIds : []).map(Number).filter(Number.isInteger)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let userId = parseInt(body?.userId)
    let credentials = null

    if (!userId) {
      const name = String(body?.name || '').trim().replace(/\s+/g, ' ').slice(0, 120)
      if (!name) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Укажи имя или выбери аккаунт' }, { status: 400 })
      }
      let email = String(body?.email || '').trim().toLowerCase().slice(0, 200)
      if (email) {
        const exists = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [email])
        if (exists.rows[0]) userId = exists.rows[0].id
      } else {
        const base = emailBaseFromName(name) || 'member'
        const taken = await client.query('SELECT LOWER(email) AS e FROM users WHERE LOWER(email) LIKE $1', [`${base}%`])
        email = pickFreeEmail(base, new Set(taken.rows.map(r => r.e)))
      }
      if (!userId) {
        const password = generatePassword()
        const hash = await bcrypt.hash(password, 10)
        const created = await client.query(
          `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'student') RETURNING id`,
          [name, email, hash]
        )
        userId = created.rows[0].id
        credentials = { email, password }
      }
    } else {
      const u = await client.query('SELECT id FROM users WHERE id = $1', [userId])
      if (!u.rows[0]) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
      }
    }

    await client.query(
      `INSERT INTO team_members (user_id, platform_role, title, added_by)
       VALUES ($1, 'member', $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET title = COALESCE(EXCLUDED.title, team_members.title)`,
      [userId, title, guard.payload.id]
    )
    for (const teamId of teamIds) {
      await client.query(
        `INSERT INTO team_memberships (team_id, user_id) SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM teams WHERE id = $1)
         ON CONFLICT DO NOTHING`,
        [teamId, userId]
      )
    }
    await client.query('COMMIT')
    return NextResponse.json({ success: true, userId, credentials })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[team/people POST]', err)
    return NextResponse.json({ error: 'Не удалось добавить участника' }, { status: 500 })
  } finally {
    client.release()
  }
}
