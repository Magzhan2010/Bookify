/**
 * Автоматическое доначисление монет за объём книги.
 * Отзыв можно одобрить, даже если у книги ещё нет числа страниц — ученик сразу получает +5.
 * Как только у книги появляются страницы (таблица, карточка книги, «Страницы списком»),
 * монеты за объём приходят сами — без кнопки «Начислить».
 */
import { tierForBook } from './points'
import { notify } from './notify'

/**
 * @param db   pool или client (внутри транзакции)
 * @param opts { bookIds?: number[] } — только эти книги; без них — все
 * @returns сколько начислений сделано
 */
export async function autoTopupVolume(db, opts = {}) {
  const ids = (opts.bookIds || []).map(Number).filter(Boolean)
  const r = await db.query(
    `SELECT r.borrow_id, r.user_id, r.book_id, b.title, b.pages, b.page_coef
       FROM book_reviews r
       JOIN books b ON b.id = r.book_id
      WHERE r.status = 'approved'
        AND COALESCE(b.pages, 0) > 0
        ${ids.length ? 'AND r.book_id = ANY($1::int[])' : ''}
        AND NOT EXISTS (SELECT 1 FROM user_points p
                         WHERE p.user_id = r.user_id AND p.book_id = r.book_id AND p.reason LIKE 'pages%')`,
    ids.length ? [ids] : []
  )
  let n = 0
  for (const row of r.rows) {
    const tier = tierForBook(row.pages, row.page_coef)
    if (!tier) continue
    // Вставляем, только если за эту книгу у ученика ещё нет монет за объём (защита от гонок)
    const ins = await db.query(
      `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id)
       SELECT $1, $2, $3, $4, $5, $6
        WHERE NOT EXISTS (SELECT 1 FROM user_points WHERE user_id = $1 AND book_id = $6 AND reason LIKE 'pages%')
       RETURNING id`,
      [row.user_id, tier.points, tier.code, `Прочитал книгу: ${tier.label}`, row.borrow_id, row.book_id]
    )
    if (!ins.rows[0]) continue
    n++
    await notify(db, row.user_id, {
      kind: 'bonus',
      title: `+${tier.points} монет за книгу`,
      body: `«${row.title}» — ${tier.label}`,
      link: '/profile'
    }).catch(() => {})
  }
  return n
}
