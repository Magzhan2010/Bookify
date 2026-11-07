import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth, signToken } from '../../../../lib/auth'

/**
 * PATCH /api/profile/password
 * Body: { oldPassword, newPassword }
 *
 * Смена своего пароля. Требует ВЕРНЫЙ старый пароль, чтобы чужой телефон
 * или оставленная без присмотра сессия не дали захватить аккаунт.
 * После смены пароля token_version увеличивается: все старые токены
 * (на других устройствах, у того, кто подсмотрел пароль) сразу перестают
 * работать. Текущему устройству выдаём новый токен — клиент сохраняет его.
 */
export async function PATCH(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const payload = guard.payload

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
    const updated = await pool.query(
      `UPDATE users
          SET password = $1, token_version = token_version + 1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, role, token_version`,
      [hash, payload.id]
    )

    const newToken = signToken(updated.rows[0])

    return NextResponse.json({ success: true, token: newToken })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}