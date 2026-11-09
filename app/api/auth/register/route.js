import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../../lib/db'
import bcrypt from 'bcryptjs'
import { detectRoleFromEmail } from '../../../../lib/auth'

export async function POST(req) {
  const { name, email, password, className, isTeacher } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: 'Заполните все поля' },
      { status: 400 }
    )
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Пароль должен быть минимум 6 символов' },
      { status: 400 }
    )
  }

  try {
    await ensureSchema()

    const exists = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    )
    if (exists.rows[0]) {
      return NextResponse.json(
        { error: 'Этот email уже зарегистрирован' },
        { status: 400 }
      )
    }

    const hash = await bcrypt.hash(password, 10)
    let role = detectRoleFromEmail(email)
    // Учитель регистрируется сам, но кабинет откроется после подтверждения библиотекарем
    const pending = role !== 'librarian' && isTeacher === true
    if (pending) role = 'teacher'

    await pool.query(
      `INSERT INTO users (name, email, password, role, class_name, teacher_pending)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, email, hash, role, className || null, pending]
    )

    return NextResponse.json({ success: true, role })
  } catch (err) {
    console.error('Register error:', err)

    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('connect')) {
      return NextResponse.json({
        error: 'БД недоступна. Зайди на /setup или добавь его в .env.local',
        hint: 'DATABASE_URL не задан или БД не запущена'
      }, { status: 500 })
    }

    if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
      return NextResponse.json({
        error: 'Таблицы в БД не созданы. Зайди на /setup чтобы создать',
        hint: 'Запусти scripts/setup-db.js'
      }, { status: 500 })
    }

    return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 })
  }
}