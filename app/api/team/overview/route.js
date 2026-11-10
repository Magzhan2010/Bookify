import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { TASK_SELECT, REPORT_SELECT } from '../../../../lib/teamQueries'
import { getGameStart } from '../../../../lib/game'

/**
 * GET /api/team/overview — главная платформы: мои задачи, свежие отчёты,
 * прогресс команд и короткая сводка по ученикам.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response
  const me = guard.payload.id

  try {
    const start = (await getGameStart(pool)) || '-infinity'
    const [counts, mine, reports, teams, students, weekly] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) FILTER (WHERE status = 'todo')::int AS todo,
               COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
               COUNT(*) FILTER (WHERE status = 'review')::int AS review,
               COUNT(*) FILTER (WHERE status = 'done')::int AS done,
               COUNT(*) FILTER (WHERE status <> 'done' AND due_date < CURRENT_DATE)::int AS overdue
          FROM team_tasks`),
      pool.query(`${TASK_SELECT}
        WHERE x.status <> 'done' AND (x.assignee_id = $1 OR (x.assignee_id IS NULL AND x.team_id IN
              (SELECT team_id FROM team_memberships WHERE user_id = $1)))
        ORDER BY x.due_date ASC NULLS LAST, x.created_at DESC LIMIT 8`, [me]),
      pool.query(`${REPORT_SELECT} ORDER BY r.created_at DESC LIMIT 6`),
      pool.query(`
        SELECT t.id, t.name, t.color,
               (SELECT COUNT(*) FROM team_memberships m WHERE m.team_id = t.id)::int AS members,
               (SELECT COUNT(*) FROM team_tasks x WHERE x.team_id = t.id)::int AS total,
               (SELECT COUNT(*) FROM team_tasks x WHERE x.team_id = t.id AND x.status = 'done')::int AS done
          FROM teams t ORDER BY t.created_at`),
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users u WHERE role = 'student'
              AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id))::int AS students,
          (SELECT COUNT(*) FROM book_reviews WHERE status = 'pending')::int AS reviews_pending,
          (SELECT COUNT(*) FROM borrows br WHERE br.status NOT IN ('active', 'cancelled')
              AND br.returned_at >= $1::timestamptz
              AND NOT EXISTS (SELECT 1 FROM book_reviews r WHERE r.borrow_id = br.id))::int AS reviews_missing,
          (SELECT COUNT(*) FROM borrows WHERE status = 'active' AND due_date < NOW())::int AS overdue_loans,
          (SELECT COUNT(*) FROM user_points WHERE reason = 'tedx')::int AS tedx,
          (SELECT COUNT(*) FROM user_points WHERE reason = 'video')::int AS videos`, [start]),
      pool.query(`
        SELECT to_char(d, 'YYYY-MM-DD') AS day,
               (SELECT COUNT(*) FROM task_reports r WHERE r.created_at::date = d)::int AS reports,
               (SELECT COUNT(*) FROM team_tasks x WHERE x.done_at::date = d)::int AS done
          FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day') AS d`)
    ])

    return NextResponse.json({
      tasks: counts.rows[0],
      my_tasks: mine.rows,
      recent_reports: reports.rows,
      teams: teams.rows,
      students: students.rows[0],
      activity: weekly.rows
    })
  } catch (err) {
    console.error('[team/overview]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
