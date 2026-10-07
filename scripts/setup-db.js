/**
 * Применяет схему БД к PostgreSQL.
 * Запуск: node scripts/setup-db.js
 *
 * Что делает:
 * 1. Если таблицы старой версии — пересоздаёт их
 * 2. Применяет актуальный db/schema.sql
 *
 * Юзеров создаёт библиотекарь сама через /register.
 * Пароли захешированы bcrypt.
 */

require('dotenv').config({ path: __dirname + '/../.env.local' })
require('dotenv').config({ path: __dirname + '/../.env' })
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не задан. Создай .env.local со строкой:')
  console.error('   DATABASE_URL=postgresql://user:password@host/db')
  process.exit(1)
}

function splitSqlStatements(sql) {
  const statements = []
  let current = ''
  let inLineComment = false
  let inBlockComment = false
  let inString = false
  let stringChar = null
  let i = 0

  while (i < sql.length) {
    const ch = sql[i]
    const next = sql[i + 1]

    if (inLineComment) {
      if (ch === '\n') { inLineComment = false; current += ch }
      i++; continue
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; current += '*/'; i += 2; continue }
      i++; continue
    }
    if (inString) {
      current += ch
      if (ch === stringChar && sql[i - 1] !== '\\') inString = false
      i++; continue
    }

    if (ch === '-' && next === '-') { inLineComment = true; current += '--'; i += 2; continue }
    if (ch === '/' && next === '*') { inBlockComment = true; current += '/*'; i += 2; continue }
    if (ch === "'" || ch === '"') { inString = true; stringChar = ch; current += ch; i++; continue }

    if (ch === ';') {
      current += ch
      statements.push(current)
      current = ''
      i++; continue
    }

    current += ch
    i++
  }

  if (current.trim()) statements.push(current)
  return statements
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log('✅ Подключено к БД')

  // Проверяем какие колонки есть
  const schemaCheck = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='class_name') AS has_class_name,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='borrows' AND column_name='due_date') AS has_due_date,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='borrows' AND column_name='rating') AS has_rating
  `)
  const s = schemaCheck.rows[0]
  const isOldStructure = s.has_class_name === '0' || s.has_due_date === '0' || s.has_rating === '0'

  if (isOldStructure) {
    console.log('⚠️  Обнаружена старая структура таблиц. Пересоздаю...')
    await client.query(`
      DROP VIEW IF EXISTS v_active_loans, v_student_stats CASCADE;
      DROP TABLE IF EXISTS book_tracker, reading_goals, favorites, borrows, book_requests CASCADE;
      DROP TABLE IF EXISTS comment, reports, books, users CASCADE;
    `)
    console.log('  ✓ Старые таблицы удалены')
  } else {
    // DROP views (CREATE OR REPLACE не работает при изменении referenced колонок)
    await client.query(`DROP VIEW IF EXISTS v_active_loans, v_student_stats CASCADE;`)
  }

  // Применяем схему
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8')
  const statements = splitSqlStatements(schema)
    .map(s => s.trim())
    .filter(s => s && (s.toUpperCase().includes('CREATE ') || s.toUpperCase().includes('INSERT ')))

  console.log(`📄 Найдено ${statements.length} SQL statements`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const head = stmt.substring(0, 50).replace(/\n/g, ' ').replace(/\s+/g, ' ')
    try {
      await client.query(stmt)
      console.log(`  ${i + 1}: ✓ ${head}`)
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`  ${i + 1}: ⏭ ${head}`)
      } else {
        console.log(`  ${i + 1}: ❌ ${err.message}`)
      }
    }
  }

  // Проверяем что в БД
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `)
  console.log(`\n📊 Создано таблиц: ${tables.rows.length}`)
  tables.rows.forEach(t => console.log(`   - ${t.table_name}`))

  const usersCount = await client.query('SELECT COUNT(*) FROM users')
  const booksCount = await client.query('SELECT COUNT(*) FROM books')

  console.log(`\n🎉 БД готова к работе`)
  console.log(`   👤 Пользователей: ${usersCount.rows[0].count}`)
  console.log(`   📚 Книг: ${booksCount.rows[0].count}`)

  if (usersCount.rows[0].count === '0') {
    console.log('\n📝 Зарегистрируйте первого библиотекаря:')
    console.log('   Зайди на http://localhost:3000/register')
    console.log('   Email должен содержать @dls.school (или @librarian.school) → автоматически роль librarian')
  }

  await client.end()
}

run().catch(err => {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
})