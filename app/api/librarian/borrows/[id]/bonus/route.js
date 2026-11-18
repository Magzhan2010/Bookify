import { NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'
import { requireAuth } from '../../../../../../lib/auth'
import { notify } from '../../../../../../lib/notify'
import { BONUSES } from '../../../../../../lib/points'
import { parseVideo } from '../../../../../../lib/videoLinks'

/**
 * POST { kind: 'video' | 'tedx', url?, title? } — команда или библиотекарь отмечают, что ученик снял
 * видео о книге или выступил с ней на TEDx. Одно видео и одно выступление на книгу. Себе — нельзя.
 * url — ссылка на видео: появится в профиле ученика в «Моих видео». Если монеты уже начислены,
 * вызов со ссылкой просто добавляет видео (без повторных монет).
 * Отменить монеты — «Отменить» в блоке «Монеты» ученика.
 */
export async function POST(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const kind = body?.kind === 'tedx' ? 'tedx' : body?.kind === 'video' ? 'video' : null
  if (!kind) return NextResponse.json({ error: 'Видео или TEDx?' }, { status: 400 })
  const video = body?.url ? parseVideo(body.url) : null
  if (body?.url && !video) return NextResponse.json({ error: 'Ссылка не похожа на адрес видео' }, { status: 400 })
  if (kind === 'video' && !video) return NextResponse.json({ error: 'Вставь ссылку на видео' }, { status: 400 })
  const title = String(body?.title || '').trim().slice(0, 120) || null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(7310445, $1)', [id || 0])
    const r = await client.query(
      `SELECT b.id, b.user_id, b.book_id, b.status, b.notes, bk.title FROM borrows b JOIN books bk ON bk.id = b.book_id WHERE b.id = $1`, [id])
    const b = r.rows[0]
    if (!b) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Не найдено' }, { status: 404 }) }
    if (Number(b.user_id) === Number(guard.payload.id) && guard.payload.role !== 'librarian') {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Себе отмечает другой участник или библиотекарь' }, { status: 403 })
    }
    if (b.status !== 'approved') {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Сначала нужен одобренный отзыв об этой книге' }, { status: 400 })
    }
    const addVideo = async () => {
      if (!video) return
      await client.query(
        `INSERT INTO student_videos (user_id, borrow_id, book_id, kind, url, title, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [b.user_id, id, b.book_id, kind, video.url, title, guard.payload.id])
    }
    const dup = await client.query(`SELECT 1 FROM user_points WHERE borrow_id = $1 AND reason = $2 AND NOT reverted LIMIT 1`, [id, kind])
    if (dup.rows[0]) {
      if (!video) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Уже отмечено' }, { status: 400 }) }
      await addVideo()
      await notify(client, b.user_id, { kind: 'bonus', title: 'Твоё видео в профиле', body: `«${b.title}»`, link: '/profile#videos' })
      await client.query('COMMIT')
      return NextResponse.json({ success: true, points: 0, video_only: true })
    }
    await addVideo()
    const bonus = BONUSES[kind]
    await client.query(
      `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [b.user_id, bonus.points, kind, `${bonus.title}: «${b.title}»`, id, b.book_id, guard.payload.id])
    await notify(client, b.user_id, { kind: 'bonus', title: `+${bonus.points} монет: ${bonus.short}`, body: video ? `«${b.title}» — видео уже в твоём профиле` : `«${b.title}»`, link: video ? '/profile#videos' : '/profile' })
    await client.query('COMMIT')
    return NextResponse.json({ success: true, points: bonus.points })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[borrow bonus]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
