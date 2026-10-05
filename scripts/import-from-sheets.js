require('dotenv').config({ path: __dirname + '/../.env.local' })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  const dataPath = path.join(__dirname, 'books-data.json')
  const books = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

  const existing = await client.query('SELECT LOWER(title) AS title, LOWER(author) AS author FROM books')
  const existingKeys = new Set(existing.rows.map(r => r.title + '||' + r.author))
  const newBooks = books.filter(b => !existingKeys.has(b.title.toLowerCase() + '||' + b.author.toLowerCase()))

  console.log(`📦 Будет добавлено: ${newBooks.length}`)

  const BATCH = 50
  let added = 0

  for (let i = 0; i < newBooks.length; i += BATCH) {
    const batch = newBooks.slice(i, i + BATCH)

    const placeholders = []
    const params = []
    let p = 1
    for (const b of batch) {
      // Каждая книга: 12 значений
      placeholders.push(`($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`)
      const tagParts = []
      if (b.tags) tagParts.push(b.tags)
      if (b.language) tagParts.push(b.language)
      if (b.difficulty) tagParts.push(b.difficulty)
      params.push(
        b.title,                                 // 1: title
        b.author,                                // 2: author
        b.genre || 'Без раздела',                // 3: genre
        b.year || null,                          // 4: year
        b.description || null,                    // 5: description
        b.cover_url || null,                     // 6: cover_url
        b.file_url || null,                      // 7: file_url
        b.total_copies || 1,                     // 8: total_copies
        b.total_copies || 1,                     // 9: available_copies
        null,                                    // 10: isbn
        null,                                    // 11: pages
        tagParts.join(', ') || null              // 12: tags
      )
    }

    const sql = `
      INSERT INTO books
        (title, author, genre, year, description, cover_url, file_url,
         total_copies, available_copies, isbn, pages, tags)
      VALUES ${placeholders.join(',')}
      ON CONFLICT DO NOTHING
    `

    try {
      const res = await client.query(sql, params)
      added += res.rowCount
      console.log(`  ${i + batch.length} — +${res.rowCount}`)
    } catch (err) {
      console.log(`  ❌ ${i}: ${err.message}`)
      // Дебаг — показать первую запись и SQL
      console.log('     First params:', params.slice(0, 12))
      break
    }
  }

  console.log(`\n✅ Добавлено: ${added}`)
  const total = await client.query('SELECT COUNT(*) FROM books')
  console.log(`📚 Всего в БД: ${total.rows[0].count}`)
  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })