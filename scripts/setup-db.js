/**
 * Скрипт настройки БД и демо-данных.
 * Запуск: node scripts/setup-db.js
 *
 * ВНИМАНИЕ: Если таблицы уже существуют со СТАРОЙ структурой,
 * скрипт их DROP'нет и пересоздаст. Используется для dev/Neon.
 */

require('dotenv').config({ path: __dirname + '/../.env.local' })
require('dotenv').config({ path: __dirname + '/../.env' })
const { Client } = require('pg')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не задан. Создай .env.local со строкой:')
  console.error('   DATABASE_URL=postgresql://user:password@host/db')
  process.exit(1)
}

const DEMO_USERS = [
  { name: 'Администратор', email: 'admin@dls.school.com', password: 'admin123', role: 'admin' },
  { name: 'Библиотекарь Айгерим', email: 'aigerim@librarian.school.com', password: 'library123', role: 'librarian' },
  { name: 'Учитель Ержан', email: 'yerzhan@teacher.school.com', password: 'teacher123', role: 'teacher' },
  { name: 'Айдана Сатпаева', email: 'aidana@student.school.com', password: 'student123', role: 'student', class_name: '10-А' },
  { name: 'Тимур Касенов', email: 'timur@student.school.com', password: 'student123', role: 'student', class_name: '11-Б' },
  { name: 'Алия Молдабекова', email: 'aliya@student.school.com', password: 'student123', role: 'student', class_name: '9-А' },
  { name: 'Дария Жумабаева', email: 'daria@student.school.com', password: 'student123', role: 'student', class_name: '10-А' },
  { name: 'Нурлан Бекжанов', email: 'nurlan@student.school.com', password: 'student123', role: 'student', class_name: '11-Б' }
]

const DEMO_BOOKS = [
  { title: 'Мастер и Маргарита', author: 'Михаил Булгаков', genre: 'Классика', year: '1967', description: 'Философский роман о добре и зле, любви и предательстве, в котором сатира переплетается с мистикой.' },
  { title: 'Преступление и наказание', author: 'Фёдор Достоевский', genre: 'Классика', year: '1866', description: 'История бедного студента Раскольникова, решившего проверить теорию о "тварях дрожащих" и "право имеющих".' },
  { title: 'Война и мир', author: 'Лев Толстой', genre: 'Классика', year: '1869', description: 'Эпопея о русском обществе в эпоху наполеоновских войн.' },
  { title: '1984', author: 'Джордж Оруэлл', genre: 'Антиутопия', year: '1949', description: 'Мир тотальной слежки, где даже мысли преступны.' },
  { title: 'О дивный новый мир', author: 'Олдос Хаксли', genre: 'Антиутопия', year: '1932', description: 'Общество потребления, где счастье достигается химически.' },
  { title: 'Атомные привычки', author: 'Джеймс Клир', genre: 'Саморазвитие', year: '2018', description: 'Простая система формирования хороших привычек.' },
  { title: 'Богатый папа, бедный папа', author: 'Роберт Кийосаки', genre: 'Финансы', year: '1997', description: 'Чему учат детей богатые и бедные родители.' },
  { title: 'Sapiens: Краткая история человечества', author: 'Юваль Ной Харари', genre: 'История', year: '2011', description: 'От когнитивной революции до наших дней.' },
  { title: 'Думай медленно, решай быстро', author: 'Даниэль Канеман', genre: 'Психология', year: '2011', description: 'О двух системах мышления — быстрой интуитивной и медленной аналитической.' },
  { title: 'Поднятая целина', author: 'Айн Рэнд', genre: 'Философия', year: '1943', description: 'Роман об архитекторе Говарде Рорке, который отказывается жертвовать принципами.' },
  { title: 'Сёгун', author: 'Джеймс Клавелл', genre: 'Исторический роман', year: '1975', description: 'Эпическая история английского мореплавателя в средневековой Японии.' },
  { title: '7 навыков высокоэффективных людей', author: 'Стивен Кови', genre: 'Саморазвитие', year: '1989', description: 'Принципы личной эффективности.' },
  { title: 'Илон Маск', author: 'Эшли Вэнс', genre: 'Биография', year: '2015', description: 'Биография самого амбициозного предпринимателя современности.' },
  { title: 'Думай и богатей', author: 'Наполеон Хилл', genre: 'Саморазвитие', year: '1937', description: '13 принципов успеха.' },
  { title: 'Богатый папа, бедный папа для подростков', author: 'Роберт Кийосаки', genre: 'Финансы', year: '2004', description: 'Финансовая грамотность для молодёки.' }
]

/**
 * Парсит SQL на отдельные команды с правильной обработкой:
  - -- однострочных комментариев
  - многострочных блочных комментариев
  - строк в кавычках
  - двойных кавычек для identifiers
 */
