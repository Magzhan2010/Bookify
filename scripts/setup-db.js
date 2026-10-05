/**
 * Скрипт настройки БД и демо-данных.
 * Запуск: node scripts/setup-db.js
 *
 * Что делает:
 * 1. Применяет db/schema.sql к твоей Postgres-базе
 * 2. Создаёт демо-пользователей (admin / librarian / teacher / students)
 * 3. Добавляет 15 демо-книг чтобы каталог не был пустым
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })
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
  { title: 'Мастер и Маргарита', author: 'Михаил Булгаков', genre: 'Классика', year: '1967', description: 'Философский роман о добре и зле, любви и предательстве, в котором сатира переплетается с мистикой.', cover_url: 'https://upload.wikimedia.org/wikipedia/ru/thumb/8/85/BookMaster.jpg/600px-BookMaster.jpg' },
  { title: 'Преступление и наказание', author: 'Фёдор Достоевский', genre: 'Классика', year: '1866', description: 'История бедного студента Раскольникова, решившего проверить теорию о "тварях дрожащих" и "право имеющих".', cover_url: 'https://upload.wikimedia.org/wikipedia/ru/thumb/d/de8b/Dostoevsky_Crime_and_Punishment.jpg/600px-Dostoevsky_Crime_and_Punishment.jpg' },
  { title: 'Война и мир', author: 'Лев Толстой', genre: 'Классика', year: '1869', description: 'Эпопея о русском обществе в эпоху наполеоновских войн. Любовь, война, поиски смысла жизни.', cover_url: 'https://upload.wikimedia.org/wikipedia/ru/thumb/9/95/WarAndPeace.jpg/600px-WarAndPeace.jpg' },
  { title: '1984', author: 'Джордж Оруэлл', genre: 'Антиутопия', year: '1949', description: 'Мир тотальной слежки, где даже мысли преступны. Роман-предупреждение о тоталитаризме.', cover_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/1984年 第一版封面.jpg/600px-1984年 第一版封面.jpg' },
  { title: 'О дивный новый мир', author: 'Олдос Хаксли', genre: 'Антиутопия', year: '1932', description: 'Общество потребления, где счастье достигается химически, а свобода считается устаревшей.', cover_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/68/Brave_New_World_First_Edition_Cover_1932.jpg/600px-Brave_New_World_First_Edition_Cover_1932.jpg' },
  { title: 'Атомные привычки', author: 'Джеймс Клир', genre: 'Саморазвитие', year: '2018', description: 'Простая система формирования хороших привычек и избавления от плохих. Маленькие изменения = большие результаты.', cover_url: 'https://m.media-amazon.com/images/I/91bYsB8CqLL._AC_UF1000,1000_QL80_.jpg' },
  { title: 'Богатый папа, бедный папа', author: 'Роберт Кийосаки', genre: 'Финансы', year: '1997', description: 'Чему учат детей богатые и бедные родители. Главная книга о финансовой грамотности.', cover_url: 'https://m.media-amazon.com/images/I/81bsw2fn0yL._AC_UF1000,1000_QL80_.jpg' },
  { title: 'Sapiens: Краткая история человечества', author: 'Юваль Ной Харари', genre: 'История', year: '2011', description: 'От когнитивной революции до наших дней — почему мы победили и что нас ждёт.', cover_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/06/Sapiens_-_A_Brief_History_of_Humankind.png/600px-Sapiens_-_A_Brief_History_of_Humankind.png' },
  { title: 'Думай медленно, решай быстро', author: 'Даниэль Канеман', genre: 'Психология', year: '2011', description: 'О двух системах мышления — быстрой интуитивной и медленной аналитической. Нобелевская премия по экономике.', cover_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c0/Thinking%2C_Fast_and_Slow.jpg/600px-Thinking%2C_Fast_and_Slow.jpg' },
  { title: 'Поднятая целина', author: 'Айн Рэнд', genre: 'Философия', year: '1943', description: 'Роман об архитекторе Говарде Рорке, который отказывается жертвовать своими принципами ради карьеры.', cover_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8d/The_Fountainhead.jpg/600px-The_Fountainhead.jpg' },
  { title: 'Сёгун', author: 'Джеймс Клавелл', genre: 'Исторический роман', year: '1975', description: 'Эпическая история английского мореплавателя в средневековой Японии. Политика, война, любовь.', cover_url: 'https://m.media-amazon.com/images/I/91JzLXqrrgL._AC_UF1000,1000_QL80_.jpg' },
  { title: 'Семь навыков высокоэффективных людей', author: 'Стивен Кови', genre: 'Саморазвитие', year: '1989', description: 'Принципы личной эффективности, которые работают уже 35 лет. Классика для всех.', cover_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9d/The_7_Habits_of_Highly_Effective_People.jpg/600px-The_7_Habits_of_Highly_Effective_People.jpg' },
  { title: 'Илон Маск: Tesla, SpaceX и дорога в будущее', author: 'Эшли Вэнс', genre: 'Биография', year: '2015', description: 'Биография самого амбициозного предпринимателя современности. Как он строит ракеты и электромобили.', cover_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Elon_Musk_%28book%29.jpg/600px-Elon_Musk_%28book%29.jpg' },
  { title: 'Думай и богатей', author: 'Наполеон Хилл', genre: 'Саморазвитие', year: '1937', description: '13 принципов успеха, которые привели к богатству сотни людей. Книга-основа мотивации XX века.', cover_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Think_and_Grow_Rich.jpg/600px-Think_and_Grow_Rich.jpg' },
  { title: 'Богатый папа, бедный папа для подростков', author: 'Роберт Кийосаки', genre: 'Финансы', year: '2004', description: 'Финансовая грамотность для молодёжи — простым языком с примерами из реальной жизни.', cover_url: 'https://m.media-amazon.com/images/I/81-NaNdgJEL._AC_UF1000,1000_QL80_.jpg' }
]

async function run() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log('✅ Подключено к БД')

  // Применяем схему
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8')
  await client.query(schema)
  console.log('✅ Схема БД применена')

  // Демо-пользователи
  for (const u of DEMO_USERS) {
    const exists = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [u.email])
    if (exists.rows[0]) {
      console.log(`  ⏭ ${u.email} уже существует`)
      continue
    }
    const hash = await bcrypt.hash(u.password, 10)
    await client.query(
      `INSERT INTO users (name, email, password, role, class_name) VALUES ($1, $2, $3, $4, $5)`,
      [u.name, u.email, hash, u.role, u.class_name || null]
    )
    console.log(`  ✓ Создан: ${u.email} (пароль: ${u.password})`)
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
      `INSERT INTO books (title, author, genre, year, description, cover_url, total_copies, available_copies)
       VALUES ($1, $2, $3, $4, $5, $6, 2, 2)`,
      [b.title, b.author, b.genre, b.year, b.description, b.cover_url]
    )
    console.log(`  ✓ Книга: "${b.title}"`)
  }

  await client.end()
  console.log('\n🎉 Готово! Можешь заходить:')
  console.log('   📧 admin@dls.school.com / admin123')
  console.log('   📧 aigerim@librarian.school.com / library123')
  console.log('   📧 aidana@student.school.com / student123')
}

run().catch(err => {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
})