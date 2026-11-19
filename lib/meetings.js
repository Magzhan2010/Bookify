/**
 * Собрания: кому отправить и как красиво написать время.
 * Время показываем по Алматы — школа там.
 */

const TZ = 'Asia/Almaty'

const dayKey = d => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ })

/** «сегодня в 15:00», «завтра в 9:30», «21 ноября в 15:00». */
export function fmtWhen(value) {
  const d = new Date(value)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  const today = dayKey(Date.now())
  const tomorrow = dayKey(Date.now() + 86400000)
  const key = dayKey(d)
  if (key === today) return `сегодня в ${time}`
  if (key === tomorrow) return `завтра в ${time}`
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: TZ })} в ${time}`
}

export const AUDIENCES = [
  { value: 'team', label: 'Вся команда' },
  { value: 'subteam', label: 'Одна группа' },
  { value: 'students', label: 'Ученики' },
  { value: 'teachers', label: 'Учителя' },
  { value: 'all', label: 'Все' }
]

/**
 * Кому уходит приглашение. Возвращает { ids, label } или { error }.
 * audience: { type, team_id?, class_name? }
 */
export async function resolveAudience(db, audience = {}) {
  const type = audience.type
  let q, params = [], label
  if (type === 'team') {
    q = 'SELECT user_id AS id FROM team_members'
    label = 'Вся команда'
  } else if (type === 'subteam') {
    const t = await db.query('SELECT id, name FROM teams WHERE id = $1', [Number(audience.team_id) || 0])
    if (!t.rows[0]) return { error: 'Выбери группу' }
    q = 'SELECT user_id AS id FROM team_memberships WHERE team_id = $1'
    params = [t.rows[0].id]
    label = `Группа «${t.rows[0].name}»`
  } else if (type === 'students') {
    const cls = String(audience.class_name || '').trim()
    if (cls) {
      q = `SELECT id FROM users WHERE role = 'student' AND class_name = $1`
      params = [cls]
      label = `Ученики ${cls}`
    } else {
      q = `SELECT id FROM users WHERE role = 'student'`
      label = 'Все ученики'
    }
  } else if (type === 'teachers') {
    q = `SELECT id FROM users WHERE role = 'teacher'`
    label = 'Учителя'
  } else if (type === 'all') {
    q = `SELECT id FROM users WHERE role IN ('student', 'teacher', 'librarian')
         UNION SELECT user_id FROM team_members`
    label = 'Все'
  } else {
    return { error: 'Выбери, кого позвать' }
  }
  const res = await db.query(q, params)
  return { ids: [...new Set(res.rows.map(r => r.id))], label }
}

/** Одно уведомление многим людям одним запросом. Участникам команды — ссылка на «Собрания». */
export async function notifyMeeting(db, ids, { kind, title, body, dedupe }) {
  if (!ids.length) return
  try {
    await db.query(
      `INSERT INTO notifications (user_id, kind, title, body, link, dedupe_key)
       SELECT u.id, $2, $3, $4,
              CASE WHEN tm.user_id IS NOT NULL THEN '/team/meetings' END,
              $5::text || u.id
         FROM unnest($1::int[]) AS u(id)
         LEFT JOIN team_members tm ON tm.user_id = u.id
       ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
      [ids, kind, title.slice(0, 200), body ? body.slice(0, 500) : null, dedupe]
    )
  } catch (err) {
    console.error('[meetings notify]', err.message)
  }
}
