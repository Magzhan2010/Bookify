import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'

/**
 * GET /api/genres/[...path]
 *
 * Структура URL:
 *   /api/genres/sub                  → все корневые категории
 *   /api/genres/sub/Психология       → подкатегории Психологии
 *   /api/genres/sub/Психология/Саморазвитие
 *   /api/genres/books                → 404 (нет категории)
 *   /api/genres/books/Психология     → книги по жанру "Психология"
 *   /api/genres/books/Психология/Саморазвитие
 *
 * Первый сегмент = тип ("sub" или "books"), остальные = путь жанра.
 */
export async function GET(req, { params }) {
  try {
    const { path } = await params
    const [type, ...genreSegments] = path

    if (type !== 'sub' && type !== 'books') {
      return NextResponse.json({ error: 'Неизвестный тип' }, { status: 400 })
    }

    if (type === 'books' && genreSegments.length === 0) {
      return NextResponse.json({ error: 'Укажите жанр' }, { status: 400 })
    }

    // =============== BOOKS ===============
    if (type === 'books') {
      const genrePath = genreSegments.join(' / ')
      const { searchParams } = new URL(req.url)
      const page = parseInt(searchParams.get('page')) || 1
      const limit = parseInt(searchParams.get('limit')) || 12
      const offset = (page - 1) * limit

      const booksRes = await pool.query(
        `SELECT * FROM books
         WHERE genre = $1 OR genre LIKE $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [genrePath, genrePath + ' / %', limit, offset]
      )

      const totalRes = await pool.query(
        `SELECT COUNT(*) AS total FROM books
         WHERE genre = $1 OR genre LIKE $2`,
        [genrePath, genrePath + ' / %']
      )

      return NextResponse.json({
        genre: genrePath,
        books: booksRes.rows,
        total: parseInt(totalRes.rows[0].total),
        page,
        hasMore: booksRes.rows.length === limit
      })
    }

    // =============== SUB (categories) ===============
    const targetPath = genreSegments.join(' / ')

    const result = await pool.query(`
      SELECT genre, COUNT(*) AS count
      FROM books
      WHERE genre IS NOT NULL AND genre != ''
      GROUP BY genre
      ORDER BY genre
    `)

    const genresMap = new Map()
    result.rows.forEach(r => {
      genresMap.set(r.genre, parseInt(r.count))
    })

    // Строим дерево
    const tree = {}
    for (const genre of Array.from(genresMap.keys())) {
      const parts = genre.split('/').map(s => s.trim()).filter(Boolean)
      let node = tree
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (!node[part]) node[part] = { _count: 0, _fullPath: parts.slice(0, i + 1).join(' / ') }
        node = node[part]
      }
      node._count = genresMap.get(genre)
      node._fullPath = parts.join(' / ')
    }

    function getLevel(node, targetPath) {
      if (!targetPath) {
        const level = []
        for (const [name, sub] of Object.entries(node)) {
          if (name.startsWith('_')) continue
          level.push({
            name,
            fullPath: sub._fullPath,
            bookCount: sub._count || 0,
            hasChildren: Object.keys(sub).filter(k => !k.startsWith('_')).length > 0
          })
        }
        return level
      }
      const parts = targetPath.split('/').map(s => s.trim())
      let current = node
      for (const part of parts) {
        if (!current[part]) return null
        current = current[part]
      }
      const level = []
      for (const [name, sub] of Object.entries(current)) {
        if (name.startsWith('_')) continue
        level.push({
          name,
          fullPath: sub._fullPath,
          bookCount: sub._count || 0,
          hasChildren: Object.keys(sub).filter(k => !k.startsWith('_')).length > 0
        })
      }
      return level
    }

    function aggregate(node) {
      let total = node._count || 0
      for (const [name, sub] of Object.entries(node)) {
        if (name.startsWith('_')) continue
        total += aggregate(sub)
      }
      return total
    }

    function getNode(node, targetPath) {
      if (!targetPath) return node
      const parts = targetPath.split('/').map(s => s.trim())
      let current = node
      for (const part of parts) {
        if (!current[part]) return null
        current = current[part]
      }
      return current
    }

    const level = getLevel(tree, targetPath) || []

    const result2 = level.map(c => {
      const childPath = targetPath ? targetPath + ' / ' + c.name : c.name
      const node = getNode(tree, childPath)
      return { ...c, totalCount: node ? aggregate(node) : c.bookCount }
    }).sort((a, b) => b.totalCount - a.totalCount)

    return NextResponse.json({
      path: targetPath,
      parts: targetPath ? targetPath.split(' / ') : [],
      categories: result2
    })
  } catch (err) {
    console.error('Genre API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}