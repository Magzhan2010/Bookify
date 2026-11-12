import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { canFinishAt } from '../../../../../lib/ownBooks'

/**
 * POST { borrowId } — «Дочитал свою книгу». Можно не раньше минимального срока чтения.
 * После этого книга ждёт отзыва, как обычная сданная.
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  try {
    const r = await pool.query(
      `SELECT b.id, b.borrowed_at, bk.pages FROM borrows b JOIN books bk ON bk.id = b.book_id
        WHERE b.id = $1 AND b.user_id = $2 AND b.own_book AND b.status = 'active'`, [parseInt(body?.borrowId), guard.payload.id])
    const b = r.rows[0]
    if (!b) return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    const at = canFinishAt(b.borrowed_at, b.pages)
    if (Date.now() < at.getTime()) {
      return NextResponse.json({ error: `Слишком быстро — дочитать можно с ${at.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Asia/Almaty' })}` }, { status: 400 })
    }
    await pool.query(`UPDATE borrows SET status = 'returned', returned_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'active'`, [b.id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[own-books finish]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
