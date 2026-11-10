import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { notifyMany, fmtDate } from '../../../../lib/notify'
import { TASK_SELECT } from '../../../../lib/teamQueries'


/**
 * GET /api/team/tasks?team=&assignee=me|id&status=
 * Задачи видят все участники платформы.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response

  const sp = new URL(req.url).searchParams
  const where = []
  const params = []
  const team = parseInt(sp.get('team'))
  if (team) { params.push(team); where.push(`x.team_id = $${params.length}`) }
  const assignee = sp.get('assignee')
  if (assignee) {
    params.push(assignee === 'me' ? guard.payload.id : parseInt(assignee) || 0)
    where.push(`(x.assignee_id = $${params.length} OR (x.assignee_id IS NULL AND x.team_id IN
                 (SELECT team_id FROM team_memberships WHERE user_id = $${params.length})))`)
  }
  const status = sp.get('status')
  if (['todo', 'in_progress', 'review', 'done'].includes(status)) {
    params.push(status); where.push(`x.status = $${params.length}`)
  }

  try {
    const res = await pool.query(
      `${TASK_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY CASE x.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
                x.due_date ASC NULLS LAST, x.created_at DESC
       LIMIT 500`,
      params
    )
    return NextResponse.json(res.rows)
  } catch (err) {
    console.error('[team/tasks]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * POST /api/team/tasks — тимлид ставит задачу.
 * Body: { title, description?, teamId?, assigneeId? | assigneeIds?: number[], priority?, dueDate? }
 * Несколько исполнителей — каждый получает свою копию задачи (свой статус и отчёты).
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['tasker'])
  if (!guard.ok) return guard.response

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const title = String(body?.title || '').trim().slice(0, 160)
  if (!title) return NextResponse.json({ error: 'Напиши, что нужно сделать' }, { status: 400 })
  const description = String(body?.description || '').trim().slice(0, 4000) || null
  const teamId = parseInt(body?.teamId) || null
  const ids = [...new Set(
    (Array.isArray(body?.assigneeIds) ? body.assigneeIds : [body?.assigneeId])
      .map(x => parseInt(x)).filter(Boolean)
  )].slice(0, 30)
  const priority = ['low', 'normal', 'high'].includes(body?.priority) ? body.priority : 'normal'
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(body?.dueDate || '') ? body.dueDate : null

  if (!teamId && !ids.length) {
    return NextResponse.json({ error: 'Выбери команду или исполнителя' }, { status: 400 })
  }

  try {
    if (ids.length) {
      const ok = await pool.query('SELECT COUNT(*)::int AS n FROM team_members WHERE user_id = ANY($1::int[])', [ids])
      if (ok.rows[0].n !== ids.length) return NextResponse.json({ error: 'Исполнитель не участник платформы' }, { status: 400 })
    }
    const created = []
    for (const assigneeId of (ids.length ? ids : [null])) {
      const res = await pool.query(
        `INSERT INTO team_tasks (title, description, team_id, assignee_id, priority, due_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [title, description, teamId, assigneeId, priority, dueDate, guard.payload.id]
      )
      created.push(res.rows[0].id)
    }
    // Уведомляем исполнителей (или всю команду, если исполнитель не выбран)
    let to = ids
    if (!ids.length && teamId) {
      const m = await pool.query('SELECT user_id FROM team_memberships WHERE team_id = $1', [teamId])
      to = m.rows.map(r => r.user_id)
    }
    await notifyMany(pool, to.filter(u => u !== guard.payload.id), {
      kind: 'task', title: `Новая задача: ${title}`,
      body: dueDate ? `Срок: ${fmtDate(dueDate)}` : null, link: '/team/tasks'
    })
    return NextResponse.json({ success: true, id: created[0], ids: created })
  } catch (err) {
    console.error('[team/tasks POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
