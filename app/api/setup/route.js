import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../lib/db'

/**
 * GET /api/setup
 * Проверяет состояние БД: есть ли таблицы, сколько пользователей и книг.
 *
 * POST /api/setup
 * Применяет схему БД (если таблиц нет). Без создания демо-аккаунтов.
 * Юзеров создаёт сама библиотекарь через /register.
 */
export async function GET() {
  try {
    const res = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS tables,
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM books) AS books
    `)
    return NextResponse.json({
      ready: parseInt(res.rows[0].tables) > 0,
      tables: parseInt(res.rows[0].tables),
      users: parseInt(res.rows[0].users),
      books: parseInt(res.rows[0].books)
    })
  } catch (err) {
    // Текст ошибки БД (адрес хоста, имя пользователя и т.п.) — только в логи
    console.error('[setup] Ошибка проверки БД:', err.message)
    return NextResponse.json({
      ready: false,
      error: 'БД недоступна',
      hint: 'Проверь DATABASE_URL в .env.local'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    await ensureSchema()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[setup] Ошибка применения схемы:', err.message)
    return NextResponse.json({ error: 'Не удалось применить схему БД' }, { status: 500 })
  }
}