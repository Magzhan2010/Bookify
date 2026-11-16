/**
 * «Вызов другу»: кто первым дочитает книгу.
 *
 * В библиотеке каждая книга в одном экземпляре, поэтому у каждого своя книга,
 * но страниц должно быть почти одинаково:
 *  - автор вызова выбирает свою книгу — она задаёт объём (засчитанные страницы =
 *    страниц × коэффициент, как для монет);
 *  - соперник, принимая вызов, выбирает свою книгу с разницей не больше 10%;
 *  - старт у обоих одновременно — когда соперник принял вызов; засчитывается
 *    только выдача выбранной книги ПОСЛЕ старта;
 *  - финиш — отправленный отзыв, который потом одобрили. Побеждает тот, кто
 *    отправил одобренный отзыв первым. Если у второго отзыв, отправленный раньше,
 *    ещё на проверке — ждём решения;
 *  - на вызов 30 дней; приглашение ждёт ответа 3 дня.
 */
import { notify } from './notify'

export const CHALLENGE_DAYS = 30
export const INVITE_DAYS = 3
export const PAGES_DIFF = 0.1
export const MAX_OPEN = 3
export const MIN_PAGES = 100

const DAY = 86400000

export const pagesRange = target => [Math.floor(target * (1 - PAGES_DIFF)), Math.ceil(target * (1 + PAGES_DIFF))]

/** Выдача выбранной книги участнику после старта. */
async function linkBorrow(db, c, userId, bookId) {
  if (!bookId) return null
  const r = await db.query(
    `SELECT id FROM borrows
      WHERE user_id = $1 AND book_id = $2 AND borrowed_at >= $3
        AND NOT COALESCE(own_book, FALSE) AND status <> 'cancelled'
      ORDER BY borrowed_at ASC LIMIT 1`,
    [userId, bookId, c.accepted_at]
  )
  return r.rows[0]?.id || null
}

/** Состояние одной стороны: книга, этап, когда дочитал. */
export async function sideState(db, bookId, borrowId) {
  const out = { linked: false }
  if (bookId) {
    const b = await db.query(
      `SELECT id, title, author, cover_url, available_copies,
              ROUND(COALESCE(pages, 0) * COALESCE(page_coef, 1))::int AS pages
         FROM books WHERE id = $1`, [bookId])
    if (b.rows[0]) Object.assign(out, { book_id: b.rows[0].id, title: b.rows[0].title, author: b.rows[0].author,
      cover_url: b.rows[0].cover_url, pages: b.rows[0].pages, available: b.rows[0].available_copies })
  }
  if (!borrowId) return { ...out, stage: 'none' }
  const r = await db.query(
    `SELECT br.status, rv.status AS review_status, rv.created_at AS review_at
       FROM borrows br LEFT JOIN book_reviews rv ON rv.borrow_id = br.id
      WHERE br.id = $1`, [borrowId])
  const x = r.rows[0]
  if (!x || x.status === 'cancelled') return { ...out, stage: 'none' }
  const done = x.status === 'approved' && x.review_status === 'approved' && x.review_at
  return {
    ...out,
    linked: true,
    stage: done ? 'done' : x.status === 'reviewed' ? 'review' : x.status === 'returned' ? 'returned' : 'reading',
    finished_at: done ? new Date(x.review_at).toISOString() : null,
    // отзыв отправлен, но ещё не проверен — может оказаться первым
    pending_at: !done && x.status === 'reviewed' && x.review_status === 'pending' && x.review_at ? new Date(x.review_at).toISOString() : null
  }
}

const days = (from, to) => Math.round(((new Date(to) - new Date(from)) / DAY) * 10) / 10

/** Пересчитать открытые вызовы по списку id: статусы, победитель, уведомления. */
export async function resolveChallenges(db, ids) {
  if (!ids?.length) return
  const res = await db.query(
    `SELECT * FROM challenges WHERE id = ANY($1::int[]) AND status IN ('pending', 'active')`, [ids])
  const now = new Date()

  for (const c of res.rows) {
    if (c.status === 'pending') {
      if (now - new Date(c.created_at) > INVITE_DAYS * DAY) {
        await db.query(`UPDATE challenges SET status = 'expired', finished_at = NOW() WHERE id = $1 AND status = 'pending'`, [c.id])
      }
      continue
    }

    let cb = c.challenger_borrow_id, ob = c.opponent_borrow_id
    if (!cb) cb = await linkBorrow(db, c, c.challenger_id, c.book_id)
    if (!ob) ob = await linkBorrow(db, c, c.opponent_id, c.opponent_book_id)
    if (cb !== c.challenger_borrow_id || ob !== c.opponent_borrow_id) {
      await db.query(`UPDATE challenges SET challenger_borrow_id = $2, opponent_borrow_id = $3 WHERE id = $1`, [c.id, cb, ob])
    }

    const A = await sideState(db, c.book_id, cb)
    const B = await sideState(db, c.opponent_book_id, ob)
    const late = now > new Date(c.deadline_at)
    const before = (x, y) => x && (!y || new Date(x) <= new Date(y))

    let winner = null
    let done = false
    // Победитель — у кого одобренный отзыв отправлен раньше; чужой отзыв на проверке,
    // отправленный ещё раньше, заставляет подождать.
    const aWins = A.finished_at && before(A.finished_at, B.finished_at) && !before(B.pending_at, A.finished_at)
    const bWins = B.finished_at && before(B.finished_at, A.finished_at) && !before(A.pending_at, B.finished_at)
    if (aWins) { done = true; winner = c.challenger_id }
    else if (bWins) { done = true; winner = c.opponent_id }
    else if (late && !A.pending_at && !B.pending_at) { done = true }

    if (!done) continue
    const result = {
      challenger: { pages: A.pages || null, finished_at: A.finished_at || null, days: A.finished_at ? days(c.accepted_at, A.finished_at) : null },
      opponent: { pages: B.pages || null, finished_at: B.finished_at || null, days: B.finished_at ? days(c.accepted_at, B.finished_at) : null }
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
          : winner === uid ? `Ты выиграл вызов против ${nameOf(other)}!` : `${nameOf(other)} дочитал первым`,
        body: !winner ? 'За 30 дней никто не дочитал книгу' : null,
        link: '/profile#challenges',
        dedupeKey: `challenge-${c.id}-done`
      })
    }
  }
}

export async function resolveForUser(db, userId) {
  const r = await db.query(
    `SELECT id FROM challenges WHERE (challenger_id = $1 OR opponent_id = $1) AND status IN ('pending', 'active')`, [userId])
  await resolveChallenges(db, r.rows.map(x => x.id))
}
