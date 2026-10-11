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
  `CREATE INDEX IF NOT EXISTS idx_books_archived ON books(archived_at)`
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