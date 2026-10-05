import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

export async function GET(req) {
  const { searchParams } = new URL(req.url)

  // 1. Все жанры для фильтра
  if (searchParams.get('allGenres') === 'true') {
    const result = await pool.query(
      `SELECT DISTINCT genre FROM books
       WHERE genre IS NOT NULL AND genre != ''
       ORDER BY genre ASC`
    )
    return NextResponse.json(result.rows.map(r => r.genre))
  }

  // 2. Все книги для админки
  if (searchParams.get('allBooks') === 'true') {
    const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC')
    return NextResponse.json(result.rows)
  }

  const countOnly = searchParams.get('countOnly') === 'true'
  const page = parseInt(searchParams.get('page')) || 1
  const limit = 12
  const offset = (page - 1) * limit
  const genre = searchParams.get('genre')
  const isFiltered = genre && genre !== 'Все'

  if (countOnly) {
    if (isFiltered) {
      const result = await pool.query(
        'SELECT COUNT(*) AS total FROM books WHERE genre = $1',
        [genre]
      )
      return NextResponse.json({ total: parseInt(result.rows[0].total) })
    }
    const result = await pool.query('SELECT COUNT(*) AS total FROM books')
    return NextResponse.json({ total: parseInt(result.rows[0].total) })
  }

  if (isFiltered) {
    const result = await pool.query(
      'SELECT * FROM books WHERE genre = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [genre, limit, offset]
    )
    return NextResponse.json(result.rows)
  }
  const result = await pool.query(
    'SELECT * FROM books ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )
  return NextResponse.json(result.rows)
}

export async function POST(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const {
    title, author, genre, year, description,
    cover_url, file_url, total_copies, isbn, pages, tags
  } = await req.json()

  if (!title || !author) {
    return NextResponse.json(
      { error: 'Название и автор обязательны' },
      { status: 400 }
    )
  }

  const copies = parseInt(total_copies) || 1

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
        pages ? parseInt(pages) : null, tags || null
      ]
    )
    return NextResponse.json({ success: true, book: result.rows[0] })
  } catch (err) {
    console.error('Create book error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}