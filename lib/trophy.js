/** Пометка книги «на полке без отзыва»: прочитана до Bookify или ученик просто хочет её на полке. */
export const TROPHY_NOTE = 'Трофей: прочитано до запуска Bookify'

/**
 * Ставит книгу на полку без отзыва и без монет.
 * Дата — до старта игры, поэтому в достижения, мониторинг и рейтинги она не попадает.
 */
export async function addShelfBook(db, { userId, bookId, byId, gameStart }) {
  const at = gameStart ? new Date(new Date(gameStart).getTime() - 86400000) : new Date()
  const r = await db.query(
    `INSERT INTO borrows (user_id, book_id, status, borrowed_at, due_date, returned_at, issued_by, notes)
     VALUES ($1, $2, 'approved', $3, $3, $3, $4, $5) RETURNING id`,
    [userId, bookId, at.toISOString(), byId, TROPHY_NOTE])
  return r.rows[0].id
}
