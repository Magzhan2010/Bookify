import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { parseVideo } from '../../../../../lib/videoLinks'

/**
 * PATCH { url?, title? } — поправить ссылку или подпись.
 * PATCH { featured: true|false } — показать видео на главной странице (без имени ученика) или убрать.
 * DELETE — убрать видео из профиля (монеты не трогает: их отменяют в блоке «Монеты»).
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const id = parseInt((await params).id)
  if (typeof body?.featured === 'boolean') {
    try {
      await pool.query('UPDATE student_videos SET featured_at = CASE WHEN $2 THEN NOW() END WHERE id = $1', [id, body.featured])
      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[videos featured]', err)
      return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
    }
  }
  const video = body?.url !== undefined ? parseVideo(body.url) : undefined
  if (video === null) return NextResponse.json({ error: 'Ссылка не похожа на адрес видео' }, { status: 400 })
  try {
    await pool.query(
      `UPDATE student_videos SET url = COALESCE($2, url), title = CASE WHEN $4 THEN $3 ELSE title END WHERE id = $1`,
      [id, video?.url ?? null, String(body?.title || '').trim().slice(0, 120) || null, body?.title !== undefined])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[videos PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  try {
    await pool.query('DELETE FROM student_videos WHERE id = $1', [parseInt((await params).id)])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[videos DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
