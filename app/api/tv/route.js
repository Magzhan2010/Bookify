import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../lib/db'
import { MONTH_START, bestClasses } from '../../../lib/seasons'
import { publicQuote } from '../../../lib/quotes'

/**
 * GET /api/tv?key=… — данные для экрана в холле (DLS TV).
 * Без входа, но только с секретным ключом (app_meta.tv_key): имена учеников
 * не должны быть открыты всему интернету.
 */
export async function GET(req) {
  const key = new URL(req.url).searchParams.get('key') || ''
  try {
    await ensureSchema()
    const k = await pool.query(`SELECT value FROM app_meta WHERE key = 'tv_key'`)
    if (!key || key !== k.rows[0]?.value) {
      return NextResponse.json({ error: 'Неверный ключ экрана' }, { status: 403 })
    }

    const [leaders, best, quotes, books, stats] = await Promise.all([
      pool.query(`
        SELECT u.id, u.name, CASE WHEN u.role = 'teacher' THEN NULL ELSE u.class_name END AS class_name,
               (u.role = 'teacher') AS is_teacher, u.avatar_url, SUM(p.points)::int AS points
          FROM user_points p JOIN users u ON u.id = p.user_id
         WHERE u.role IN ('student', 'teacher') AND p.created_at >= ${MONTH_START}
         GROUP BY u.id ORDER BY points DESC, u.name LIMIT 10`),
      bestClasses(pool, 5),
      pool.query(`SELECT id, text, author_name, author_info, book_title, image, updated_at FROM quotes WHERE active ORDER BY id`),
      pool.query(`SELECT id, title, author, cover_url FROM books WHERE archived_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 8`)
        .catch(() => pool.query(`SELECT id, title, author, cover_url FROM books ORDER BY id DESC LIMIT 8`)),
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM borrows WHERE returned_at >= ${MONTH_START})::int AS books_read,
          (SELECT COUNT(*) FROM book_reviews WHERE created_at >= ${MONTH_START})::int AS reviews,
          (SELECT COALESCE(SUM(points), 0) FROM user_points WHERE created_at >= ${MONTH_START})::int AS coins,
          (SELECT COUNT(DISTINCT user_id) FROM borrows WHERE status = 'active')::int AS reading_now`)
    ])

    // Цитата дня: каждый день — следующая
    const day = Math.floor(Date.now() / 86400000)
    const q = quotes.rows.length ? publicQuote(quotes.rows[day % quotes.rows.length]) : null

    return NextResponse.json({
      month_start: best.month_start,
      leaders: leaders.rows,
      best_classes: best.classes,
      quote: q,
      new_books: books.rows,
      stats: stats.rows[0]
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[tv]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
