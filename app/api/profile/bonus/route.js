import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * POST { borrowId, kind: 'video'|'tedx', link?, note? } — «Я снял видео / выступил на TEDx» по прочитанной книге.
 * Можно в любое время после одобренного отзыва; монеты начисляет команда или библиотекарь после проверки.
 * По одной книге — одно видео и одно выступление.
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const kind = body?.kind === 'tedx' ? 'tedx' : body?.kind === 'video' ? 'video' : null
  const link = String(body?.link || '').trim().slice(0, 500)
  const note = String(body?.note || '').trim().slice(0, 300)
  if (!kind) return NextResponse.json({ error: 'Видео или TEDx?' }, { status: 400 })
  if (kind === 'video' && !/^https?:\/\/\S+\.\S+/.test(link)) {
    return NextResponse.json({ error: 'Вставь ссылку на видео (Instagram, YouTube, Google Drive…)' }, { status: 400 })
  }
  if (kind === 'tedx' && !note && !link) return NextResponse.json({ error: 'Напиши, когда и где выступал' }, { status: 400 })
  try {
    const b = await pool.query(
      `SELECT b.id, b.book_id FROM borrows b
        WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'approved'
          AND EXISTS (SELECT 1 FROM book_reviews r WHERE r.borrow_id = b.id AND r.status = 'approved')`,
      [parseInt(body?.borrowId), guard.payload.id])
    if (!b.rows[0]) return NextResponse.json({ error: 'Сначала нужен одобренный отзыв об этой книге' }, { status: 400 })
    const done = await pool.query(
      `SELECT 1 FROM user_points WHERE borrow_id = $1 AND reason = $2 AND NOT reverted
       UNION ALL SELECT 1 FROM bonus_requests WHERE borrow_id = $1 AND kind = $2 AND status IN ('pending', 'approved')`,
      [b.rows[0].id, kind])
    if (done.rows[0]) return NextResponse.json({ error: kind === 'video' ? 'Видео по этой книге уже есть' : 'TEDx по этой книге уже отмечен' }, { status: 400 })
    await pool.query(
      `INSERT INTO bonus_requests (user_id, borrow_id, book_id, kind, link, note) VALUES ($1, $2, $3, $4, $5, $6)`,
      [guard.payload.id, b.rows[0].id, b.rows[0].book_id, kind, link || null, note || null])
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err.code === '23505') return NextResponse.json({ error: 'Заявка уже отправлена' }, { status: 400 })
    console.error('[profile/bonus]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
