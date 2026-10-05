import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import bcrypt from 'bcryptjs'
import { signToken } from '../../../../lib/auth'

export async function POST(req) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Заполните email и пароль' },
      { status: 400 }
    )
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, password, role, class_name, avatar_url
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    )
    const user = result.rows[0]
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 400 }
      )
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: 'Неверный пароль' },
        { status: 400 }
      )
    }

    const token = signToken(user)
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        class_name: user.class_name
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}