import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/profile/books
 * Лёгкий ответ для каталога: id книг, которые ученик читает сейчас, уже прочитал
 * и на которые оставил заявку.
 * Раньше каталог ради этого грузил весь /api/profile (6 запросов к БД).
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response

  try {
    const [res, req] = await Promise.all([
      pool.query(
        `SELECT book_id, bool_or(status = 'active') AS reading, bool_or(status <> 'active') AS read
           FROM borrows WHERE user_id = $1 GROUP BY book_id`,
        [guard.payload.id]
      ),
      // Заявки, которые ещё не превратились в выдачу (ждут библиотекаря или одобрены,
      // но книгу не выдали) — ученик их считает «своими», показываем отдельно
      pool.query(
        `SELECT DISTINCT book_id FROM book_requests
          WHERE user_id = $1 AND status IN ('pending', 'approved')`,
        [guard.payload.id]
      )
    ])
    return NextResponse.json({
      reading: res.rows.filter(r => r.reading).map(r => r.book_id),
      finished: res.rows.filter(r => r.read).map(r => r.book_id),
      requested: req.rows.map(r => r.book_id)
    })
  } catch (err) {
    console.error('Profile books error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
