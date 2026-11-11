import { NextResponse } from "next/server"
import pool from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { getGameStart } from '../../../lib/game'

export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const payload = guard.payload

  const userId = payload.id

  const userRes = await pool.query(
    `SELECT id, name, email, role, class_name, avatar_url, created_at
     FROM users WHERE id = $1`,
    [userId]
  )
  if (!userRes.rows[0]) {
    return NextResponse.json({ error: 'Не найден' }, { status: 404 })
  }

  // Активные книги.
  // Статусы borrows: active → returned (сдал) → reviewed (написал отзыв)
  // → approved (библиотекарь принял отзыв, книга на личной полке).
  // Просрочка = status 'active' + due_date < NOW().
  const activeBooks = await pool.query(`
    SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author,
           books.id as book_id, books.genre, borrows.due_date, borrows.borrowed_at,
           borrows.rating,
           (borrows.due_date IS NOT NULL AND borrows.due_date < NOW()) AS is_overdue
    FROM borrows
    JOIN books ON borrows.book_id = books.id
    WHERE borrows.user_id = $1 AND borrows.status = 'active'
    ORDER BY borrows.borrowed_at DESC
  `, [userId])

  // Книги, которые ученик прочитал (ждёт отзыва или уже одобрено)
  const submittedBooks = await pool.query(`
    SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author, books.id as book_id,
           borrows.returned_at, borrows.rating, reviews.status as review_status,
           EXISTS (SELECT 1 FROM shelf_requests sr WHERE sr.borrow_id = borrows.id AND sr.status = 'pending') AS shelf_pending,
           reviews.review_note, reviews.content as review_content
    FROM borrows
    JOIN books ON borrows.book_id = books.id
    LEFT JOIN book_reviews reviews ON reviews.borrow_id = borrows.id
    WHERE borrows.user_id = $1 AND borrows.status IN ('returned', 'reviewed')
      -- книги, сданные до старта программы, отзыва не требуют (если отзыва ещё нет)
      AND (reviews.id IS NOT NULL OR borrows.returned_at >= $2::timestamptz)
    ORDER BY borrows.returned_at DESC
  `, [userId, (await getGameStart(pool)) || '-infinity'])

  // Личная полка — прочитанные и одобренные книги
  const finishedBooks = await pool.query(`
    SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author,
           books.id as book_id, borrows.borrowed_at, borrows.returned_at,
           books.genre, borrows.rating, reviews.content as review_content,
           reviews.created_at as review_at
    FROM borrows
    JOIN books ON borrows.book_id = books.id
    LEFT JOIN book_reviews reviews ON reviews.borrow_id = borrows.id
    WHERE borrows.user_id = $1 AND borrows.status = 'approved'
    ORDER BY borrows.returned_at DESC
  `, [userId])

  // Статистика для дашборда
  const stats = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'approved') AS books_finished,
      COUNT(*) FILTER (WHERE status = 'active') AS books_active,
      COUNT(*) FILTER (WHERE status = 'active' AND due_date < NOW()) AS books_overdue,
      COUNT(*) FILTER (WHERE status IN ('returned', 'reviewed')) AS books_to_review,
      COUNT(DISTINCT bk.genre) FILTER (WHERE status = 'approved') AS genres_count
    FROM borrows b
    LEFT JOIN books bk ON bk.id = b.book_id
    WHERE b.user_id = $1
  `, [userId])

  // Цель чтения на текущий год
  const goalRes = await pool.query(
    'SELECT goal FROM reading_goals WHERE user_id = $1 AND year = $2',
    [userId, new Date().getFullYear()]
  )
  const readingGoal = goalRes.rows[0]?.goal || 12

  // Личная полка прочитанных книг (approved)
  const shelfBooks = await pool.query(`
    SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author,
           books.id as book_id, books.genre, borrows.rating, borrows.notes,
           borrows.returned_at, borrows.borrowed_at,
           reviews.content as review_content, reviews.created_at as review_at
    FROM borrows
    JOIN books ON borrows.book_id = books.id
    LEFT JOIN book_reviews reviews ON reviews.borrow_id = borrows.id
    WHERE borrows.user_id = $1 AND borrows.status = 'approved'
    ORDER BY borrows.returned_at DESC
  `, [userId])

  return NextResponse.json({
    user: userRes.rows[0],
    active: activeBooks.rows,
    submitted: submittedBooks.rows, // сданные книги, которые ждут отзыва или его проверки
    finished: finishedBooks.rows,
    shelf: shelfBooks.rows,
    stats: stats.rows[0],
    reading_goal: readingGoal
  })
}

/**
 * PATCH /api/profile
 * Пользователь меняет свои данные: имя, класс, телефон.
 * Пароль — отдельным запросом (PATCH /api/profile/password), там нужна проверка старого.
 *
 * Свою роль и email менять нельзя: роль выдаёт библиотекарь,
 * email служит логином.
 */
export async function PATCH(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const payload = guard.payload

  try {
    const { name, className, phone } = await req.json()
    const fields = []
    const values = []
    let i = 1

    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json({ error: 'Имя не может быть пустым' }, { status: 400 })
      }
      fields.push(`name = $${i++}`)
      values.push(String(name).trim().slice(0, 120))
    }
    if (className !== undefined) {
      fields.push(`class_name = $${i++}`)
      values.push(String(className).trim().slice(0, 40) || null)
    }
    if (phone !== undefined) {
      fields.push(`phone = $${i++}`)
      values.push(String(phone).trim().slice(0, 40) || null)
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 })
    }

    fields.push(`updated_at = NOW()`)
    values.push(payload.id)

    const res = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, email, role, class_name, phone, avatar_url`,
      values
    )

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: res.rows[0] })
  } catch (err) {
    console.error('Profile update error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}