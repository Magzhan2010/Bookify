/** Таблица страниц книг из Google Sheets / CSV → строки для /api/librarian/books/pages. */

/** Разбор CSV/TSV с кавычками. */
export function parseTable(text) {
  const t = String(text || '').replace(/^﻿/, '')
  const sep = t.includes('\t') ? '\t' : (t.split('\n')[0].split(';').length > t.split('\n')[0].split(',').length ? ';' : ',')
  const rows = []; let row = []; let cell = ''; let q = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c
    } else if (c === '"' && cell === '') q = true
    else if (c === sep) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.map(r => r.map(x => x.trim())).filter(r => r.some(Boolean))
}

/**
 * Строки таблицы → [{ id?, title?, author?, pages, coef?, words? }] по заголовку или по числу колонок.
 * Понимает и таблицу команды: «№, Кітаптың атауы, 1 беттегі сөз саны, Жалпы бет саны, Коэффициент, real page».
 * «№» — это номер строки, а не ID книги, поэтому ID берём только из колонки «ID».
 */
export function toEntries(rows) {
  if (!rows.length) return []
  const h = rows[0].map(x => x.toLowerCase())
  const find = (re, skip = []) => h.findIndex((x, i) => !skip.includes(i) && re.test(x))
  const words = find(/сөз|слов|word/)
  const real = find(/real|засчит|итог/)
  const skip = [words, real].filter(i => i >= 0)
  let pages = find(/жалпы|всего|total/, skip)
  if (pages < 0) pages = find(/стр|бет|page/, skip)
  let idx = {
    id: find(/^id$/), title: find(/назв|title|кітап|книга|атау/), author: find(/автор|author/),
    pages, coef: find(/коэф|coef|коэфф/), words
  }
  let body = rows.slice(1)
  if (idx.pages < 0) {
    // Без заголовка: 4 колонки — ID, название, автор, страниц; 3 — название, автор, страниц; 2 — название, страниц
    body = rows
    const n = Math.max(...rows.map(r => r.length))
    idx = n >= 4 ? { id: 0, title: 1, author: 2, pages: 3 } : n === 3 ? { id: -1, title: 0, author: 1, pages: 2 } : { id: -1, title: 0, author: -1, pages: 1 }
    idx.coef = -1; idx.words = -1
  }
  const get = (r, i) => (i >= 0 ? r[i] || '' : '')
  return body.map(r => ({
    id: get(r, idx.id), title: get(r, idx.title), author: get(r, idx.author), pages: get(r, idx.pages),
    coef: get(r, idx.coef), words: get(r, idx.words)
  })).filter(e => (e.id || e.title) && e.pages)
}
