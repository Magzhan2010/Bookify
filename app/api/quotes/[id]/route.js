import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { validateQuote, publicQuote } from '../../../../lib/quotes'

/**
 * PATCH /api/quotes/[id] — изменить цитату (библиотекарь).
 * Поле image: строка — новое фото, null — убрать фото, не передано — оставить как было.
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const { id } = await params

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const keepImage = !('image' in body)
  const { value, error } = validateQuote(keepImage ? { ...body, image: undefined } : body)
  if (error) return NextResponse.json({ error }, { status: 400 })

  try {
    const res = await pool.query(
      `UPDATE quotes
          SET text = $1, author_name = $2, author_info = $3, book_title = $4, book_id = $5,
              image = CASE WHEN $6::boolean THEN image ELSE $7 END,
              updated_at = NOW()
        WHERE id = $8
        RETURNING id, text, author_name, author_info, book_title, book_id, image, created_at, updated_at`,
      [value.text, value.author_name, value.author_info, value.book_title, value.book_id, keepImage, value.image, id]
    )
    if (!res.rows[0]) return NextResponse.json({ error: 'Цитата не найдена' }, { status: 404 })
    return NextResponse.json({ success: true, quote: publicQuote(res.rows[0]) })
  } catch (err) {
    console.error('Quote update error:', err)
    return NextResponse.json({ error: 'Не удалось сохранить' }, { status: 500 })
  }
}

/** DELETE /api/quotes/[id] — удалить цитату (библиотекарь). */
export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const { id } = await params
  try {
    const res = await pool.query('DELETE FROM quotes WHERE id = $1 RETURNING id', [id])
    if (!res.rows[0]) return NextResponse.json({ error: 'Цитата не найдена' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Quote delete error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
