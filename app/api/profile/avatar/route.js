import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/** GET /api/profile/avatar — адрес своей аватарки (для шапок и меню). */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [guard.payload.id])
    return NextResponse.json({ avatar_url: r.rows[0]?.avatar_url || null })
  } catch (err) {
    console.error('[avatar GET me]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

const MAX_BYTES = 400 * 1024 // сжатое в браузере фото 256×256 весит ~20–40 КБ

/**
 * PUT /api/profile/avatar — поставить свою аватарку.
 * Body: { image: 'data:image/jpeg;base64,…' } (png / webp / jpeg)
 * Картинка хранится в users.avatar, а в avatar_url кладётся короткий адрес
 * с версией — списки (лидеры, ученики) не таскают тяжёлые данные.
 */
export async function PUT(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const image = String(body?.image || '')
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
    return NextResponse.json({ error: 'Нужна картинка JPG, PNG или WebP' }, { status: 400 })
  }
  if (image.length * 0.75 > MAX_BYTES) {
    return NextResponse.json({ error: 'Фото слишком большое' }, { status: 400 })
  }

  try {
    const url = `/api/users/${guard.payload.id}/avatar?v=${Date.now()}`
    await pool.query(
      'UPDATE users SET avatar = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3',
      [image, url, guard.payload.id]
    )
    return NextResponse.json({ success: true, avatar_url: url })
  } catch (err) {
    console.error('[avatar PUT]', err)
    return NextResponse.json({ error: 'Не удалось сохранить фото' }, { status: 500 })
  }
}

/** DELETE /api/profile/avatar — убрать аватарку (останется буква имени). */
export async function DELETE(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  try {
    await pool.query('UPDATE users SET avatar = NULL, avatar_url = NULL, updated_at = NOW() WHERE id = $1', [guard.payload.id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[avatar DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
