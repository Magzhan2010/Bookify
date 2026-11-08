/**
 * Командная платформа: общие константы (используются и на сервере, и в интерфейсе).
 */

export const TASK_STATUSES = [
  { key: 'todo', label: 'К выполнению' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'review', label: 'На проверке' },
  { key: 'done', label: 'Готово' }
]

export const TASK_PRIORITIES = [
  { key: 'high', label: 'Высокий', color: '#e5484d' },
  { key: 'normal', label: 'Обычный', color: '#8e8e93' },
  { key: 'low', label: 'Низкий', color: '#30a46c' }
]

export const TEAM_COLORS = ['#2f5bea', '#e5484d', '#30a46c', '#f5a524', '#8e4ec6', '#0ea5e9', '#e0457b', '#1d1d1f']

export const statusLabel = key => TASK_STATUSES.find(s => s.key === key)?.label || key
