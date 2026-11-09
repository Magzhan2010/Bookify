/**
 * Сезоны: рейтинг месяца и лучший класс месяца.
 * Месяц считаем по времени школы (UTC+5).
 */
export const MONTH_START = `(date_trunc('month', NOW() + INTERVAL '5 hours') - INTERVAL '5 hours')`

/** Лучшие классы этого месяца: сумма монет учеников класса. */
export async function bestClasses(db, limit = 5) {
  const r = await db.query(`
    SELECT u.class_name,
           SUM(p.points)::int AS points,
           COUNT(DISTINCT p.user_id)::int AS readers,
           (SELECT COUNT(*) FROM users x WHERE x.role = 'student' AND x.class_name = u.class_name)::int AS students,
           ${MONTH_START} AS month_start
      FROM user_points p
      JOIN users u ON u.id = p.user_id
     WHERE u.role = 'student' AND u.class_name IS NOT NULL AND u.class_name <> ''
       AND p.created_at >= ${MONTH_START}
     GROUP BY u.class_name
     ORDER BY points DESC, readers DESC
     LIMIT ${Math.max(1, Math.min(20, limit | 0))}`)
  const ms = await db.query(`SELECT ${MONTH_START} AS m`)
  return { month_start: ms.rows[0].m, classes: r.rows.map(({ month_start, ...c }) => c) }
}
