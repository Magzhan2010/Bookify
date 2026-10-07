/**
 * Безопасный парсинг JWT токена на клиенте.
 * Возвращает payload или null если токен невалидный.
 *
 * atob() в браузере не работает с невалидным Base64 (например, если
 * токен повреждён или не JWT формата). Эта утилита безопасно обрабатывает
 * такие случаи.
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    // JWT использует URL-safe base64: - вместо + и _ вместо /
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    // Добавляем padding если нужно
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)

    const json = atob(padded)
    const payload = JSON.parse(json)
    return payload
  } catch (err) {
    console.warn('[parseJwt] Failed to parse JWT:', err.message)
    return null
  }
}

/**
 * Безопасно достаёт данные из JWT без падения.
 * Возвращает дефолтные значения если токен невалидный.
 */
export function getUserFromToken(token, defaults = {}) {
  const payload = parseJwt(token)
  if (!payload) {
    return {
      id: null,
      name: 'Гость',
      role: 'guest',
      ...defaults
    }
  }
  return {
    id: payload.id || null,
    name: payload.name || 'Гость',
    role: payload.role || 'guest',
    ...defaults
  }
}