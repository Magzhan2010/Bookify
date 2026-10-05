/**
 * Скачивает книги из Google Sheets (DLS Library) и сохраняет в JSON.
 * Запуск: node scripts/fetch-books.js
 *
 * Источник: https://docs.google.com/spreadsheets/d/1_CLj9flLRRmiyUZcJ4qckgGKxGnSsWnRLpQZXXN_3LM/
 */

const fs = require('fs')
const path = require('path')

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1_CLj9flLRRmiyUZcJ4qckgGKxGnSsWnRLpQZXXN_3LM/gviz/tq?tqx=out:csv&sheet=books'

function parseCsv(csv) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < csv.length) {
    const ch = csv[i]
    if (inQuotes) {
      if (ch === '"' && csv[i + 1] === '"') { field += '"'; i += 2 }
      else if (ch === '"') { inQuotes = false; i++ }
      else { field += ch; i++ }
    } else {
      if (ch === '"') { inQuotes = true; i++ }
      else if (ch === ',') { row.push(field); field = ''; i++ }
      else if (ch === '\n' || ch === '\r') {
        row.push(field); rows.push(row); row = []; field = ''
        if (csv[i + 1] === '\n') i++
        i++
      } else { field += ch; i++ }
    }
  }
  if (field || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

async function main() {
  console.log('⏳ Скачиваю из Google Sheets...')
  const r = await fetch(SHEET_URL)
  if (!r.ok) {
    console.error('❌ HTTP', r.status)
    process.exit(1)
  }
  const text = await r.text()
  console.log(`  ✓ получено ${(text.length / 1024).toFixed(1)}KB`)

  const rows = parseCsv(text)
  console.log(`  ✓ распарсено ${rows.length} строк`)

  const books = rows.slice(1)
    .filter(r => r[0] && r[0].match(/^\d+$/))
    .map(r => {
      const title = (r[2] || '').trim()
      if (!title) return null
      const note = (r[8] || '').trim()
      const cover = (r[9] || '').trim()
      const copies = parseInt(r[7]) || 1

      // Берём первую содержательную строку из примечания
      let description = ''
      if (note) {
        const lines = note.split('\n').map(l => l.trim()).filter(l => l && !l.includes('РЕКОМЕНДОВАНО'))
        description = lines[0] || ''
      }

      return {
        title,
        author: (r[3] || 'Неизвестен').trim(),
        genre: (r[4] || r[1] || 'Без раздела').trim(),
        year: null,
        description: description.slice(0, 500),
        cover_url: cover || null,
        file_url: null,
        total_copies: copies,
        isbn: null,
        pages: null,
        tags: (r[1] || '').trim(),
        language: (r[5] || '').trim(),
        difficulty: (r[6] || '').trim()
      }
    })
    .filter(Boolean)

  console.log(`  ✓ подготовлено ${books.length} книг`)

  const outPath = path.join(__dirname, 'books-data.json')
  fs.writeFileSync(outPath, JSON.stringify(books, null, 2))
  console.log(`  💾 Сохранено в ${outPath}`)

  // Статистика
  const genres = {}
  const languages = {}
  books.forEach(b => {
    genres[b.genre] = (genres[b.genre] || 0) + 1
    languages[b.language] = (languages[b.language] || 0) + 1
  })

  console.log('\n📊 Топ жанров:')
  Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([g, c]) => {
    console.log(`   ${g}: ${c}`)
  })

  console.log('\n🌐 Языки:')
  Object.entries(languages).sort((a, b) => b[1] - a[1]).forEach(([l, c]) => {
    console.log(`   ${l}: ${c}`)
  })

  console.log(`\n📚 С обложкой: ${books.filter(b => b.cover_url).length}/${books.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })