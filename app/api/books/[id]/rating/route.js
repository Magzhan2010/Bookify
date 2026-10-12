import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../../../lib/db'
import { requireAuth, getTokenPayload } from '../../../../../lib/auth'

/**
 * GET  /api/books/[id]/rating — средний рейтинг книги и моя оценка
 * POST /api/books/[id]/rating — поставить оценку (тело: { value: 1..5 })
 *
 * value: 0 или пусто — снять свою оценку.
 * Оценить может любой авторизованный пользователь, в том числе библиотекарь.
 */
export async function GET(req, { params }) {
  const { id } = await params

  try {
    await ensureSchema()
    const res = await pool.query(
      `SELECT ROUND(AVG(value)::numeric, 2) AS avg_value,
              COUNT(*)::int AS count
       FROM book_ratings WHERE book_id = $1`,
      [id]
    )

    const payload = getTokenPayload(req)
    let myValue = null
    if (payload) {
      const mine = await pool.query(
        'SELECT value FROM book_ratings WHERE book_id = $1 AND user_id = $2',
        [id, payload.id]
      )
      myValue = mine.rows[0]?.value ?? null
    }

    return NextResponse.json({
      avg_value: res.rows[0].avg_value ? parseFloat(res.rows[0].avg_value) : 0,
      count: res.rows[0].count || 0,
      my_value: myValue
    })
  } catch (err) {
    console.error('Get rating error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const { id } = await params

  try {
    const { value } = await req.json()
    const num = parseInt(value)

    // 0 или пусто — снять оценку
    if (value === 0 || value === null || value === '' || Number.isNaN(num) || num === 0) {
      await pool.query(
        'DELETE FROM book_ratings WHERE book_id = $1 AND user_id = $2',
        [id, guard.payload.id]
      )
      const stat = await pool.query(
        `SELECT ROUND(AVG(value)::numeric, 2) AS avg_value, COUNT(*)::int AS count
         FROM book_ratings WHERE book_id = $1`,
        [id]
      )
      return NextResponse.json({
        success: true,
        my_value: null,
        avg_value: stat.rows[0].avg_value ? parseFloat(stat.rows[0].avg_value) : 0,
        count: stat.rows[0].count
      })
    }

    if (num < 1 || num > 5) {
      return NextResponse.json(
        { error: 'Оценка должна быть от 1 до 5' },
        { status: 400 }
      )
    }

    // Книга должна существовать и быть не в архиве
    const book = await pool.query(
      'SELECT id, title, archived_at FROM books WHERE id = $1',
      [id]
    )
    if (!book.rows[0]) {
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    }
    if (book.rows[0].archived_at) {
      return NextResponse.json({ error: 'Книга в архиве' }, { status: 400 })
    }

    await pool.query(
      `INSERT INTO book_ratings (user_id, book_id, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, book_id)
       DO UPDATE SET value = $3, updated_at = NOW()`,
      [guard.payload.id, id, num]
    )

    const stat = await pool.query(
      `SELECT ROUND(AVG(value)::numeric, 2) AS avg_value, COUNT(*)::int AS count
       FROM book_ratings WHERE book_id = $1`,
      [id]
    )

    return NextResponse.json({
      success: true,
      my_value: num,
      avg_value: stat.rows[0].avg_value ? parseFloat(stat.rows[0].avg_value) : 0,
      count: stat.rows[0].count
    })
  } catch (err) {
    console.error('Set rating error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}