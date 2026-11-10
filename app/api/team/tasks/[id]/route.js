import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { TASK_SELECT, REPORT_SELECT, canWorkOnTask, canAssign } from '../../../../../lib/teamQueries'

/** GET /api/team/tasks/[id] — задача и все отчёты по ней. */
export async function GET(req, { params }) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)

  try {
    const [task, reports] = await Promise.all([
      pool.query(`${TASK_SELECT} WHERE x.id = $1`, [id]),
      pool.query(`${REPORT_SELECT} WHERE r.task_id = $1 ORDER BY r.created_at DESC`, [id])
    ])
    if (!task.rows[0]) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
    const can_work = await canWorkOnTask(pool, task.rows[0], guard.payload)
    return NextResponse.json({ ...task.rows[0], can_work, reports: reports.rows })
  } catch (err) {
    console.error('[team/tasks/id]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * PATCH /api/team/tasks/[id]
 * Тимлид меняет любые поля; исполнитель — только статус.
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  const me = guard.payload
  const isLead = canAssign(me)

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }

  try {
    const cur = await pool.query('SELECT * FROM team_tasks WHERE id = $1', [id])
    const task = cur.rows[0]
    if (!task) return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 })
    if (!(await canWorkOnTask(pool, task, me))) {
      return NextResponse.json({ error: 'Это не твоя задача' }, { status: 403 })
    }

    const next = { ...task }
    if (['todo', 'in_progress', 'review', 'done'].includes(body.status)) next.status = body.status

    if (isLead) {
      if ('title' in body) {
        const t = String(body.title || '').trim().slice(0, 160)
        if (!t) return NextResponse.json({ error: 'Название не может быть пустым' }, { status: 400 })
        next.title = t
      }
      if ('description' in body) next.description = String(body.description || '').trim().slice(0, 4000) || null
      if ('teamId' in body) next.team_id = parseInt(body.teamId) || null
      if ('assigneeId' in body) next.assignee_id = parseInt(body.assigneeId) || null
      if (['low', 'normal', 'high'].includes(body.priority)) next.priority = body.priority
      if ('dueDate' in body) next.due_date = /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate || '') ? body.dueDate : null
      if (!next.team_id && !next.assignee_id) {
        return NextResponse.json({ error: 'Нужна команда или исполнитель' }, { status: 400 })
      }
    }

    await pool.query(
      `UPDATE team_tasks
          SET title = $1, description = $2, team_id = $3, assignee_id = $4, priority = $5,
              due_date = $6, status = $7, updated_at = NOW(),
              done_at = CASE WHEN $7 = 'done' THEN COALESCE(done_at, NOW()) ELSE NULL END
        WHERE id = $8`,
      [next.title, next.description, next.team_id, next.assignee_id, next.priority, next.due_date, next.status, id]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/tasks PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/** DELETE /api/team/tasks/[id] — тимлид или библиотекарь. */
export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['tasker'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  try {
    await pool.query('DELETE FROM team_tasks WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/tasks DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
