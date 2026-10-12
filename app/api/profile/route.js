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

  // Активные книги.
  // ВАЖНО: в borrows всего два статуса — 'active' и 'returned'
  // (CHECK в db/schema.sql). Статусов 'overdue'/'submitted'/'approved' НЕ существует,
  // поэтому фильтры по ним всегда давали пустоту. Просрочка = status 'active' + due_date < NOW().
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

  // Законченные книги (сданные). Раньше здесь был status = 'approved' —
  // такого статуса нет в CHECK-ограничении, поэтому «Прочитано» было всегда 0.
  const finishedBooks = await pool.query(`
    SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author,
           books.id as book_id, borrows.borrowed_at, borrows.returned_at,
           borrows.rating, books.genre
    FROM borrows
    JOIN books ON borrows.book_id = books.id
    WHERE borrows.user_id = $1 AND borrows.status = 'returned'
    ORDER BY borrows.returned_at DESC
  `, [userId])

  // Статистика для дашборда
  const stats = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'returned') AS books_finished,
      COUNT(*) FILTER (WHERE status = 'active') AS books_active,
      COUNT(*) FILTER (WHERE status = 'active' AND due_date < NOW()) AS books_overdue,
      COUNT(DISTINCT bk.genre) FILTER (WHERE status = 'returned') AS genres_count
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
    submitted: [], // статуса 'submitted' в системе нет — оставлено для совместимости
    finished: finishedBooks.rows,
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
  const auth = req.headers.get('authorization')
  if (!auth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }
  const token = auth.split(' ')[1]
  if (!token || !process.env.JWT_SECRET) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
  }

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