/**
 * Командная платформа: общие константы (используются и на сервере, и в интерфейсе).
 */

/**
 * Статусы задачи.
 * lead — ставит только тимлид или библиотекарь (решение по задаче).
 * closed — задача закрыта (больше не в работе).
 */
export const TASK_STATUSES = [
  { key: 'todo', label: 'К выполнению', color: '#8e8e93' },
  { key: 'in_progress', label: 'В работе', color: '#2f6fed' },
  { key: 'review', label: 'На проверке', color: '#8b5cf6' },
  { key: 'rejected', label: 'Не одобрено', color: '#f26b1d', lead: true },
  { key: 'done', label: 'Готово', color: '#22a55b', lead: true, closed: true },
  { key: 'failed', label: 'Не выполнено', color: '#e5484d', lead: true, closed: true }
]

export const TASK_STATUS_KEYS = TASK_STATUSES.map(s => s.key)
/** Статусы, которые может ставить сам исполнитель */
export const MEMBER_STATUS_KEYS = TASK_STATUSES.filter(s => !s.lead).map(s => s.key)
/** Решения тимлида */
export const LEAD_STATUS_KEYS = TASK_STATUSES.filter(s => s.lead).map(s => s.key)
/** Закрытые задачи (в SQL: status IN ('done','failed')) */
export const CLOSED_STATUS_KEYS = TASK_STATUSES.filter(s => s.closed).map(s => s.key)

export const TASK_PRIORITIES = [
  { key: 'high', label: 'Высокий', color: '#e5484d' },
  { key: 'normal', label: 'Обычный', color: '#8e8e93' },
  { key: 'low', label: 'Низкий', color: '#30a46c' }
]

export const TEAM_COLORS = ['#2f5bea', '#e5484d', '#30a46c', '#f5a524', '#8e4ec6', '#0ea5e9', '#e0457b', '#1d1d1f']

export const statusInfo = key => TASK_STATUSES.find(s => s.key === key) || { key, label: key, color: '#8e8e93' }
export const statusLabel = key => statusInfo(key).label
export const isClosed = key => CLOSED_STATUS_KEYS.includes(key)
