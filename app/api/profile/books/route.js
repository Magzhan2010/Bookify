import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/profile/books
 * Лёгкий ответ для каталога: id книг, которые ученик читает сейчас и уже прочитал.
 * Раньше каталог ради этого грузил весь /api/profile (6 запросов к БД).
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response

  try {
    const res = await pool.query(
      `SELECT book_id, bool_or(status = 'active') AS reading, bool_or(status <> 'active') AS read
         FROM borrows WHERE user_id = $1 GROUP BY book_id`,
      [guard.payload.id]
    )
    return NextResponse.json({
      reading: res.rows.filter(r => r.reading).map(r => r.book_id),
      finished: res.rows.filter(r => r.read).map(r => r.book_id)
    })
  } catch (err) {
    console.error('Profile books error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
