import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/books/comment?bookId=X
 * Все комментарии к книге с именами авторов.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get('bookId')
  if (!bookId) return NextResponse.json({ error: 'ID книги не указан' }, { status: 400 })

  try {
    const res = await pool.query(
      `SELECT c.id, c.content, c.is_pinned, c.created_at,
              u.name AS user_name, u.class_name AS user_class,
              u.id AS user_id
       FROM book_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.book_id = $1
       ORDER BY c.is_pinned DESC, c.created_at DESC`,
      [bookId]
    )
    return NextResponse.json(res.rows)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/books/comment
 * Ученик добавляет комментарий к книге.
 * Body: { bookId, content }
 */
export async function POST(req) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const { bookId, content } = await req.json()
  if (!bookId || !content?.trim()) {
    return NextResponse.json({ error: 'Заполни поле' }, { status: 400 })
  }
  if (content.length > 500) {
    return NextResponse.json({ error: 'Максимум 500 символов' }, { status: 400 })
  }

  try {
    const ins = await pool.query(
      `INSERT INTO book_comments (user_id, book_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [guard.payload.id, bookId, content.trim()]
    )

    // Возвращаем с user_name
    const result = await pool.query(
      `SELECT c.id, c.content, c.is_pinned, c.created_at,
              u.name AS user_name, u.class_name AS user_class,
              u.id AS user_id
       FROM book_comments c JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [ins.rows[0].id]
    )
    return NextResponse.json({ success: true, comment: result.rows[0] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/books/comment?commentId=X
 * Удаляет свой комментарий.
 */
export async function DELETE(req) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const commentId = searchParams.get('commentId')
  if (!commentId) return NextResponse.json({ error: 'ID не указан' }, { status: 400 })

  try {
    // Только свои (или librarian может удалять любые)
    if (guard.payload.role === 'librarian') {
      await pool.query('DELETE FROM book_comments WHERE id = $1', [commentId])
    } else {
      await pool.query(
        'DELETE FROM book_comments WHERE id = $1 AND user_id = $2',
        [commentId, guard.payload.id]
      )
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}