function splitSqlStatements(sql) {
  const statements = []
  let current = ''
  let i = 0
  let inString = false
  let stringChar = null
  let inLineComment = false
  let inBlockComment = false

  while (i < sql.length) {
    const ch = sql[i]
    const next = sql[i + 1]

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false
        current += ch
      }
      i++
      continue
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        current += '*/'
        i += 2
        continue
      }
      current += ch
      i++
      continue
    }

    if (inString) {
      current += ch
      if (ch === stringChar && sql[i - 1] !== '\\') {
        inString = false
      }
      i++
      continue
    }

    // not in comment, not in string
    if (ch === '-' && next === '-') {
      inLineComment = true
      current += '--'
      i += 2
      continue
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true
      current += '/*'
      i += 2
      continue
    }
    if (ch === "'" || ch === '"') {
      inString = true
      stringChar = ch
      current += ch
      i++
      continue
    }

    if (ch === ';') {
      current += ch
      statements.push(current)
      current = ''
      i++
      continue
    }

    current += ch
    i++
  }

  if (current.trim()) {
    statements.push(current)
  }

  // Не выбрасываем statements, которые содержат DDL даже если начинаются с комментариев
  return statements.map(s => s.trim()).filter(s => {
    if (!s) return false
    // Пропускаем только чистые комментарии (без CREATE/INDEX/VIEW/INSERT)
    const upper = s.toUpperCase()
    return upper.includes('CREATE ') || upper.includes('INSERT ') || upper.includes('ALTER ')
  })
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log('✅ Подключено к БД')

  // Проверяем есть ли старая структура (без class_name, due_date и т.д.)
  const schemaCheck = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'class_name') AS has_class_name,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'borrows' AND column_name = 'due_date') AS has_due_date
  `)
  const needsMigration = schemaCheck.rows[0].has_class_name === '0' || schemaCheck.rows[0].has_due_date === '0'

  if (needsMigration) {
    console.log('⚠️  Обнаружена старая структура таблиц. Пересоздаю...')
    await client.query(`
      DROP TABLE IF EXISTS book_tracker, reading_goals, favorites, comment, borrows, reports CASCADE;
      DROP TABLE IF EXISTS books, users CASCADE;
      DROP VIEW IF EXISTS v_active_loans, v_student_stats CASCADE;
    `)
    console.log('  ✓ Старые таблицы удалены')
  }

  // Читаем и парсим schema.sql
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8')
  const statements = splitSqlStatements(schema)
  console.log(`📄 Найдено ${statements.length} SQL statements`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const head = stmt.substring(0, 50).replace(/\s+/g, ' ')
    try {
      await client.query(stmt)
      console.log(`  ${i + 1}: ✓ ${head}`)
    } catch (err) {
      // IF NOT EXISTS — пропускаем если уже есть
      if (err.message.includes('already exists')) {
        console.log(`  ${i + 1}: ⏭ ${head} (already exists)`)
      } else {
        console.log(`  ${i + 1}: ❌ ${err.message}`)
        console.log(`     Statement: ${head}...`)
      }
    }
  }
  console.log('✅ Схема применена')

  // Демо-пользователи
  for (const u of DEMO_USERS) {
    const exists = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [u.email])
    if (exists.rows[0]) {
      console.log(`  ⏭ ${u.email} уже есть`)
      continue
    }
    const hash = await bcrypt.hash(u.password, 10)
    await client.query(
      `INSERT INTO users (name, email, password, role, class_name) VALUES ($1, $2, $3, $4, $5)`,
      [u.name, u.email, hash, u.role, u.class_name || null]
    )
    console.log(`  ✓ ${u.email} (${u.password})`)
  }

  // Демо-книги
  for (const b of DEMO_BOOKS) {
    const exists = await client.query(
      'SELECT id FROM books WHERE LOWER(title) = LOWER($1) AND LOWER(author) = LOWER($2)',
      [b.title, b.author]
    )
    if (exists.rows[0]) {
      console.log(`  ⏭ "${b.title}" уже в каталоге`)
      continue
    }
    await client.query(
      `INSERT INTO books (title, author, genre, year, description, total_copies, available_copies)
       VALUES ($1, $2, $3, $4, $5, 2, 2)`,
      [b.title, b.author, b.genre, b.year, b.description]
    )
    console.log(`  ✓ "${b.title}"`)
  }

  await client.end()
  console.log('\n🎉 Готово! Залогинься одним из:')
  console.log('   👑 admin@dls.school.com / admin123')
  console.log('   📚 aigerim@librarian.school.com / library123')
  console.log('   👤 aidana@student.school.com / student123')
}

run().catch(err => {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
})