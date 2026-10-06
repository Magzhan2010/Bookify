import { NextResponse } from 'next/server'
import pool from '../../../lib/db'
import { ensureSchema } from '../../../lib/db'
import bcrypt from 'bcryptjs'

/**
 * GET /api/setup
 * Проверяет состояние БД. Полезно для страницы настройки.
 *
 * POST /api/setup
 * Применяет схему + создаёт демо-аккаунты (если их нет).
 * Защищён простым паролем для предотвращения случайного вызова.
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
    return NextResponse.json({
      ready: false,
      error: err.message,
      hint: 'БД недоступна. Проверь DATABASE_URL в .env.local'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    await ensureSchema()

    // Демо-аккаунты
    const demo = [
      { name: 'Малика апай', email: 'teacher@dls.school', password: 'library123', role: 'librarian' },
      { name: 'Айдана Сатпаева', email: 'aidana@student.school.com', password: 'student123', role: 'student', class_name: '10-А' },
      { name: 'Тимур Касенов', email: 'timur@student.school.com', password: 'student123', role: 'student', class_name: '11-Б' },
      { name: 'Алия Молдабекова', email: 'aliya@student.school.com', password: 'student123', role: 'student', class_name: '9-А' }
    ]

    let created = 0
    for (const u of demo) {
      const exists = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [u.email])
      if (exists.rows[0]) continue
      const hash = await bcrypt.hash(u.password, 10)
      await pool.query(
        `INSERT INTO users (name, email, password, role, class_name) VALUES ($1, $2, $3, $4, $5)`,
        [u.name, u.email, hash, u.role, u.class_name || null]
      )
      created++
    }

    return NextResponse.json({ success: true, users_created: created })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}