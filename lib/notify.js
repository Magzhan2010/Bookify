/**
 * Уведомления пользователю. Ошибка уведомления никогда не ломает основное действие.
 * notify(db, userId, { kind, title, body?, link?, dedupeKey? })
 *  kind: review_approved | review_rejected | prize_issued | prize_cancelled | book_issued |
 *        request_approved | due_soon | overdue | bonus | task | achievement | teacher | recommendation
 */
export async function notify(db, userId, n) {
  if (!userId || !n?.title) return
  try {
    await db.query(
      `INSERT INTO notifications (user_id, kind, title, body, link, dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
      [userId, n.kind || 'info', String(n.title).slice(0, 200), n.body ? String(n.body).slice(0, 500) : null, n.link || null, n.dedupeKey || null]
    )
  } catch (err) {
    console.error('[notify]', err.message)
  }
}

/** То же для многих получателей. */
export async function notifyMany(db, userIds, n) {
  for (const id of [...new Set(userIds)].filter(Boolean)) await notify(db, id, n)
}

export const fmtDate = d => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Asia/Almaty' })
