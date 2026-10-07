/**
 * Безопасный парсинг JWT токена на клиенте.
 * Возвращает payload или null если токен невалидный.
 *
 * ВАЖНО: atob() в браузере возвращает строку с интерпретацией байтов как LATIN-1,
 * а не UTF-8. Для корректного чтения кириллических имён (Малика апай и т.д.)
 * нужно декодировать байты через TextDecoder.
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    // JWT base64url → на стандарте base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    // Добавляем padding если нужно
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)

    // Декодируем base64 в бинарную строку
    const binaryString = atob(padded)
    // Конвертируем бинарную строку (latin-1) в байты → UTF-8 строку
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const decoded = new TextDecoder('utf-8').decode(bytes)

    return JSON.parse(decoded)
  } catch (err) {
    console.warn('[parseJwt] Failed to parse JWT:', err.message)
    return null
  }
}

/**
 * Безопасно достаёт данные из JWT без падения.
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