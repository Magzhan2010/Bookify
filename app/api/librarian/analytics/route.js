import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/librarian/analytics
 * Комплексная аналитика для дашборда библиотекаря.
 */
export async function GET(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  try {
    // 1. Общие счётчики
    const totals = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM books) AS total_books,
        (SELECT COUNT(*) FROM books WHERE available_copies > 0) AS available_books,
        (SELECT SUM(total_copies - available_copies) FROM books) AS books_on_hands,
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
        (SELECT COUNT(DISTINCT user_id) FROM borrows
           WHERE borrowed_at > NOW() - INTERVAL '30 days') AS active_readers_30d,
        (SELECT COUNT(*) FROM borrows WHERE status IN ('active','overdue')) AS active_loans,
        (SELECT COUNT(*) FROM borrows
           WHERE status IN ('active','overdue') AND due_date < NOW()) AS overdue_loans
    `)
    const t = totals.rows[0]

    // 2. Топ-10 читателей (по кол-ву взятых книг за всё время)
    const topReaders = await pool.query(`
      SELECT u.id, u.name, u.class_name,
             COUNT(*) AS total_borrows,
             COUNT(*) FILTER (WHERE status = 'returned') AS returned_count,
             COUNT(*) FILTER (WHERE status IN ('active','submitted','overdue')) AS currently_holding,
             COUNT(*) FILTER (WHERE status IN ('active','overdue') AND due_date < NOW()) AS overdue_count
      FROM borrows b
      JOIN users u ON u.id = b.user_id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.class_name
      ORDER BY total_borrows DESC
      LIMIT 10
    `)

    // 3. Должники (просрочки)
    const debtors = await pool.query(`
      SELECT b.id AS borrow_id,
             b.due_date,
             EXTRACT(DAY FROM (NOW() - b.due_date))::INT AS overdue_days,
             u.id AS student_id, u.name AS student_name, u.email, u.class_name,
             bk.id AS book_id, bk.title, bk.author, bk.cover_url
      FROM borrows b
      JOIN users u ON u.id = b.user_id
      JOIN books bk ON bk.id = b.book_id
      WHERE b.status IN ('active','overdue') AND b.due_date < NOW()
      ORDER BY b.due_date ASC
      LIMIT 50
    `)

    // 4. Популярные книги (по кол-ву выдач)
    const popularBooks = await pool.query(`
      SELECT bk.id, bk.title, bk.author, bk.cover_url, bk.genre,
             COUNT(*) AS borrow_count
      FROM borrows b
      JOIN books bk ON bk.id = b.book_id
      GROUP BY bk.id, bk.title, bk.author, bk.cover_url, bk.genre
      ORDER BY borrow_count DESC
      LIMIT 10
    `)

    // 5. Выдачи по дням (последние 30 дней)
    const timeline = await pool.query(`
      SELECT DATE(borrowed_at) AS day,
             COUNT(*) AS borrows_count,
             COUNT(*) FILTER (WHERE status = 'returned') AS returns_count
      FROM borrows
      WHERE borrowed_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(borrowed_at)
      ORDER BY day ASC
    `)

    // 6. Топ жанров
    const genres = await pool.query(`
      SELECT bk.genre, COUNT(*) AS count
      FROM borrows b
      JOIN books bk ON bk.id = b.book_id
      WHERE bk.genre IS NOT NULL AND bk.genre != ''
      GROUP BY bk.genre
      ORDER BY count DESC
      LIMIT 8
    `)

    // 7. Недавно выданные
    const recent = await pool.query(`
      SELECT b.id AS borrow_id, b.borrowed_at, b.due_date, b.status,
             u.name AS student_name, u.class_name,
             bk.title, bk.author, bk.cover_url
      FROM borrows b
      JOIN users u ON u.id = b.user_id
      JOIN books bk ON bk.id = b.book_id
      ORDER BY b.borrowed_at DESC
      LIMIT 8
    `)

    return NextResponse.json({
      totals: {
        total_books: parseInt(t.total_books),
        available_books: parseInt(t.available_books),
        books_on_hands: parseInt(t.books_on_hands || 0),
        total_students: parseInt(t.total_students),
        active_readers_30d: parseInt(t.active_readers_30d || 0),
        active_loans: parseInt(t.active_loans),
        overdue_loans: parseInt(t.overdue_loans)
      },
      top_readers: topReaders.rows,
      debtors: debtors.rows,
      popular_books: popularBooks.rows,
      timeline: timeline.rows,
      genres: genres.rows,
      recent: recent.rows
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}