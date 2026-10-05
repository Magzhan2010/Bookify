import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import pool from './db'

/**
 * Извлекает payload из JWT токена.
 * Возвращает null если токена нет или он невалидный.
 */
export function getTokenPayload(req) {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  const token = auth.split(' ')[1]
  if (!token) return null

  const secret = process.env.JWT_SECRET
  if (!secret) return null

  try {
    return jwt.verify(token, secret)
  } catch (err) {
    return null
  }
}

/**
 * Возвращает 401 если пользователь не авторизован.
 * Принимает req и массив допустимых ролей.
 * Если roles не указаны — авторизован любой пользователь.
 */
export function requireAuth(req, roles = null) {
  const payload = getTokenPayload(req)
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
  }

  if (roles && !roles.includes(payload.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      )
    }
  }

  return { ok: true, payload }
}

/**
 * Возвращает полную информацию о пользователе из БД по токену.
 */
export async function getCurrentUser(req) {
  const payload = getTokenPayload(req)
  if (!payload) return null

  const res = await pool.query(
    'SELECT id, name, email, role, class_name, avatar_url FROM users WHERE id = $1',
    [payload.id]
  )
  return res.rows[0] || null
}

/**
 * Создаёт JWT для пользователя.
 */
export function signToken(user) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET не задан в .env')
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    secret,
    { expiresIn: '30d' }
  )
}

/**
 * Определяет роль пользователя по email при регистрации.
 * Библиотекарь: email содержит @librarian.school или @lib.school
 * Иначе: ученик
 */
export function detectRoleFromEmail(email) {
  if (email.includes('@librarian.school') || email.includes('@lib.school')) return 'librarian'
  return 'student'
}