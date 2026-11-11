import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/**
 * Число страниц у книг списком (через Google Sheets).
 * GET  ?missing=1 — CSV: ID, Название, Автор, Страниц (только книги без страниц — с missing=1)
 * POST { rows: [{ id?, title?, author?, pages }], apply } — проверка или сохранение.
 *   Книга ищется по ID, иначе по названию (+ автор, если названий несколько).
 */
const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"'“”„.,:;!?()\-–—]/g, ' ').replace(/\s+/g, ' ').trim()
const csvCell = v => {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const missing = new URL(req.url).searchParams.get('missing') === '1'
  try {
    const r = await pool.query(
      `SELECT id, title, author, pages FROM books
        WHERE archived_at IS NULL ${missing ? 'AND (pages IS NULL OR pages = 0)' : ''}
        ORDER BY title, id`)
      .catch(() => pool.query(`SELECT id, title, author, pages FROM books ${missing ? 'WHERE pages IS NULL OR pages = 0' : ''} ORDER BY title, id`))
    const lines = [['ID', 'Название', 'Автор', 'Страниц'], ...r.rows.map(b => [b.id, b.title, b.author, b.pages || ''])]
    const csv = '﻿' + lines.map(l => l.map(csvCell).join(',')).join('\r\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bookify-pages${missing ? '-missing' : ''}.csv"`
      }
    })
  } catch (err) {
    console.error('[books/pages GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const rows = Array.isArray(body?.rows) ? body.rows.slice(0, 3000) : []
  if (!rows.length) return NextResponse.json({ error: 'Список пуст' }, { status: 400 })
  const apply = body?.apply === true

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const books = (await client.query(`SELECT id, title, author, pages FROM books`)).rows
    const byId = new Map(books.map(b => [b.id, b]))
    const byTitle = new Map()
    for (const b of books) {
      const k = norm(b.title)
      if (!byTitle.has(k)) byTitle.set(k, [])
      byTitle.get(k).push(b)
    }
    const result = []
    const done = new Set()
    for (const r of rows) {
      const pages = parseInt(String(r?.pages ?? '').replace(/\D/g, ''))
      const label = r?.title || (r?.id ? `ID ${r.id}` : '—')
      if (!pages) { result.push({ title: label, status: 'empty' }); continue }
      if (pages < 5 || pages > 5000) { result.push({ title: label, pages, status: 'invalid' }); continue }
      let book = r?.id ? byId.get(parseInt(r.id)) : null
      if (!book && r?.title) {
        let found = byTitle.get(norm(r.title)) || []
        if (found.length > 1 && r.author) found = found.filter(b => norm(b.author) === norm(r.author))
        if (found.length > 1) { result.push({ title: label, pages, status: 'ambiguous' }); continue }
        book = found[0]
      }
      if (!book) { result.push({ title: label, pages, status: 'not_found' }); continue }
      if (done.has(book.id)) { result.push({ title: book.title, pages, status: 'duplicate' }); continue }
      done.add(book.id)
      if (parseInt(book.pages) === pages) { result.push({ id: book.id, title: book.title, pages, status: 'same' }); continue }
      if (apply) await client.query(`UPDATE books SET pages = $1, updated_at = NOW() WHERE id = $2`, [pages, book.id])
      result.push({ id: book.id, title: book.title, author: book.author, old: book.pages || null, pages, status: book.pages ? 'changed' : 'added' })
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK')
    return NextResponse.json({ applied: apply, result })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[books/pages POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
