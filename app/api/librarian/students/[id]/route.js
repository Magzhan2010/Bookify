import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/**
 * GET /api/librarian/students/[id]
 * Полная информация об ученике + вся история займов.
 */
export async function GET(req, { params }) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params

  try {
    const userRes = await pool.query(
      `SELECT id, name, email, role, class_name, phone, avatar_url, created_at
       FROM users WHERE id = $1`,
      [id]
    )
    if (!userRes.rows[0]) {
      return NextResponse.json({ error: 'Не найден' }, { status: 404 })
    }

    const statsRes = await pool.query(
      `SELECT
         COUNT(*) AS total_borrows,
         COUNT(*) FILTER (WHERE status = 'returned') AS returned_count,
         COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
         COUNT(*) FILTER (WHERE status IN ('active','overdue','submitted')) AS active_count,
         COUNT(*) FILTER (WHERE status IN ('active','overdue') AND due_date < NOW()) AS overdue_count,
         COUNT(DISTINCT bk.genre) AS genres_count
       FROM borrows b
       LEFT JOIN books bk ON bk.id = b.book_id
       WHERE b.user_id = $1`,
      [id]
    )

    const historyRes = await pool.query(
      `SELECT b.id, b.status, b.borrowed_at, b.due_date, b.returned_at, b.notes,
              bk.id AS book_id, bk.title, bk.author, bk.cover_url, bk.genre,
              lib.name AS issued_by_name
       FROM borrows b
       JOIN books bk ON bk.id = b.book_id
       LEFT JOIN users lib ON lib.id = b.issued_by
       WHERE b.user_id = $1
       ORDER BY b.borrowed_at DESC
       LIMIT 100`,
      [id]
    )

    const favoritesRes = await pool.query(
      `SELECT b.id, b.title, b.author, b.cover_url, b.genre
       FROM favorites f
       JOIN books b ON b.id = f.book_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT 50`,
      [id]
    )

    return NextResponse.json({
      user: userRes.rows[0],
      stats: statsRes.rows[0],
      history: historyRes.rows,
      favorites: favoritesRes.rows
    })
  } catch (err) {
    console.error('Student detail error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * PATCH /api/librarian/students/[id]
 * Обновить данные ученика: имя, класс, телефон, пароль.
 */
export async function PATCH(req, { params }) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params
  const { name, className, phone, password } = await req.json()

  try {
    const fields = []
    const values = []
    let i = 1

    if (name !== undefined) {
      fields.push(`name = $${i++}`)
      values.push(name)
    }
    if (className !== undefined) {
      fields.push(`class_name = $${i++}`)
      values.push(className || null)
    }
    if (phone !== undefined) {
      fields.push(`phone = $${i++}`)
      values.push(phone || null)
    }
    if (password) {
      fields.push(`password = $${i++}`)
      values.push(await bcrypt.hash(password, 10))
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 })
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const res = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, email, class_name, phone`,
      values
    )

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Не найден' }, { status: 404 })
    }

    return NextResponse.json({ success: true, student: res.rows[0] })
  } catch (err) {
    console.error('Update student error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/librarian/students/[id]
 * Удалить ученика. Только если у него нет активных займов.
 */
export async function DELETE(req, { params }) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params

  try {
    const active = await pool.query(
      `SELECT id FROM borrows WHERE user_id = $1 AND status IN ('active','overdue','submitted')`,
      [id]
    )
    if (active.rows[0]) {
      return NextResponse.json(
        { error: 'У ученика есть активные книги. Сначала примите возвраты.' },
        { status: 400 }
      )
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete student error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}