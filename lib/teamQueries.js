/** SQL-фрагменты командной платформы (только сервер). */

export const TASK_SELECT = `
  SELECT x.id, x.title, x.description, x.status, x.priority, x.due_date,
         x.created_at, x.updated_at, x.done_at,
         x.team_id, t.name AS team_name, t.color AS team_color,
         x.assignee_id, a.name AS assignee_name, a.avatar_url AS assignee_avatar,
         x.created_by, c.name AS created_by_name,
         (SELECT COUNT(*) FROM task_reports r WHERE r.task_id = x.id)::int AS reports_count
    FROM team_tasks x
    LEFT JOIN teams t ON t.id = x.team_id
    LEFT JOIN users a ON a.id = x.assignee_id
    LEFT JOIN users c ON c.id = x.created_by
`

export const REPORT_SELECT = `
  SELECT r.id, r.did, r.result, r.link, r.created_at,
         r.user_id, u.name AS user_name, u.avatar_url AS user_avatar,
         r.task_id, x.title AS task_title, x.status AS task_status,
         t.name AS team_name, t.color AS team_color
    FROM task_reports r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN team_tasks x ON x.id = r.task_id
    LEFT JOIN teams t ON t.id = x.team_id
`

/**
 * Может ли пользователь двигать задачу: тимлид, исполнитель
 * или (если исполнителя нет) участник команды задачи.
 */
export async function canWorkOnTask(db, task, user) {
  if (user.platform_role === 'lead') return true
  if (task.assignee_id) return task.assignee_id === user.id
  if (!task.team_id) return false
  const r = await db.query('SELECT 1 FROM team_memberships WHERE team_id = $1 AND user_id = $2', [task.team_id, user.id])
  return !!r.rows[0]
}
