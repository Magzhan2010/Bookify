import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false
})

let schemaEnsured = false

/**
 * Идемпотентные миграции для БД, созданных до этих изменений.
 * CREATE TABLE IF NOT EXISTS из schema.sql не добавляет новые колонки
 * в уже существующие таблицы, поэтому колонки накатываются отдельно.
 * Каждая миграция должна быть безопасна к многократному запуску.
 */
const MIGRATIONS = [
  // Архив книг вместо физического удаления (история выдач не должна пропадать)
  `ALTER TABLE books ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS idx_books_archived ON books(archived_at)`,
  // Оценки книг учениками (1-5)
  `CREATE TABLE IF NOT EXISTS book_ratings (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
     value INT NOT NULL CHECK (value BETWEEN 1 AND 5),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (user_id, book_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_ratings_book ON book_ratings(book_id)`,
  // Версия токена: смена пароля увеличивает её и обнуляет все старые сессии
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0`,
  // === Программа «Читай книги. Копи баллы. Получай призы.» ===
  // Статусы займа: active → returned → reviewed (отзыв написан) → approved (отзыв принят)
  `ALTER TABLE borrows DROP CONSTRAINT IF EXISTS borrows_status_check`,
  `ALTER TABLE borrows ADD CONSTRAINT borrows_status_check
     CHECK (status IN ('active','returned','reviewed','approved'))`,
  // Отзывы учеников о прочитанных книгах (один отзыв на заём)
  `CREATE TABLE IF NOT EXISTS book_reviews (
     id SERIAL PRIMARY KEY,
     borrow_id INT NOT NULL REFERENCES borrows(id) ON DELETE CASCADE,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
     rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
     content TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending'
           CHECK (status IN ('pending','approved','rejected')),
     reviewed_by INT REFERENCES users(id),
     reviewed_at TIMESTAMPTZ,
     review_note TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (borrow_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_status ON book_reviews(status)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_user ON book_reviews(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_book ON book_reviews(book_id)`,
  // Баллы: история начислений и трат
  `CREATE TABLE IF NOT EXISTS user_points (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     points INT NOT NULL DEFAULT 0,
     reason TEXT NOT NULL,
     description TEXT,
     borrow_id INT REFERENCES borrows(id) ON DELETE SET NULL,
     book_id INT REFERENCES books(id) ON DELETE SET NULL,
     spent BOOLEAN NOT NULL DEFAULT FALSE,
     created_by INT REFERENCES users(id),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_points_user ON user_points(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_points_created ON user_points(created_at DESC)`,
  // Справочник правил начисления
  `CREATE TABLE IF NOT EXISTS point_rules (
     id SERIAL PRIMARY KEY,
     code TEXT UNIQUE NOT NULL,
     title TEXT NOT NULL,
     points INT NOT NULL,
     description TEXT
   )`,
  `INSERT INTO point_rules (code, title, points, description) VALUES
     ('pages_100_200', '100-200 страниц', 5, 'Прочитал книгу объёмом 100-200 страниц'),
     ('pages_201_300', '201-300 страниц', 10, 'Прочитал книгу объёмом 201-300 страниц'),
     ('pages_301_400', '301-400 страниц', 15, 'Прочитал книгу объёмом 301-400 страниц'),
     ('pages_500_plus', '500+ страниц', 20, 'Прочитал книгу объёмом 500+ страниц'),
     ('review', 'Написать отзыв', 5, 'Покажи, как ты понял книгу'),
     ('video', 'Сняться в видео', 10, 'Поделись книгой на камеру'),
     ('tedx', 'Выступить на TEDx', 20, 'Самый большой бонус')
   ON CONFLICT (code) DO NOTHING`
]

async function runMigrations() {
  for (const sql of MIGRATIONS) {
    try {
      await pool.query(sql)
    } catch (err) {
      console.error('❌ [db] Миграция не прошла:', sql.slice(0, 60), '—', err.message)
    }
  }
}

/**
 * Проверяет что таблицы существуют. Если нет — создаёт их.
 * Вызывай эту функцию перед любым запросом, требующим таблицы.
 * Работает один раз за процесс — далее кешируется.
 */
export async function ensureSchema() {
  if (schemaEnsured) return true

  try {
    const check = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists
    `)

    if (check.rows[0].exists) {
      // Таблицы есть — накатываем только миграции
      await runMigrations()
      schemaEnsured = true
      return true
    }

    // Таблиц нет — применяем схему
    const fs = await import('fs')
    const path = await import('path')
    const schemaPath = path.join(process.cwd(), 'db', 'schema.sql')

    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8')
      await pool.query(sql)
      console.log('✅ [db] Схема БД автоматически применена')
      await runMigrations()
      schemaEnsured = true
      return true
    }
  } catch (err) {
    console.error('❌ [db] Ошибка ensureSchema:', err.message)
  }
  return false
}

export default pool