import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { MONTH_START, bestClasses } from '../../../../lib/seasons'

/**
 * GET /api/game/leaderboard?class=7&limit=50&period=month|all
 * period=month — сезон: только монеты, заработанные в этом месяце (рейтинг каждый месяц с нуля).
 * В ответе также лучшие классы месяца.
 * Рейтинг учеников по заработанным баллам.
 * Без class — вся школа. Список классов — для переключателя.
 * Траты на призы место в рейтинге не понижают.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const cls = (searchParams.get('class') || '').trim()
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit')) || 50, 1), 200)
  const period = searchParams.get('period') === 'month' ? 'month' : 'all'

  try {
    const params = [limit]
    let classFilter = ''
    if (cls) {
      params.push(cls)
      classFilter = `AND u.role = 'student' AND u.class_name = $2`
    }

    const [rows, classes, best] = await Promise.all([
      pool.query(
        `WITH totals AS (
           SELECT u.id, u.name, CASE WHEN u.role = 'teacher' THEN NULL ELSE u.class_name END AS class_name, u.avatar_url,
                  (u.role = 'teacher') AS is_teacher,
                  COALESCE(SUM(p.points), 0)::int AS earned,
                  COUNT(DISTINCT p.book_id) FILTER (WHERE p.reason LIKE 'pages%' AND NOT p.reverted)::int AS books
             FROM users u
             LEFT JOIN user_points p ON p.user_id = u.id ${period === 'month' ? `AND p.created_at >= ${MONTH_START}` : ''}
            WHERE (u.role = 'student' OR (u.role = 'teacher' AND NOT COALESCE(u.teacher_pending, FALSE))) ${classFilter}
            GROUP BY u.id
         )
         SELECT id, name, class_name, avatar_url, is_teacher, earned, books,
                RANK() OVER (ORDER BY earned DESC)::int AS place
           FROM totals
          WHERE earned > 0
          ORDER BY earned DESC, name ASC
          LIMIT $1`,
        params
      ),
      pool.query(
        `SELECT class_name, COUNT(*)::int AS students
           FROM users
          WHERE role = 'student' AND class_name IS NOT NULL AND class_name <> ''
          GROUP BY class_name`
      ),
      bestClasses(pool)
    ])

    // Сортируем классы «по-человечески»: 7, 8, 9, 10, 11 (а не 10, 11, 7…)
    const classList = classes.rows
      .map(c => c.class_name)
      .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }))

    return NextResponse.json({
      scope: cls ? 'class' : 'school',
      class_name: cls || null,
      classes: classList,
      me: guard.payload.id,
      period,
      month_start: best.month_start,
      best_classes: best.classes,
      leaders: rows.rows
    })
  } catch (err) {
    console.error('Leaderboard error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
