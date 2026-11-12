import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/** GET — заявки на бонус за видео / TEDx, ждут проверки. */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query(`
      SELECT q.id, q.user_id, q.kind, q.link, q.note, q.created_at,
             u.name AS student_name, u.class_name AS student_class, bk.title AS book_title
        FROM bonus_requests q JOIN users u ON u.id = q.user_id LEFT JOIN books bk ON bk.id = q.book_id
       WHERE q.status = 'pending' ORDER BY q.created_at LIMIT 100`)
    return NextResponse.json(r.rows)
  } catch (err) {
    console.error('[bonus-requests GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
