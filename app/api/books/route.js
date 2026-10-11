import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { appendBookToSheet } from '../../../lib/google-sheets'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  await ensureSchema()

  // Архивные книги не показываем в каталоге
  const LIVE = 'archived_at IS NULL'

  // 1. Все жанры для фильтра
  if (searchParams.get('allGenres') === 'true') {
    const result = await pool.query(
      `SELECT DISTINCT genre FROM books
       WHERE ${LIVE} AND genre IS NOT NULL AND genre != ''
       ORDER BY genre ASC`
    )
    return NextResponse.json(result.rows.map(r => r.genre))
  }

  // 2. Все книги для админки
  if (searchParams.get('allBooks') === 'true') {
    const result = await pool.query(
      `SELECT * FROM books WHERE ${LIVE} ORDER BY created_at DESC`
    )
    return NextResponse.json(result.rows)
  }

  const search = (searchParams.get('q') || '').trim()
  const countOnly = searchParams.get('countOnly') === 'true'
  const page = parseInt(searchParams.get('page')) || 1
  const limit = 12
  const offset = (page - 1) * limit
  const genre = searchParams.get('genre')
  const isFiltered = genre && genre !== 'Все'

  // Поиск по названию / автору
  const buildSearch = (params) => {
    if (!search) return ''
    params.push(`%${search}%`)
    return ` AND (title ILIKE $${params.length} OR author ILIKE $${params.length})`
  }

  if (countOnly) {
    const params = []
    let sql = `SELECT COUNT(*) AS total FROM books WHERE ${LIVE}`

    if (isFiltered) {
      params.push(genre, genre + ' / %', '% / ' + genre, '% / ' + genre + ' / %')
      sql += ` AND (genre = $1 OR genre LIKE $2 OR genre LIKE $3 OR genre LIKE $4)`
    }
    sql += buildSearch(params)

    const result = await pool.query(sql, params)
    return NextResponse.json({ total: parseInt(result.rows[0].total) })
  }

  const params = []
  let limitIdx
  let offsetIdx

  if (isFiltered) {
    params.push(genre, genre + ' / %', '% / ' + genre, '% / ' + genre + ' / %')
    let sql = `SELECT * FROM books
       WHERE ${LIVE}
         AND (genre = $1 OR genre LIKE $2 OR genre LIKE $3 OR genre LIKE $4)`
    sql += buildSearch(params)
    params.push(limit, offset)
    limitIdx = params.length - 1
    offsetIdx = params.length
    const result = await pool.query(
      `${sql} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    )
    return NextResponse.json(result.rows)
  }

  let sql = `SELECT * FROM books WHERE ${LIVE}`
  sql += buildSearch(params)
  params.push(limit, offset)
  limitIdx = params.length - 1
  offsetIdx = params.length
  const result = await pool.query(
    `${sql} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  )
  return NextResponse.json(result.rows)
}

export async function POST(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const {
    title, author, genre, year, description,
    cover_url, file_url, total_copies, isbn, pages, tags,
    language, difficulty
  } = await req.json()

  if (!title || !author) {
    return NextResponse.json(
      { error: 'Название и автор обязательны' },
      { status: 400 }
    )
  }

  const copies = parseInt(total_copies) || 1

  // Собираем теги (жанр + язык + сложность)
  const tagParts = []
  if (genre) tagParts.push(genre)
  if (language) tagParts.push(language)
  if (difficulty) tagParts.push(difficulty)
  const tagsStr = tagParts.join(', ') || null

  try {
    const result = await pool.query(
      `INSERT INTO books
        (title, author, genre, year, description, cover_url, file_url,
         total_copies, available_copies, isbn, pages, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11)
       RETURNING *`,
      [
        title, author, genre || 'Без раздела',
        year || null, description || null,
        cover_url || null, file_url || null,
        copies, isbn || null,
        pages ? parseInt(pages) : null, tagsStr
      ]
    )

    const newBook = result.rows[0]

    // Также добавляем в Google Sheets (если credentials настроены)
    const sheetsResult = await appendBookToSheet({
      title, author, genre, year, description,
      cover_url, file_url, total_copies: copies,
      isbn, pages, tags: tagsStr
    })

    return NextResponse.json({
      success: true,
      book: newBook,
      sheets_synced: sheetsResult.success,
      sheets_error: sheetsResult.success ? undefined : sheetsResult.error
    })
  } catch (err) {
    console.error('Create book error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}