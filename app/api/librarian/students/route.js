import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '../../../../lib/db'
import { requireAuth, detectRoleFromEmail } from '../../../../lib/auth'

/**
 * GET /api/librarian/students
 * Список всех учеников + краткая статистика.
 *
 * Query:
 *   q=поиск      — по имени/email/классу
 *   class=10-A   — фильтр по классу
 *   active=true  — только с активными займами
 */
export async function GET(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const className = searchParams.get('class')?.trim()
  const active = searchParams.get('active') === 'true'

  const conditions = [`u.role = 'student'`]
  const params = []
  let i = 1

  if (q) {
    conditions.push(
      `(LOWER(u.name) LIKE LOWER($${i}) OR LOWER(u.email) LIKE LOWER($${i}) OR LOWER(u.class_name) LIKE LOWER($${i}))`
    )
    params.push(`%${q}%`)
    i++
  }
  if (className) {
    conditions.push(`u.class_name = $${i++}`)
    params.push(className)
  }
  if (active) {
    conditions.push(`EXISTS (SELECT 1 FROM borrows b WHERE b.user_id = u.id AND b.status IN ('active','overdue','submitted'))`)
  }

  const where = 'WHERE ' + conditions.join(' AND ')

  try {
    const query = `
      SELECT
        u.id, u.name, u.email, u.class_name, u.phone, u.avatar_url, u.created_at,
        COUNT(b.id) AS total_borrows,
        COUNT(b.id) FILTER (WHERE b.status IN ('active','overdue','submitted')) AS currently_holding,
        COUNT(b.id) FILTER (WHERE b.status = 'returned') AS returned_count,
        COUNT(b.id) FILTER (WHERE b.status IN ('active','overdue') AND b.due_date < NOW()) AS overdue_count,
        MAX(b.borrowed_at) AS last_borrowed_at
      FROM users u
      LEFT JOIN borrows b ON b.user_id = u.id
      ${where}
      GROUP BY u.id
      ORDER BY u.class_name ASC NULLS LAST, u.name ASC
      LIMIT 250
    `
    const res = await pool.query(query, params)
    return NextResponse.json(res.rows)
  } catch (err) {
    console.error('Students list error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/librarian/students
 * Создать нового ученика (без необходимости самостоятельной регистрации).
 * Body: { name, email, password, className?, phone? }
 */
export async function POST(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { name, email, password, className, phone } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: 'Имя, email и пароль обязательны' },
      { status: 400 }
    )
  }

  try {
    const exists = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    )
    if (exists.rows[0]) {
      return NextResponse.json(
        { error: 'Ученик с таким email уже есть' },
        { status: 400 }
      )
    }

    const hash = await bcrypt.hash(password, 10)
    const role = detectRoleFromEmail(email)

    const insert = await pool.query(
      `INSERT INTO users (name, email, password, role, class_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, class_name, phone, created_at`,
      [name, email, hash, role, className || null, phone || null]
    )

    return NextResponse.json({ success: true, student: insert.rows[0] })
  } catch (err) {
    console.error('Create student error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}