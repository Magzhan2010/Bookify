import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/librarian/lookup?q=...
 * Поиск "у кого сейчас эта книга".
 * Поддерживает поиск по названию книги ИЛИ по имени ученика.
 *
 * Также: GET /api/librarian/lookup?overdue=true  → список должников
 */
export async function GET(req) {
  const guard = requireAuth(req, ['librarian', 'admin', 'teacher'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const overdue = searchParams.get('overdue') === 'true'
  const student = searchParams.get('student')?.trim()
  const status = searchParams.get('status') || 'active'

  try {
    let query
    let params = []

    if (overdue) {
      query = `
        SELECT b.id, b.borrowed_at, b.due_date, b.status, b.notes,
               u.id AS student_id, u.name AS student_name, u.email, u.class_name,
               bk.id AS book_id, bk.title, bk.author, bk.cover_url,
               EXTRACT(DAY FROM (NOW() - b.due_date))::INT AS overdue_days
        FROM borrows b
        JOIN users u ON u.id = b.user_id
        JOIN books bk ON bk.id = b.book_id
        WHERE b.status IN ('active','overdue')
          AND b.due_date < NOW()
        ORDER BY b.due_date ASC
        LIMIT 100
      `
    } else if (q) {
      query = `
        SELECT b.id, b.borrowed_at, b.due_date, b.status, b.notes,
               u.id AS student_id, u.name AS student_name, u.email, u.class_name,
               bk.id AS book_id, bk.title, bk.author, bk.cover_url
        FROM borrows b
        JOIN users u ON u.id = b.user_id
        JOIN books bk ON bk.id = b.book_id
        WHERE b.status IN ('active','overdue','submitted')
          AND (LOWER(bk.title) LIKE LOWER($1) OR LOWER(u.name) LIKE LOWER($1))
        ORDER BY b.borrowed_at DESC
        LIMIT 50
      `
      params = [`%${q}%`]
    } else if (student) {
      query = `
        SELECT b.id, b.borrowed_at, b.due_date, b.status, b.notes,
               u.id AS student_id, u.name AS student_name, u.email, u.class_name,
               bk.id AS book_id, bk.title, bk.author, bk.cover_url
        FROM borrows b
        JOIN users u ON u.id = b.user_id
        JOIN books bk ON bk.id = b.book_id
        WHERE b.status IN ('active','overdue','submitted')
          AND LOWER(u.name) LIKE LOWER($1)
        ORDER BY b.borrowed_at DESC
        LIMIT 50
      `
      params = [`%${student}%`]
    } else {
      query = `
        SELECT b.id, b.borrowed_at, b.due_date, b.status, b.notes,
               u.id AS student_id, u.name AS student_name, u.email, u.class_name,
               bk.id AS book_id, bk.title, bk.author, bk.cover_url
        FROM borrows b
        JOIN users u ON u.id = b.user_id
        JOIN books bk ON bk.id = b.book_id
        WHERE b.status = $1
        ORDER BY b.borrowed_at DESC
        LIMIT 100
      `
      params = [status]
    }

    const res = await pool.query(query, params)
    return NextResponse.json(res.rows)
  } catch (err) {
    console.error('Lookup error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}