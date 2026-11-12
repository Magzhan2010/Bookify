import crypto from 'crypto'

/**
 * Пароли, которые выдаёт школа (библиотекарь ставит ученику), хранятся ещё и обратимо
 * зашифрованными (AES-256-GCM), чтобы библиотекарь и тимлид могли подсказать ученику пароль.
 * Вход по-прежнему проверяется только по bcrypt-хешу. Пароль, который человек поставил сам
 * (регистрация, смена в профиле), сюда не попадает — копия стирается.
 * Ключ — из PASSWORD_VAULT_KEY или JWT_SECRET: если ключ сменится, старые копии просто не откроются.
 */
function key() {
  const secret = process.env.PASSWORD_VAULT_KEY || process.env.JWT_SECRET
  if (!secret) throw new Error('no vault key')
  return crypto.createHash('sha256').update('bookify-pass-vault:' + secret).digest()
}

export function sealPassword(plain) {
  try {
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', key(), iv)
    const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()])
    return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join(':')
  } catch {
    return null
  }
}

export function openPassword(sealed) {
  try {
    const [v, iv, tag, ct] = String(sealed || '').split(':')
    if (v !== 'v1') return null
    const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
    d.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8')
  } catch {
    return null
  }
}
