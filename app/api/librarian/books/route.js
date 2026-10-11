import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/librarian/books
 * Реестр всего фонда библиотеки — главный экран библиотекаря.
 *
 * Query:
 *   q=...          поиск по названию/автору/жанру
 *   genre=...      фильтр по жанру (с учётом иерархии «Жанр / Поджанр»)
 *   status=all     все книги в каталоге
 *   status=avail   есть свободные экземпляры
 *   status=hand    все экземпляры на руках
 *   status=archive архивные
 *   sort=title|author|genre|hand   сортировка
 *   page=1&limit=25
 *
 * В ответе по каждой книге: сколько экземпляров на руках и у кого именно.
 */
export async function GET(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const genre = searchParams.get('genre')?.trim()
  const status = searchParams.get('status') || 'all'
  const sort = searchParams.get('sort') || 'title'
  const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 25))

  const params = []
  let i = 1
  const conditions = []

  if (status === 'archive') {
    conditions.push('bk.archived_at IS NOT NULL')
  } else {
    conditions.push('bk.archived_at IS NULL')
    if (status === 'avail') conditions.push('bk.available_copies > 0')
    if (status === 'hand') conditions.push('bk.available_copies < bk.total_copies')
  }

  if (q) {
    params.push(`%${q}%`)
    const p = `$${i++}`
    conditions.push(`(bk.title ILIKE ${p} OR bk.author ILIKE ${p} OR bk.tags ILIKE ${p})`)
  }

  if (genre && genre !== 'Все') {
    params.push(genre, genre + ' / %', '% / ' + genre, '% / ' + genre + ' / %')
    const a = `$${i++}`, b = `$${i++}`, c = `$${i++}`, d = `$${i++}`
    conditions.push(
      `(bk.genre = ${a} OR bk.genre LIKE ${b} OR bk.genre LIKE ${c} OR bk.genre LIKE ${d})`
    )
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const orderBy = {
    title: 'bk.title ASC',
    author: 'bk.author ASC',
    genre: 'bk.genre ASC NULLS LAST, bk.title ASC',
    hand: '(bk.total_copies - bk.available_copies) DESC, bk.title ASC',
    newest: 'bk.created_at DESC'
  }[sort] || 'bk.title ASC'

  // Кто сейчас держит книгу (агрегат по активным займам)
  const holders = `
    LEFT JOIN (
      SELECT b.book_id,
             COUNT(*)::int AS holders_count,
             COALESCE(
               STRING_AGG(u.name || COALESCE(' (' || u.class_name || ')', ''), ', ' ORDER BY b.due_date NULLS LAST),
               ''
             ) AS holders
      FROM borrows b
      JOIN users u ON u.id = b.user_id
      WHERE b.status = 'active'
      GROUP BY b.book_id
    ) h ON h.book_id = bk.id
  `

  try {
    await ensureSchema()

    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM books bk ${where}`,
      params
    )
    const total = totalRes.rows[0].total

    params.push(limit, (page - 1) * limit)
    const limitIdx = `$${params.length - 1}`
    const offsetIdx = `$${params.length}`

    const res = await pool.query(
      `SELECT bk.id, bk.title, bk.author, bk.genre, bk.year, bk.cover_url,
              bk.tags, bk.isbn, bk.pages, bk.total_copies, bk.available_copies,
              bk.archived_at, bk.created_at, bk.updated_at,
              COALESCE(h.holders_count, 0) AS holders_count,
              COALESCE(h.holders, '') AS holders
       FROM books bk
       ${holders}
       ${where}
       ORDER BY ${orderBy}
       LIMIT ${limitIdx} OFFSET ${offsetIdx}`,
      params
    )

    // Список жанров для фильтра
    const genresRes = await pool.query(
      `SELECT DISTINCT genre FROM books
       WHERE archived_at IS NULL AND genre IS NOT NULL AND genre != ''
       ORDER BY genre ASC`
    )

    return NextResponse.json({
      books: res.rows,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      genres: genresRes.rows.map(r => r.genre)
    })
  } catch (err) {
    console.error('Librarian books error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}