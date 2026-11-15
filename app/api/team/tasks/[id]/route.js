import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { TASK_SELECT, REPORT_SELECT, canWorkOnTask, canAssign, canDecideTask } from '../../../../../lib/teamQueries'
import { TASK_STATUS_KEYS, LEAD_STATUS_KEYS, isClosed } from '../../../../../lib/team'
import { notify } from '../../../../../lib/notify'

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
    const can_decide = canDecideTask(task.rows[0], guard.payload)
    return NextResponse.json({ ...task.rows[0], can_work, can_decide, reports: reports.rows })
  } catch (err) {
    console.error('[team/tasks/id]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * PATCH /api/team/tasks/[id]
 * Исполнитель двигает статус: «К выполнению» → «В работе» → «На проверке».
 * Решение — «Готово», «Не одобрено» (нужна причина), «Не выполнено» — принимает тимлид или библиотекарь,
 * но не по своей собственной задаче.
 * Тимлид меняет и поля задачи; scope: 'batch' — сразу у всех исполнителей этой задачи.
 * Body: { status?, note?, scope?, title?, description?, teamId?, assigneeId?, priority?, dueDate? }
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
    let decision = null

    if (body.status !== undefined && body.status !== task.status) {
      const status = body.status
      if (!TASK_STATUS_KEYS.includes(status)) return NextResponse.json({ error: 'Неизвестный статус' }, { status: 400 })

      if (LEAD_STATUS_KEYS.includes(status)) {
        if (!canDecideTask(task, me)) {
          return NextResponse.json({
            error: isLead ? 'Свою задачу закрывает другой тимлид или библиотекарь' : 'Решение по задаче принимает тимлид'
          }, { status: 403 })
        }
        const note = String(body.note || '').trim().slice(0, 1000)
        if (status === 'rejected' && !note) {
          return NextResponse.json({ error: 'Напиши, что исправить — иначе исполнитель не поймёт' }, { status: 400 })
        }
        next.review_note = note || null
        next.decided_by = me.id
        next.decided_at = new Date()
        decision = status
      } else if (isClosed(task.status) && !isLead) {
        return NextResponse.json({ error: 'Задача уже закрыта' }, { status: 400 })
      }
      next.status = status
    }

    if (isLead) {
      if ('title' in body) {
        const t = String(body.title || '').trim().slice(0, 160)
        if (!t) return NextResponse.json({ error: 'Название не может быть пустым' }, { status: 400 })
        next.title = t
      }
      if ('description' in body) next.description = String(body.description || '').trim().slice(0, 4000) || null
      if ('teamId' in body) next.team_id = parseInt(body.teamId) || null
      if ('assigneeId' in body && body.scope !== 'batch') next.assignee_id = parseInt(body.assigneeId) || null
      if (['low', 'normal', 'high'].includes(body.priority)) next.priority = body.priority
      if ('dueDate' in body) next.due_date = /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate || '') ? body.dueDate : null
      if (!next.team_id && !next.assignee_id) {
        return NextResponse.json({ error: 'Нужна команда или исполнитель' }, { status: 400 })
      }
    }

    await pool.query(
      `UPDATE team_tasks
          SET title = $1, description = $2, team_id = $3, assignee_id = $4, priority = $5,
              due_date = $6, status = $7, review_note = $8, decided_by = $9, decided_at = $10, updated_at = NOW(),
              done_at = CASE WHEN $7 = 'done' THEN COALESCE(done_at, NOW()) ELSE NULL END
        WHERE id = $11`,
      [next.title, next.description, next.team_id, next.assignee_id, next.priority, next.due_date,
       next.status, next.review_note, next.decided_by, next.decided_at, id]
    )

    // Общие поля — сразу у всех исполнителей этой задачи
    if (isLead && body.scope === 'batch' && task.batch_id) {
      await pool.query(
        `UPDATE team_tasks SET title = $1, description = $2, team_id = $3, priority = $4, due_date = $5, updated_at = NOW()
          WHERE batch_id = $6`,
        [next.title, next.description, next.team_id, next.priority, next.due_date, task.batch_id]
      )
    }

    if (decision && next.assignee_id && Number(next.assignee_id) !== Number(me.id)) {
      const titles = { done: 'Задача принята', rejected: 'Задача не одобрена', failed: 'Задача не выполнена' }
      await notify(pool, next.assignee_id, {
        kind: 'task',
        title: `${titles[decision]}: ${next.title}`,
        body: next.review_note || (decision === 'rejected' ? 'Исправь и отправь на проверку ещё раз' : null),
        link: `/team/tasks?task=${id}`
      })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/tasks PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/** DELETE /api/team/tasks/[id] — тимлид или библиотекарь. ?batch=1 — у всех исполнителей. */
export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['tasker'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  const batch = new URL(req.url).searchParams.get('batch') === '1'
  try {
    if (batch) {
      await pool.query(
        `DELETE FROM team_tasks WHERE id = $1
            OR batch_id = (SELECT batch_id FROM team_tasks WHERE id = $1 AND batch_id IS NOT NULL)`, [id])
    } else {
      await pool.query('DELETE FROM team_tasks WHERE id = $1', [id])
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/tasks DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
