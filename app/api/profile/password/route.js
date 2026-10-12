import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'

/**
 * PATCH /api/profile/password
 * Body: { oldPassword, newPassword }
 *
 * Смена своего пароля. Требует ВЕРНЫЙ старый пароль, чтобы чужой телефон
 * или оставленная без присмотра сессия не дали захватить аккаунт.
 * После смены пароля выдаём новый токен — старый остаётся валидным до
 * истечения, поэтому клиент обязан перезаписать его в localStorage.
 */
export async function PATCH(req) {
  const auth = req.headers.get('authorization')
  if (!auth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }
  const token = auth.split(' ')[1]
  const secret = process.env.JWT_SECRET
  if (!token || !secret) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  let payload
  try {
    payload = jwt.verify(token, secret)
  } catch (err) {
    return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
  }

  try {
    const { oldPassword, newPassword } = await req.json()

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Заполни оба поля' },
        { status: 400 }
      )
    }
    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { error: 'Новый пароль должен быть не короче 6 символов' },
        { status: 400 }
      )
    }
    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: 'Новый пароль совпадает со старым' },
        { status: 400 }
      )
    }

    const userRes = await pool.query(
      'SELECT id, password, name, role FROM users WHERE id = $1',
      [payload.id]
    )
    if (!userRes.rows[0]) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    const valid = await bcrypt.compare(String(oldPassword), userRes.rows[0].password)
    if (!valid) {
      return NextResponse.json(
        { error: 'Текущий пароль неверный' },
        { status: 400 }
      )
    }

    const hash = await bcrypt.hash(String(newPassword), 10)
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hash, payload.id]
    )

    // Новый токен с тем же payload — клиент перезапишет его после смены
    const newToken = jwt.sign(
      {
        id: userRes.rows[0].id,
        role: userRes.rows[0].role,
        name: userRes.rows[0].name
      },
      secret,
      { expiresIn: '30d' }
    )

    return NextResponse.json({ success: true, token: newToken })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}