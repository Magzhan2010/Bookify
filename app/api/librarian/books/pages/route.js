import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { cleanCoef, coefForWords, scoredPages } from '../../../../../lib/points'

/**
 * Число страниц у книг списком (через Google Sheets).
 * GET  ?missing=1 — CSV: ID, Название, Автор, Страниц, Слов на странице, Коэффициент (с missing=1 — только книги без страниц)
 * POST { rows: [{ id?, title?, author?, pages, coef?, words? }], apply } — проверка или сохранение.
 *   Книга ищется по ID, иначе по названию (+ автор, если названий несколько),
 *   а если точного совпадения нет — по похожему названию (опечатки, пробелы, начало названия).
 *   Коэффициент: из колонки «Коэффициент», иначе по числу слов на странице.
 */
const tight = s => norm(s).replace(/ /g, '')
// Цифры должны совпадать: «Накопительный эффект 2» — не то же, что «Накопительный эффект»
const sameNums = (a, b) => a.replace(/[^0-9]/g, '') === b.replace(/[^0-9]/g, '')
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length]
}
/** Похожая книга: одна-единственная, иначе null. */
function fuzzy(books, title) {
  const t = tight(title)
  if (t.length < 5) return null
  const one = list => (list.length === 1 ? list[0] : null)
  return one(books.filter(b => tight(b.title) === t))
    || (t.length >= 8 ? one(books.filter(b => { const k = tight(b.title); return k.startsWith(t) })) : null)
    || (t.length >= 8 ? one(books.filter(b => { const k = tight(b.title); return sameNums(k, t) && lev(k, t) <= (t.length >= 14 ? 3 : 2) })) : null)
}
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
    await ensureSchema()
    const r = await pool.query(
      `SELECT id, title, author, pages, words_per_page, page_coef FROM books
        WHERE archived_at IS NULL ${missing ? 'AND (pages IS NULL OR pages = 0)' : ''}
        ORDER BY title, id`)
      .catch(() => pool.query(`SELECT id, title, author, pages FROM books ${missing ? 'WHERE pages IS NULL OR pages = 0' : ''} ORDER BY title, id`))
    const lines = [['ID', 'Название', 'Автор', 'Страниц', 'Слов на странице', 'Коэффициент'], ...r.rows.map(b => [b.id, b.title, b.author, b.pages || '', b.words_per_page || '', b.page_coef != null ? Number(b.page_coef) : ''])]
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

  await ensureSchema()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const books = (await client.query(`SELECT id, title, author, pages, page_coef, words_per_page FROM books WHERE owner_id IS NULL`)).rows
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
      let fuzzyHit = false
      let book = r?.id ? byId.get(parseInt(r.id)) : null
      if (!book && r?.title) {
        let found = byTitle.get(norm(r.title)) || []
        if (found.length > 1 && r.author) found = found.filter(b => norm(b.author) === norm(r.author))
        if (found.length > 1) { result.push({ title: label, pages, status: 'ambiguous' }); continue }
        book = found[0]
        if (!book) { book = fuzzy(books, r.title); if (book) fuzzyHit = true }
      }
      if (!book) { result.push({ title: label, pages, status: 'not_found' }); continue }
      if (done.has(book.id)) { result.push({ title: book.title, pages, status: 'duplicate' }); continue }
      done.add(book.id)
      const words = Math.round(parseFloat(String(r?.words ?? '').replace(',', '.'))) || null
      const coef = cleanCoef(r?.coef) ?? coefForWords(words) ?? (book.page_coef != null ? Number(book.page_coef) : null)
      const oldCoef = book.page_coef != null ? Number(book.page_coef) : null
      const info = { id: book.id, title: book.title, author: book.author, asked: fuzzyHit ? r.title : undefined, pages, coef, scored: scoredPages(pages, coef) }
      if (parseInt(book.pages) === pages && oldCoef === coef) { result.push({ ...info, status: 'same' }); continue }
      if (apply) {
        await client.query(`UPDATE books SET pages = $1, page_coef = $2, words_per_page = COALESCE($3, words_per_page), updated_at = NOW() WHERE id = $4`,
          [pages, coef, words, book.id])
      }
      result.push({ ...info, old: book.pages || null, oldCoef, status: book.pages ? 'changed' : 'added' })
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
