import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { validateQuote, publicQuote } from '../../../lib/quotes'

/**
 * GET /api/quotes?limit=N — цитаты для всех (в том числе для лендинга, без входа).
 * Картинки отдаются отдельным адресом, чтобы список был лёгким.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit')) || 100, 1), 200)
  try {
    await ensureSchema()
    const res = await pool.query(
      `SELECT q.id, q.text, q.author_name, q.author_info, q.book_title, q.book_id,
              q.image, q.created_at, q.updated_at, b.cover_url AS book_cover
         FROM quotes q
         LEFT JOIN books b ON b.id = q.book_id
        WHERE q.active
        ORDER BY q.created_at DESC
        LIMIT $1`,
      [limit]
    )
    return NextResponse.json(res.rows.map(publicQuote), {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    })
  } catch (err) {
    console.error('Quotes list error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * POST /api/quotes — библиотекарь добавляет цитату.
 * Body: { text, author_name, author_info?, book_title?, book_id?, image? }
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const { value, error } = validateQuote(body)
  if (error) return NextResponse.json({ error }, { status: 400 })

  try {
    const res = await pool.query(
      `INSERT INTO quotes (text, author_name, author_info, book_title, book_id, image, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, text, author_name, author_info, book_title, book_id, image, created_at, updated_at`,
      [value.text, value.author_name, value.author_info, value.book_title, value.book_id, value.image, guard.payload.id]
    )
    return NextResponse.json({ success: true, quote: publicQuote(res.rows[0]) })
  } catch (err) {
    console.error('Quote create error:', err)
    return NextResponse.json({ error: 'Не удалось сохранить цитату' }, { status: 500 })
  }
}
