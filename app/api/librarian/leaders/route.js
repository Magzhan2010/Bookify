import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/librarian/leaders?class=7&sort=books|points
 * Для библиотекаря: кто сколько прочитал, что именно закончил,
 * последние завершённые книги и сравнение классов.
 *
 * «Прочитано» = книга сдана (статус займа не active: returned / reviewed / approved).
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const cls = (searchParams.get('class') || '').trim()
  const sort = searchParams.get('sort') === 'points' ? 'points' : 'books'

  const params = []
  let classFilter = ''
  if (cls) {
    params.push(cls)
    classFilter = `AND u.class_name = $${params.length}`
  }

  try {
    const [leaders, recent, byClass, classes] = await Promise.all([
      pool.query(
        `WITH finished AS (
           SELECT b.user_id, b.book_id, b.status, b.returned_at, bk.title, bk.author,
                  ROW_NUMBER() OVER (PARTITION BY b.user_id ORDER BY b.returned_at DESC NULLS LAST) AS rn
             FROM borrows b
             JOIN books bk ON bk.id = b.book_id
            WHERE b.status NOT IN ('active', 'cancelled')
         ), pts AS (
           SELECT user_id, COALESCE(SUM(points), 0)::int AS points FROM user_points GROUP BY user_id
         )
         SELECT u.id, u.name, u.class_name, u.avatar_url,
                COUNT(f.book_id)::int AS books,
                COUNT(f.book_id) FILTER (WHERE f.status = 'approved')::int AS confirmed,
                COALESCE(MAX(p.points), 0)::int AS points,
                MAX(f.returned_at) AS last_at,
                COALESCE(
                  json_agg(json_build_object('title', f.title, 'author', f.author, 'status', f.status, 'at', f.returned_at)
                           ORDER BY f.returned_at DESC NULLS LAST)
                    FILTER (WHERE f.rn <= 10),
                  '[]'
                ) AS last_books,
                (SELECT COUNT(*)::int FROM borrows a WHERE a.user_id = u.id AND a.status = 'active') AS reading_now
           FROM users u
           LEFT JOIN finished f ON f.user_id = u.id
           LEFT JOIN pts p ON p.user_id = u.id
          WHERE u.role = 'student' ${classFilter}
          GROUP BY u.id
         HAVING COUNT(f.book_id) > 0 OR COALESCE(MAX(p.points), 0) > 0
          ORDER BY ${sort === 'points' ? 'points DESC, books DESC' : 'books DESC, points DESC'}, u.name ASC
          LIMIT 100`,
        params
      ),
      pool.query(
        `SELECT b.id, b.returned_at, b.status, u.name AS student_name, u.avatar_url AS student_avatar, u.class_name,
                bk.title, bk.author, bk.cover_url, r.status AS review_status
           FROM borrows b
           JOIN users u ON u.id = b.user_id
           JOIN books bk ON bk.id = b.book_id
           LEFT JOIN book_reviews r ON r.borrow_id = b.id
          WHERE b.status NOT IN ('active', 'cancelled') AND u.role = 'student' ${classFilter}
          ORDER BY b.returned_at DESC NULLS LAST
          LIMIT 15`,
        params
      ),
      pool.query(
        `SELECT u.class_name,
                COUNT(DISTINCT u.id)::int AS students,
                COUNT(b.id) FILTER (WHERE b.status NOT IN ('active', 'cancelled'))::int AS books
           FROM users u
           LEFT JOIN borrows b ON b.user_id = u.id
          WHERE u.role = 'student' AND u.class_name IS NOT NULL AND u.class_name <> ''
          GROUP BY u.class_name`
      ),
      pool.query(
        `SELECT DISTINCT class_name FROM users
          WHERE role = 'student' AND class_name IS NOT NULL AND class_name <> ''`
      )
    ])

    const byNumber = (a, b) => String(a).localeCompare(String(b), 'ru', { numeric: true })
    return NextResponse.json({
      sort,
      class_name: cls || null,
      classes: classes.rows.map(r => r.class_name).sort(byNumber),
      leaders: leaders.rows,
      recent: recent.rows,
      by_class: byClass.rows
        .map(c => ({ ...c, per_student: c.students ? Math.round((c.books / c.students) * 10) / 10 : 0 }))
        .sort((a, b) => b.books - a.books)
    })
  } catch (err) {
    console.error('Librarian leaders error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
