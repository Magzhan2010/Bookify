/**
 * «Вызов другу»: два ученика стартуют одновременно (когда соперник принял вызов),
 * кто быстрее прочитает — тот победил.
 *
 * Честность при разных книгах:
 *  - книга вызова задаёт объём (засчитанные страницы = страниц × коэффициент);
 *  - каждый читает её же или любую книгу похожего объёма: от 75% до 125% страниц;
 *  - засчитывается только книга, выданная ПОСЛЕ старта (когда соперник принял вызов) —
 *    так никто не начнёт читать раньше другого;
 *  - побеждает тот, у кого выше скорость — засчитанных страниц в день от старта
 *    до отправки отзыва (отзыв должен быть одобрен). Если книга одна и та же —
 *    это ровно «кто первым дочитал».
 *  - Победа определяется сразу, как только второй уже не сможет догнать.
 *  - На вызов 30 дней; приглашение ждёт ответа 3 дня.
 */
import { notify } from './notify'

export const CHALLENGE_DAYS = 30
export const INVITE_DAYS = 3
export const MIN_SHARE = 0.75
export const MAX_SHARE = 1.25
export const MAX_OPEN = 3
export const MIN_PAGES = 100

const DAY = 86400000

/** Привязываем к участнику книгу: выданную после старта, подходящего объёма. */
async function linkBorrow(db, c, userId) {
  const r = await db.query(
    `SELECT br.id
       FROM borrows br JOIN books b ON b.id = br.book_id
      WHERE br.user_id = $1
        AND br.borrowed_at >= $2
        AND NOT COALESCE(br.own_book, FALSE)
        AND br.status <> 'cancelled'
        AND ROUND(COALESCE(b.pages, 0) * COALESCE(b.page_coef, 1)) BETWEEN $3 AND $4
      ORDER BY (br.book_id = $5) DESC, br.borrowed_at ASC
      LIMIT 1`,
    [userId, c.accepted_at, Math.floor(c.target_pages * MIN_SHARE), Math.ceil(c.target_pages * MAX_SHARE), c.book_id]
  )
  return r.rows[0]?.id || null
}

/** Состояние одной стороны: книга, страницы, когда дочитал. */
async function sideState(db, borrowId) {
  if (!borrowId) return { linked: false }
  const r = await db.query(
    `SELECT br.id, br.status, br.borrowed_at, b.id AS book_id, b.title, b.author, b.cover_url,
            ROUND(COALESCE(b.pages, 0) * COALESCE(b.page_coef, 1))::int AS pages,
            rv.status AS review_status, rv.created_at AS review_at
       FROM borrows br JOIN books b ON b.id = br.book_id
       LEFT JOIN book_reviews rv ON rv.borrow_id = br.id
      WHERE br.id = $1`,
    [borrowId]
  )
  const x = r.rows[0]
  if (!x || x.status === 'cancelled') return { linked: false }
  const finished = x.status === 'approved' && x.review_status === 'approved' && x.review_at
  return {
    linked: true,
    borrow_id: x.id,
    book_id: x.book_id,
    title: x.title,
    author: x.author,
    cover_url: x.cover_url,
    pages: x.pages,
    stage: finished ? 'done' : x.status === 'reviewed' ? 'review' : x.status === 'returned' ? 'returned' : 'reading',
    finished_at: finished ? new Date(x.review_at).toISOString() : null
  }
}

const speedOf = (pages, from, to) => pages / Math.max(1 / 24, (new Date(to) - new Date(from)) / DAY)

/**
 * Пересчитать открытые вызовы (pending/active) — для списка id.
 * Возвращает ничего; меняет статусы в базе и шлёт уведомления.
 */
export async function resolveChallenges(db, ids) {
  if (!ids?.length) return
  const res = await db.query(
    `SELECT * FROM challenges WHERE id = ANY($1::int[]) AND status IN ('pending', 'active')`, [ids])
  const now = new Date()

  for (const c of res.rows) {
    // Приглашение без ответа
    if (c.status === 'pending') {
      if (now - new Date(c.created_at) > INVITE_DAYS * DAY) {
        await db.query(`UPDATE challenges SET status = 'expired', finished_at = NOW() WHERE id = $1 AND status = 'pending'`, [c.id])
      }
      continue
    }

    // Привязываем книги, если ещё нет
    let cb = c.challenger_borrow_id, ob = c.opponent_borrow_id
    if (!cb) cb = await linkBorrow(db, c, c.challenger_id)
    if (!ob) ob = await linkBorrow(db, c, c.opponent_id)
    if (cb !== c.challenger_borrow_id || ob !== c.opponent_borrow_id) {
      await db.query(`UPDATE challenges SET challenger_borrow_id = $2, opponent_borrow_id = $3 WHERE id = $1`, [c.id, cb, ob])
    }

    const A = await sideState(db, cb)
    const B = await sideState(db, ob)
    const start = c.accepted_at
    const best = s => (s.linked ? s.pages : Math.ceil(c.target_pages * MAX_SHARE))
    const sp = s => (s.finished_at ? speedOf(s.pages, start, s.finished_at) : null)
    const sa = sp(A), sb = sp(B)
    const late = now > new Date(c.deadline_at)

    let winner = null
    let done = false
    if (sa !== null && sb !== null) {
      done = true
      winner = sa > sb || (sa === sb && new Date(A.finished_at) <= new Date(B.finished_at)) ? c.challenger_id : c.opponent_id
    } else if (sa !== null) {
      // Сможет ли второй догнать, если дочитает прямо сейчас?
      if (late || speedOf(best(B), start, now) < sa) { done = true; winner = c.challenger_id }
    } else if (sb !== null) {
      if (late || speedOf(best(A), start, now) < sb) { done = true; winner = c.opponent_id }
    } else if (late) {
      done = true
    }

    if (!done) continue
    const result = {
      challenger: { pages: A.pages || null, finished_at: A.finished_at || null, speed: sa && Math.round(sa * 10) / 10 },
      opponent: { pages: B.pages || null, finished_at: B.finished_at || null, speed: sb && Math.round(sb * 10) / 10 }
    }
    const upd = await db.query(
      `UPDATE challenges SET status = $2, winner_id = $3, result = $4, finished_at = NOW()
        WHERE id = $1 AND status = 'active' RETURNING id`,
      [c.id, winner ? 'finished' : 'expired', winner, JSON.stringify(result)]
    )
    if (!upd.rows[0]) continue

    const names = await db.query('SELECT id, name FROM users WHERE id = ANY($1::int[])', [[c.challenger_id, c.opponent_id]])
    const nameOf = id => names.rows.find(r => r.id === id)?.name || 'Соперник'
    for (const uid of [c.challenger_id, c.opponent_id]) {
      const other = uid === c.challenger_id ? c.opponent_id : c.challenger_id
      await notify(db, uid, {
        kind: 'challenge',
        title: !winner ? 'Вызов закончился без победителя'
          : winner === uid ? `Ты выиграл вызов против ${nameOf(other)}!` : `${nameOf(other)} выиграл вызов`,
        body: !winner ? 'За 30 дней никто не дочитал книгу' : null,
        link: '/profile#challenges',
        dedupeKey: `challenge-${c.id}-done`
      })
    }
  }
}

/** Открытые вызовы пользователя — пересчитать. */
export async function resolveForUser(db, userId) {
  const r = await db.query(
    `SELECT id FROM challenges WHERE (challenger_id = $1 OR opponent_id = $1) AND status IN ('pending', 'active')`, [userId])
  await resolveChallenges(db, r.rows.map(x => x.id))
}

export { sideState }
