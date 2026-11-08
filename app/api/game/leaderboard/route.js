import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/game/leaderboard?class=7&limit=50
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

  try {
    const params = [limit]
    let classFilter = ''
    if (cls) {
      params.push(cls)
      classFilter = 'AND u.class_name = $2'
    }

    const [rows, classes] = await Promise.all([
      pool.query(
        `WITH totals AS (
           SELECT u.id, u.name, u.class_name, u.avatar_url,
                  COALESCE(SUM(p.points), 0)::int AS earned,
                  COUNT(DISTINCT p.book_id) FILTER (WHERE p.reason LIKE 'pages%')::int AS books
             FROM users u
             LEFT JOIN user_points p ON p.user_id = u.id
            WHERE u.role = 'student' ${classFilter}
            GROUP BY u.id
         )
         SELECT id, name, class_name, avatar_url, earned, books,
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
      )
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
      leaders: rows.rows
    })
  } catch (err) {
    console.error('Leaderboard error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
