import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

const TZ = 'Asia/Qyzylorda'
const PERIODS = { 7: 'day', 30: 'day', 90: 'week', 365: 'month' }

/**
 * GET /api/librarian/analytics/advanced?days=7|30|90|365
 * Расширенная аналитика за период + сравнение с предыдущим таким же периодом.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const days = [7, 30, 90, 365].includes(parseInt(searchParams.get('days'))) ? parseInt(searchParams.get('days')) : 30
  const bucket = PERIODS[days]
  const P = [days] // $1 = длина периода в днях

  try {
    const [
      kpi, snapshot, timeline, heat, topBooks, genres, classes, funnel, duration, topReaders
    ] = await Promise.all([
      // 1. Показатели: текущий период vs предыдущий
      pool.query(
        `WITH w AS (
           SELECT NOW() - make_interval(days => $1) AS cur_start,
                  NOW() - make_interval(days => $1 * 2) AS prev_start
         )
         SELECT
           (SELECT COUNT(*) FROM borrows, w WHERE borrowed_at >= cur_start)::int AS issues,
           (SELECT COUNT(*) FROM borrows, w WHERE borrowed_at >= prev_start AND borrowed_at < cur_start)::int AS issues_prev,
           (SELECT COUNT(*) FROM borrows, w WHERE returned_at >= cur_start)::int AS returns,
           (SELECT COUNT(*) FROM borrows, w WHERE returned_at >= prev_start AND returned_at < cur_start)::int AS returns_prev,
           (SELECT COUNT(DISTINCT user_id) FROM borrows, w WHERE borrowed_at >= cur_start OR returned_at >= cur_start)::int AS readers,
           (SELECT COUNT(DISTINCT user_id) FROM borrows, w
             WHERE (borrowed_at >= prev_start AND borrowed_at < cur_start)
                OR (returned_at >= prev_start AND returned_at < cur_start))::int AS readers_prev,
           (SELECT COUNT(*) FROM book_reviews, w WHERE created_at >= cur_start)::int AS reviews,
           (SELECT COUNT(*) FROM book_reviews, w WHERE created_at >= prev_start AND created_at < cur_start)::int AS reviews_prev,
           (SELECT COALESCE(SUM(points), 0) FROM user_points, w WHERE created_at >= cur_start)::int AS coins,
           (SELECT COALESCE(SUM(points), 0) FROM user_points, w WHERE created_at >= prev_start AND created_at < cur_start)::int AS coins_prev,
           (SELECT COUNT(*) FROM prize_orders, w WHERE status = 'issued' AND processed_at >= cur_start)::int AS prizes,
           (SELECT COUNT(*) FROM prize_orders, w WHERE status = 'issued' AND processed_at >= prev_start AND processed_at < cur_start)::int AS prizes_prev,
           (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (returned_at - borrowed_at)) / 86400)::numeric, 1)
              FROM borrows, w WHERE returned_at >= cur_start)::float AS avg_days,
           (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (returned_at - borrowed_at)) / 86400)::numeric, 1)
              FROM borrows, w WHERE returned_at >= prev_start AND returned_at < cur_start)::float AS avg_days_prev`,
        P
      ),
      // 2. Состояние прямо сейчас
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM borrows WHERE status = 'active')::int AS on_hands,
           (SELECT COUNT(*) FROM borrows WHERE status = 'active' AND due_date < NOW())::int AS overdue,
           (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS students,
           (SELECT COUNT(*) FROM books WHERE archived_at IS NULL)::int AS books,
           (SELECT COUNT(*) FROM book_requests WHERE status IN ('pending', 'approved'))::int AS open_requests,
           (SELECT COUNT(*) FROM book_reviews WHERE status = 'pending')::int AS pending_reviews,
           (SELECT COUNT(*) FROM prize_orders WHERE status = 'pending')::int AS pending_prizes`
      ),
      // 3. Динамика по дням / неделям / месяцам, без «дыр» в датах
      pool.query(
        `WITH series AS (
           SELECT generate_series(
             date_trunc('${bucket}', (NOW() AT TIME ZONE '${TZ}') - make_interval(days => $1 - 1)),
             date_trunc('${bucket}', NOW() AT TIME ZONE '${TZ}'),
             interval '1 ${bucket}'
           ) AS b
         )
         SELECT to_char(s.b, 'YYYY-MM-DD') AS bucket,
           (SELECT COUNT(*) FROM borrows WHERE date_trunc('${bucket}', borrowed_at AT TIME ZONE '${TZ}') = s.b)::int AS issues,
           (SELECT COUNT(*) FROM borrows WHERE date_trunc('${bucket}', returned_at AT TIME ZONE '${TZ}') = s.b)::int AS returns,
           (SELECT COUNT(*) FROM book_reviews WHERE date_trunc('${bucket}', created_at AT TIME ZONE '${TZ}') = s.b)::int AS reviews
         FROM series s ORDER BY s.b`,
        P
      ),
      // 4. Когда берут книги: день недели × час
      pool.query(
        `SELECT EXTRACT(ISODOW FROM borrowed_at AT TIME ZONE '${TZ}')::int AS dow,
                EXTRACT(HOUR FROM borrowed_at AT TIME ZONE '${TZ}')::int AS hour,
                COUNT(*)::int AS n
           FROM borrows WHERE borrowed_at >= NOW() - make_interval(days => $1)
          GROUP BY 1, 2`,
        P
      ),
      // 5. Самые популярные книги периода
      pool.query(
        `SELECT bk.id, bk.title, bk.author, bk.cover_url, COUNT(*)::int AS n
           FROM borrows b JOIN books bk ON bk.id = b.book_id
          WHERE b.borrowed_at >= NOW() - make_interval(days => $1)
          GROUP BY bk.id ORDER BY n DESC, bk.title LIMIT 8`,
        P
      ),
      // 6. Жанры периода (первый уровень иерархии «Жанр / Поджанр»)
      pool.query(
        `SELECT split_part(COALESCE(NULLIF(bk.genre, ''), 'Без жанра'), ' / ', 1) AS genre, COUNT(*)::int AS n
           FROM borrows b JOIN books bk ON bk.id = b.book_id
          WHERE b.borrowed_at >= NOW() - make_interval(days => $1)
          GROUP BY 1 ORDER BY n DESC LIMIT 8`,
        P
      ),
      // 7. Классы: участие и активность
      pool.query(
        `SELECT u.class_name,
                COUNT(DISTINCT u.id)::int AS students,
                COUNT(DISTINCT b.user_id) FILTER (WHERE b.borrowed_at >= NOW() - make_interval(days => $1))::int AS readers,
                COUNT(b.id) FILTER (WHERE b.borrowed_at >= NOW() - make_interval(days => $1))::int AS issues,
                COUNT(b.id) FILTER (WHERE b.returned_at >= NOW() - make_interval(days => $1))::int AS returns
           FROM users u LEFT JOIN borrows b ON b.user_id = u.id
          WHERE u.role = 'student' AND u.class_name IS NOT NULL AND u.class_name <> ''
          GROUP BY u.class_name`,
        P
      ),
      // 8. Воронка вовлечённости (за всё время)
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS students,
           (SELECT COUNT(DISTINCT b.user_id) FROM borrows b JOIN users u ON u.id = b.user_id WHERE u.role = 'student')::int AS borrowed,
           (SELECT COUNT(DISTINCT b.user_id) FROM borrows b JOIN users u ON u.id = b.user_id
             WHERE u.role = 'student' AND b.status NOT IN ('active', 'cancelled'))::int AS finished,
           (SELECT COUNT(DISTINCT user_id) FROM book_reviews)::int AS reviewed,
           (SELECT COUNT(DISTINCT user_id) FROM user_points)::int AS earned,
           (SELECT COUNT(DISTINCT user_id) FROM prize_orders WHERE status <> 'cancelled')::int AS prized`
      ),
      // 9. Сколько дней читают книгу
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE d < 7)::int AS "lt7",
           COUNT(*) FILTER (WHERE d >= 7 AND d < 14)::int AS "d7_14",
           COUNT(*) FILTER (WHERE d >= 14 AND d < 30)::int AS "d14_30",
           COUNT(*) FILTER (WHERE d >= 30)::int AS "gte30"
           FROM (SELECT EXTRACT(EPOCH FROM (returned_at - borrowed_at)) / 86400 AS d
                   FROM borrows WHERE returned_at >= NOW() - make_interval(days => $1)) x`,
        P
      ),
      // 10. Самые активные читатели периода
      pool.query(
        `SELECT u.id, u.name, u.class_name, u.avatar_url, COUNT(*)::int AS n
           FROM borrows b JOIN users u ON u.id = b.user_id
          WHERE u.role = 'student' AND b.returned_at >= NOW() - make_interval(days => $1)
          GROUP BY u.id ORDER BY n DESC, u.name LIMIT 8`,
        P
      )
    ])

    const byNumber = (a, b) => String(a).localeCompare(String(b), 'ru', { numeric: true })
    const d = duration.rows[0]

    return NextResponse.json({
      days,
      bucket,
      kpi: kpi.rows[0],
      snapshot: snapshot.rows[0],
      timeline: timeline.rows,
      heatmap: heat.rows,
      top_books: topBooks.rows,
      genres: genres.rows,
      classes: classes.rows
        .map(c => ({
          ...c,
          participation: c.students ? Math.round((c.readers / c.students) * 100) : 0,
          per_student: c.students ? Math.round((c.issues / c.students) * 10) / 10 : 0
        }))
        .sort((a, b) => byNumber(a.class_name, b.class_name)),
      funnel: funnel.rows[0],
      duration: [
        { label: 'до недели', n: d.lt7 },
        { label: '1–2 недели', n: d.d7_14 },
        { label: '2–4 недели', n: d.d14_30 },
        { label: 'больше месяца', n: d.gte30 }
      ],
      top_readers: topReaders.rows
    })
  } catch (err) {
    console.error('Advanced analytics error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
