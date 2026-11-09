/**
 * Серверные хелперы игры: баланс баллов, место в рейтинге.
 * Только для API-роутов (использует БД).
 */

/**
 * Баланс ученика.
 * earned    — всё, что заработано (user_points)
 * spent     — потрачено на призы (заказы в статусах pending и issued;
 *             отменённый заказ баллы возвращает)
 * available — можно потратить прямо сейчас
 *
 * db — pool или client внутри транзакции.
 */
export async function getBalance(db, userId) {
  const res = await db.query(
    `SELECT
       (SELECT COALESCE(SUM(points), 0) FROM user_points WHERE user_id = $1)::int AS earned,
       (SELECT COALESCE(SUM(price), 0) FROM prize_orders
         WHERE user_id = $1 AND status IN ('pending', 'issued'))::int AS spent`,
    [userId]
  )
  const { earned, spent } = res.rows[0]
  return { earned, spent, available: Math.max(0, earned - spent) }
}

/**
 * Место ученика в школе и в классе (по заработанным баллам).
 * Ученики с одинаковыми баллами делят место (RANK).
 */
export async function getRanks(db, userId) {
  const res = await db.query(
    `WITH totals AS (
       SELECT u.id, u.class_name, COALESCE(SUM(p.points), 0)::int AS earned
         FROM users u
         LEFT JOIN user_points p ON p.user_id = u.id
        WHERE u.role = 'student'
        GROUP BY u.id
     ), ranked AS (
       SELECT id, class_name, earned,
              RANK() OVER (ORDER BY earned DESC)::int AS school_rank,
              RANK() OVER (PARTITION BY class_name ORDER BY earned DESC)::int AS class_rank,
              COUNT(*) OVER ()::int AS school_total,
              COUNT(*) OVER (PARTITION BY class_name)::int AS class_total
         FROM totals
     )
     SELECT * FROM ranked WHERE id = $1`,
    [userId]
  )
  return res.rows[0] || null
}


/**
 * Дата старта программы (монеты, отзывы, магазин). Всё, что было раньше,
 * не считается: старые сданные книги не требуют отзыва и не дают монет.
 * Хранится в app_meta('game_start'); меняет тимлид на странице «Мониторинг».
 * Возвращает ISO-строку или null (тогда считается вся история).
 */
export async function getGameStart(db) {
  try {
    const r = await db.query(`SELECT value FROM app_meta WHERE key = 'game_start'`)
    return r.rows[0]?.value || null
  } catch {
    return null
  }
}
