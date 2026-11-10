import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { REPORT_SELECT, canWorkOnTask, canAssign } from '../../../../lib/teamQueries'

/**
 * GET /api/team/reports?user=&team=&limit= — лента отчётов (видят все участники).
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response

  const sp = new URL(req.url).searchParams
  const where = []
  const params = []
  const user = parseInt(sp.get('user'))
  if (user) { params.push(user); where.push(`r.user_id = $${params.length}`) }
  const team = parseInt(sp.get('team'))
  if (team) { params.push(team); where.push(`x.team_id = $${params.length}`) }
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit')) || 100))

  try {
    const res = await pool.query(
      `${REPORT_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY r.created_at DESC LIMIT ${limit}`,
      params
    )
    return NextResponse.json(res.rows)
  } catch (err) {
    console.error('[team/reports]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * POST /api/team/reports — отчёт: что сделал и что получилось.
 * Body: { taskId?, did, result?, link?, status?: 'review'|'done' }
 * Если указан статус — задача двигается вместе с отчётом.
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response
  const me = guard.payload

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const did = String(body?.did || '').trim().slice(0, 4000)
  if (did.length < 3) return NextResponse.json({ error: 'Опиши, что сделано' }, { status: 400 })
  const result = String(body?.result || '').trim().slice(0, 4000) || null
  let link = String(body?.link || '').trim().slice(0, 500) || null
  if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link
  const taskId = parseInt(body?.taskId) || null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (taskId) {
      const t = await client.query('SELECT * FROM team_tasks WHERE id = $1 FOR UPDATE', [taskId])
      if (!t.rows[0]) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
      }
      if (!(await canWorkOnTask(client, t.rows[0], me))) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Отчёт можно писать только по своей задаче' }, { status: 403 })
      }
      const status = ['in_progress', 'review', 'done'].includes(body?.status) ? body.status : null
      // Участник может отправить на проверку; закрыть сам — только тимлид
      const allowed = status === 'done' && !canAssign(me) ? 'review' : status
      if (allowed) {
        await client.query(
          `UPDATE team_tasks SET status = $1, updated_at = NOW(),
                  done_at = CASE WHEN $1 = 'done' THEN COALESCE(done_at, NOW()) ELSE NULL END
            WHERE id = $2`, [allowed, taskId])
      }
    }
    const r = await client.query(
      `INSERT INTO task_reports (task_id, user_id, did, result, link) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [taskId, me.id, did, result, link]
    )
    await client.query('COMMIT')
    return NextResponse.json({ success: true, id: r.rows[0].id })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[team/reports POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
