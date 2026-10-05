import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false
})

let schemaEnsured = false

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
      schemaEnsured = true
      return true
    }
  } catch (err) {
    console.error('❌ [db] Ошибка ensureSchema:', err.message)
  }
  return false
}

export default pool