import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"
import pool from '../../../lib/db'

export async function GET(req) {
  const auth = req.headers.get('authorization')
  if (!auth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }
  const token = auth.split(' ')[1]

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'JWT_SECRET не задан' }, { status: 500 })
  }

  let payload
  try {
    payload = jwt.verify(token, secret)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Токен истёк' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
  }

  const userId = payload.id

  const userRes = await pool.query(
    `SELECT id, name, email, role, class_name, avatar_url, created_at
     FROM users WHERE id = $1`,
    [userId]
  )
  if (!userRes.rows[0]) {
    return NextResponse.json({ error: 'Не найден' }, { status: 404 })
  }

  // Активные книги
  const activeBooks = await pool.query(`
    SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author,
           books.id as book_id, borrows.due_date, borrows.borrowed_at
    FROM borrows
    JOIN books ON borrows.book_id = books.id
    WHERE borrows.user_id = $1 AND borrows.status IN ('active', 'overdue')
    ORDER BY borrows.borrowed_at DESC
  `, [userId])

  // Книги на проверке
  const submittedBooks = await pool.query(`
    SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author, books.id as book_id
    FROM borrows
    JOIN books ON borrows.book_id = books.id
    WHERE borrows.user_id = $1 AND borrows.status = 'submitted'
  `, [userId])

  // Законченные книги
  const finishedBooks = await pool.query(`
    SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author,
           books.id as book_id, borrows.borrowed_at, borrows.returned_at,
           books.genre
    FROM borrows
    JOIN books ON borrows.book_id = books.id
    WHERE borrows.user_id = $1 AND borrows.status = 'approved'
    ORDER BY borrows.returned_at DESC
  `, [userId])

  // Статистика для дашборда
  const stats = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'approved') AS books_finished,
      COUNT(*) FILTER (WHERE status IN ('active', 'submitted', 'overdue')) AS books_active,
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

  return NextResponse.json({
    user: userRes.rows[0],
    active: activeBooks.rows,
    submitted: submittedBooks.rows,
    finished: finishedBooks.rows,
    stats: stats.rows[0],
    reading_goal: readingGoal
  })
}