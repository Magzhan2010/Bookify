import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import bcrypt from 'bcryptjs'
import { detectRoleFromEmail } from '../../../../lib/auth'

export async function POST(req) {
  const { name, email, password, className } = await req.json()

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
    const role = detectRoleFromEmail(email)

    await pool.query(
      `INSERT INTO users (name, email, password, role, class_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, hash, role, className || null]
    )

    return NextResponse.json({ success: true, role })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 })
  }
}