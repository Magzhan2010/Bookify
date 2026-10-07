import { NextResponse } from "next/server"
import pool, { ensureSchema } from '../../../../lib/db'
import bcrypt from 'bcryptjs'
import { signToken } from '../../../../lib/auth'

export async function POST(req) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Заполни email и пароль' },
      { status: 400 }
    )
  }

  try {
    await ensureSchema()

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

    // Определяем тип ошибки
    const msg = err.message || ''
    const isConn = msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN') || msg.includes('getaddrinfo')
    const isTimeout = msg.includes('ETIMEDOUT') || msg.includes('timeout')
    const isSSL = msg.includes('SSL') || msg.includes('certificate')
    const isAuth = msg.includes('password authentication') || msg.includes('role') || msg.includes('permission')
    const isMissing = msg.includes('does not exist') || msg.includes('relation')

    if (isConn) {
      return NextResponse.json({
        error: 'Не удалось подключиться к БД',
        hint: 'Проверь DATABASE_URL в .env.local и что Neon не уснул'
      }, { status: 500 })
    }

    if (isTimeout) {
      return NextResponse.json({
        error: 'Таймаут подключения к БД',
        hint: 'Neon мог уснуть. Зайди на console.neon.tech и разбуди'
      }, { status: 500 })
    }

    if (isSSL) {
      return NextResponse.json({
        error: 'SSL ошибка подключения',
        hint: 'Добавь ?sslmode=require в DATABASE_URL'
      }, { status: 500 })
    }

    if (isAuth) {
      return NextResponse.json({
        error: 'Ошибка авторизации БД',
        hint: 'Проверь логин/пароль в DATABASE_URL'
      }, { status: 500 })
    }

    if (isMissing) {
      return NextResponse.json({
        error: 'Таблицы не созданы',
        hint: 'Запусти node scripts/setup-db.js или зайди на /setup'
      }, { status: 500 })
    }

    return NextResponse.json({
      error: 'Ошибка сервера',
      hint: msg.substring(0, 150)
    }, { status: 500 })
  }
}