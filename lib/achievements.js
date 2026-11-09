/**
 * Достижения и серия чтения. Считаются по истории после старта программы.
 * Новые достижения сохраняются в user_achievements и приходят уведомлением.
 */
import { getGameStart } from './game'
import { notify } from './notify'

export const ACHIEVEMENTS = [
  { code: 'first_book', icon: '📗', title: 'Первая книга', hint: 'Прочитай и сдай первую книгу', target: 1, metric: 'books' },
  { code: 'three_month', icon: '🔥', title: '3 книги за месяц', hint: 'Сдай 3 книги за один месяц', target: 3, metric: 'best_month' },
  { code: 'big_book', icon: '🏔️', title: 'Книга-гигант', hint: 'Прочитай книгу на 500+ страниц', target: 1, metric: 'big_books' },
  { code: 'reviewer_5', icon: '✍️', title: 'Критик', hint: '5 одобренных отзывов', target: 5, metric: 'reviews' },
  { code: 'books_10', icon: '📚', title: 'Книжный марафон', hint: 'Прочитай 10 книг', target: 10, metric: 'books' },
  { code: 'streak_4', icon: '⚡', title: 'Серия 4 недели', hint: 'Читай 4 недели подряд', target: 4, metric: 'best_streak' },
  { code: 'speaker', icon: '🎤', title: 'Спикер', hint: 'Выступи на TEDx', target: 1, metric: 'tedx' },
  { code: 'creator', icon: '🎬', title: 'Блогер', hint: 'Сними видео о книге', target: 1, metric: 'videos' },
  { code: 'first_prize', icon: '🎁', title: 'Первый приз', hint: 'Обменяй монеты на приз', target: 1, metric: 'prizes' }
]

const WEEK = 7 * 86400000
const weekIndex = d => Math.floor((new Date(d).getTime() + 3 * 86400000) / WEEK) // недели с понедельника

/** Серия: сколько недель подряд (до текущей или прошлой) была активность. */
function streaks(dates) {
  const weeks = [...new Set(dates.map(weekIndex))].sort((a, b) => a - b)
  let best = 0, run = 0, prev = null
  for (const w of weeks) {
    run = prev !== null && w === prev + 1 ? run + 1 : 1
    best = Math.max(best, run); prev = w
  }
  const now = weekIndex(Date.now())
  const current = prev !== null && (prev === now || prev === now - 1) ? run : 0
  return { best, current }
}

export async function computeStats(db, userId) {
  const start = (await getGameStart(db)) || '-infinity'
  const [books, reviews, pts, prizes] = await Promise.all([
    db.query(
      `SELECT b.returned_at, COALESCE(bk.pages, 0) AS pages
         FROM borrows b JOIN books bk ON bk.id = b.book_id
        WHERE b.user_id = $1 AND b.status <> 'active' AND b.returned_at >= $2::timestamptz`, [userId, start]),
    db.query(
      `SELECT created_at, status FROM book_reviews WHERE user_id = $1 AND created_at >= $2::timestamptz`, [userId, start]),
    db.query(
      `SELECT COUNT(*) FILTER (WHERE reason = 'tedx')::int AS tedx, COUNT(*) FILTER (WHERE reason = 'video')::int AS videos
         FROM user_points WHERE user_id = $1`, [userId]),
    db.query(`SELECT COUNT(*)::int AS n FROM prize_orders WHERE user_id = $1 AND status <> 'cancelled'`, [userId])
  ])
  const months = {}
  for (const b of books.rows) {
    const k = new Date(b.returned_at).toISOString().slice(0, 7)
    months[k] = (months[k] || 0) + 1
  }
  const s = streaks([...books.rows.map(b => b.returned_at), ...reviews.rows.map(r => r.created_at)])
  return {
    books: books.rows.length,
    big_books: books.rows.filter(b => b.pages >= 500).length,
    best_month: Math.max(0, ...Object.values(months)),
    reviews: reviews.rows.filter(r => r.status === 'approved').length,
    tedx: pts.rows[0].tedx,
    videos: pts.rows[0].videos,
    prizes: prizes.rows[0].n,
    best_streak: s.best,
    current_streak: s.current
  }
}

/** Возвращает список достижений с прогрессом; новые сохраняет и присылает уведомлением. */
export async function syncAchievements(db, userId) {
  const stats = await computeStats(db, userId)
  const have = await db.query('SELECT code, earned_at FROM user_achievements WHERE user_id = $1', [userId])
  const got = new Map(have.rows.map(r => [r.code, r.earned_at]))
  const list = []
  for (const a of ACHIEVEMENTS) {
    const value = stats[a.metric] || 0
    let earnedAt = got.get(a.code) || null
    if (!earnedAt && value >= a.target) {
      const ins = await db.query(
        `INSERT INTO user_achievements (user_id, code) VALUES ($1, $2)
         ON CONFLICT DO NOTHING RETURNING earned_at`, [userId, a.code])
      if (ins.rows[0]) {
        earnedAt = ins.rows[0].earned_at
        await notify(db, userId, {
          kind: 'achievement', title: `Новое достижение: ${a.icon} ${a.title}`, body: a.hint, link: '/profile', dedupeKey: `ach-${a.code}`
        })
      }
    }
    list.push({ ...a, value: Math.min(value, a.target), earned: !!earnedAt, earned_at: earnedAt })
  }
  return { stats, achievements: list }
}
