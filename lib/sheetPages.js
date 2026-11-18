/**
 * Разовая загрузка страниц из таблицы команды (lib/data/bookPagesSheet.js).
 * Запускается сама после миграций, один раз (метка в app_meta).
 * Книги сопоставляются по названию: без регистра, знаков, с заменой казахских букв
 * на близкие русские и с допуском на опечатки. Неоднозначные — пропускаем и пишем в лог.
 * Коэффициент — по словам на странице (правило сайта), из таблицы — только если слов нет.
 */
import { SHEET_PAGES } from './data/bookPagesSheet'
import { SHEET_FIXES } from './data/bookPagesFixes'
import { coefForWords, cleanCoef } from './points'
import { autoTopupVolume } from './autoTopup'

const KEY = 'data_sheet_pages_2026_11_18'

const KZ = { 'ә': 'а', 'і': 'и', 'i': 'и', 'ң': 'н', 'ғ': 'г', 'ү': 'у', 'ұ': 'у', 'қ': 'к', 'ө': 'о', 'һ': 'х', 'ё': 'е', 'й': 'и' }
export function normTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[әіiңғүұқөһёй]/g, ch => KZ[ch] || ch)
    .replace(/[^a-zа-я0-9]+/g, '')
}

function lev(a, b) {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

function score(a, b) {
  if (a === b) return 1
  const ratio = 1 - lev(a, b) / Math.max(a.length, b.length)
  // Название в каталоге может быть длиннее («Алхимик» ↔ «Алхимик роман»)
  const [s, l] = a.length < b.length ? [a, b] : [b, a]
  const contain = s.length >= 6 && l.includes(s) ? 0.8 + 0.2 * (s.length / l.length) : 0
  return Math.max(ratio, contain)
}

export async function applySheetPagesOnce(pool) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(7310444)')
    await client.query(`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
    const done = await client.query(`SELECT 1 FROM app_meta WHERE key = $1`, [KEY])
    if (done.rows[0]) { await client.query('COMMIT'); return }

    const books = (await client.query(
      `SELECT id, title FROM books WHERE archived_at IS NULL`)).rows.map(b => ({ ...b, n: normTitle(b.title) }))

    // Строки таблицы с одинаковым названием (разные издания) — неоднозначны
    const byNorm = new Map()
    for (const row of SHEET_PAGES) {
      const n = normTitle(row[0])
      if (!n) continue
      if (!byNorm.has(n)) byNorm.set(n, [])
      byNorm.get(n).push(row)
    }

    const used = new Set()
    const updated = []
    const unmatched = []
    const ambiguous = []
    for (const [n, rows] of byNorm) {
      const exact = books.filter(b => b.n === n)
      const ranked = exact.length
        ? exact.map(b => ({ b, s: 1 }))
        : n.length < 8 ? [] : books
          .filter(b => b.n.length >= 6 && (Math.abs(b.n.length - n.length) <= Math.max(b.n.length, n.length) * 0.2 || b.n.includes(n) || n.includes(b.n)))
          .map(b => ({ b, s: score(n, b.n) }))
          .filter(x => x.s >= 0.85)
          .sort((x, y) => y.s - x.s)
      if (!ranked.length) { unmatched.push(rows[0][0]); continue }
      const best = ranked[0].s
      const top = ranked.filter(x => x.s >= best - 0.03)
      // одна строка таблицы ↔ одна книга; несколько изданий — только если данные совпадают
      const sameData = rows.every(r => r[1] === rows[0][1] && r[2] === rows[0][2])
      if (top.length > 1 || (rows.length > 1 && !sameData)) {
        ambiguous.push(`${rows[0][0]} (в таблице ${rows.length}, в каталоге ${top.length})`)
        continue
      }
      const book = top[0].b
      if (used.has(book.id)) { ambiguous.push(`${rows[0][0]} (совпала с уже занятой книгой «${book.title}»)`); continue }
      used.add(book.id)
      const [, words, pages, sheetCoef] = rows[0]
      const coef = coefForWords(words) ?? cleanCoef(sheetCoef) ?? 1
      await client.query(
        `UPDATE books SET pages = $2, words_per_page = $3, page_coef = $4, updated_at = NOW() WHERE id = $1`,
        [book.id, pages, words || null, coef])
      updated.push(book.id)
    }

    const awarded = updated.length ? await autoTopupVolume(client, { bookIds: updated }) : 0
    await client.query(
      `INSERT INTO app_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [KEY, JSON.stringify({ at: new Date().toISOString(), updated: updated.length, unmatched, ambiguous, awarded })])
    await client.query('COMMIT')
    console.log(`✅ [sheet] Страницы из таблицы: обновлено книг ${updated.length}, доначислено ${awarded}`)
    if (unmatched.length) console.log(`⚠️ [sheet] Не нашли в каталоге (${unmatched.length}): ${unmatched.join(' | ')}`)
    if (ambiguous.length) console.log(`⚠️ [sheet] Неоднозначно, пропущено (${ambiguous.length}): ${ambiguous.join(' | ')}`)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('❌ [sheet] Загрузка страниц не прошла:', err.message)
  } finally {
    client.release()
  }
}

/** Точечные исправления по номеру книги (lib/data/bookPagesFixes.js) — тоже один раз. */
const FIX_KEY = 'data_sheet_pages_fix_2026_11_18'
export async function applySheetFixesOnce(pool) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(7310444)')
    const done = await client.query(`SELECT 1 FROM app_meta WHERE key = $1`, [FIX_KEY])
    if (done.rows[0]) { await client.query('COMMIT'); return }
    const ids = []
    for (const [id, pages, words] of SHEET_FIXES) {
      const r = await client.query(
        `UPDATE books SET pages = $2, words_per_page = $3, page_coef = $4, updated_at = NOW()
          WHERE id = $1 AND archived_at IS NULL RETURNING id`,
        [id, pages, words, coefForWords(words) ?? 1])
      if (r.rows[0]) ids.push(id)
    }
    const awarded = ids.length ? await autoTopupVolume(client, { bookIds: ids }) : 0
    await client.query(
      `INSERT INTO app_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [FIX_KEY, JSON.stringify({ at: new Date().toISOString(), updated: ids.length, awarded })])
    await client.query('COMMIT')
    console.log(`✅ [sheet] Исправления по каталогу: обновлено книг ${ids.length}, доначислено ${awarded}`)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('❌ [sheet] Исправления не прошли:', err.message)
  } finally {
    client.release()
  }
}
