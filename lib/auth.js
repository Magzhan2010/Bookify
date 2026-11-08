import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import pool, { ensureSchema } from './db'

/**
 * Читает и проверяет подпись JWT из заголовка Authorization.
 * Это только проверка подписи — НЕ проверка того, что токен ещё действует
 * (пароль мог смениться, роль могли снять). Для этого — requireAuth().
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
 * Проверка авторизации с обращением к БД.
 *
 * Раньше роль и сам факт входа брались только из токена (живёт 30 дней):
 *  - после смены пароля старый токен продолжал работать;
 *  - если у библиотекаря отбирали роль, токен всё равно пускал в панель.
 * Теперь пользователь и его token_version читаются из БД на каждый запрос.
 * Смена пароля увеличивает token_version — все старые токены сразу умирают.
 *
 * Использование:
 *   const guard = await requireAuth(req, ['librarian'])
 *   if (!guard.ok) return guard.response
 *   guard.payload.id / guard.payload.role
 */
export async function requireAuth(req, roles = null) {
  const unauthorized = () => ({
    ok: false,
    response: NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  })

  const payload = getTokenPayload(req)
  if (!payload?.id) return unauthorized()

  let user
  try {
    await ensureSchema()
    const res = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.token_version, tm.platform_role
         FROM users u
         LEFT JOIN team_members tm ON tm.user_id = u.id
        WHERE u.id = $1`,
      [payload.id]
    )
    user = res.rows[0]
    // Тимлид из переменной окружения — всегда lead, даже без записи в team_members
    if (user && isTeamleadEmail(user.email)) user.platform_role = 'lead'
  } catch (err) {
    console.error('[auth] Ошибка проверки пользователя:', err.message)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
    }
  }

  // Пользователь удалён или токен выпущен до смены пароля
  if (!user || (payload.tv ?? 0) !== (user.token_version ?? 0)) {
    return unauthorized()
  }

  // Кроме ролей аккаунта (student / librarian) роут может пустить:
  //   'team'     — любого участника командной платформы,
  //   'teamlead' — только тимлида.
  const allowed = !roles ||
    roles.includes(user.role) ||
    (roles.includes('team') && !!user.platform_role) ||
    (roles.includes('teamlead') && user.platform_role === 'lead')

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }
  }

  // Роль и имя — из БД, а не из токена
  return {
    ok: true,
    payload: {
      ...payload,
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      platform_role: user.platform_role || null
    }
  }
}

/**
 * Возвращает полную информацию о пользователе из БД по токену.
 */
export async function getCurrentUser(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return null

  const res = await pool.query(
    'SELECT id, name, email, role, class_name, avatar_url FROM users WHERE id = $1',
    [guard.payload.id]
  )
  return res.rows[0] || null
}

/**
 * Создаёт JWT для пользователя. user должен содержать token_version.
 */
export function signToken(user) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET не задан в .env')
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, tv: user.token_version ?? 0 },
    secret,
    { expiresIn: '30d' }
  )
}

/**
 * Роль при самостоятельной регистрации.
 *
 * Раньше роль библиотекаря выдавалась по ДОМЕНУ почты (@dls.school и др.).
 * Почта при регистрации не подтверждается, а ученики сами заведены
 * на @dls.school, поэтому любой мог зарегистрировать «новый» адрес на этом
 * домене и получить полный доступ к панели библиотекаря.
 *
 * Теперь библиотекарем становится только адрес, явно перечисленный
 * в переменной окружения LIBRARIAN_EMAILS (через запятую).
 * Пример: LIBRARIAN_EMAILS=malika@dls.school,aigerim@dls.school
 */
export function detectRoleFromEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return 'student'

  const allowed = String(process.env.LIBRARIAN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  return allowed.includes(normalized) ? 'librarian' : 'student'
}

/**
 * Тимлид командной платформы задаётся в TEAMLEAD_EMAILS (через запятую),
 * так же как библиотекари — в LIBRARIAN_EMAILS.
 */
export function isTeamleadEmail(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!e) return false
  return String(process.env.TEAMLEAD_EMAILS || '')
    .split(',')
    .map(x => x.trim().toLowerCase())
    .filter(Boolean)
    .includes(e)
}
