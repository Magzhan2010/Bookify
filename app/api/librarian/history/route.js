import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/librarian/history
 * Полный журнал выдач и возвратов с фильтрами.
 *
 * Query:
 *   from=YYYY-MM-DD        — от даты
 *   to=YYYY-MM-DD          — до даты
 *   student=id|name        — конкретный ученик
 *   book=id|title          — конкретная книга
 *   status=active|returned|...
 *   limit=100 (default)
 */
export async function GET(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const student = searchParams.get('student')
  const book = searchParams.get('book')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit')) || 200

  const conditions = []
  const params = []
  let i = 1

  if (from) {
    conditions.push(`b.borrowed_at >= $${i++}`)
    params.push(from)
  }
  if (to) {
    conditions.push(`b.borrowed_at <= $${i++}`)
    params.push(to + ' 23:59:59')
  }
  if (student) {
    if (/^\d+$/.test(student)) {
      conditions.push(`u.id = $${i++}`)
      params.push(parseInt(student))
    } else {
      conditions.push(`LOWER(u.name) LIKE LOWER($${i++})`)
      params.push(`%${student}%`)
    }
  }
  if (book) {
    if (/^\d+$/.test(book)) {
      conditions.push(`bk.id = $${i++}`)
      params.push(parseInt(book))
    } else {
      conditions.push(`LOWER(bk.title) LIKE LOWER($${i++})`)
      params.push(`%${book}%`)
    }
  }
  if (status) {
    conditions.push(`b.status = $${i++}`)
    params.push(status)
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  try {
    const query = `
      SELECT
        b.id, b.status, b.borrowed_at, b.due_date, b.returned_at, b.notes,
        u.id AS student_id, u.name AS student_name, u.email, u.class_name,
        bk.id AS book_id, bk.title, bk.author, bk.cover_url,
        lib.name AS issued_by_name,
        EXTRACT(DAY FROM (b.returned_at - b.borrowed_at))::INT AS days_held
      FROM borrows b
      JOIN users u ON u.id = b.user_id
      JOIN books bk ON bk.id = b.book_id
      LEFT JOIN users lib ON lib.id = b.issued_by
      ${where}
      ORDER BY b.borrowed_at DESC
      LIMIT ${limit}
    `
    const res = await pool.query(query, params)
    return NextResponse.json(res.rows)
  } catch (err) {
    console.error('History error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}