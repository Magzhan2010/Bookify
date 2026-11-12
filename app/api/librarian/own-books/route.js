import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/** GET — заявки «читаю свою книгу», ждут подтверждения. */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query(`
      SELECT o.id, o.user_id, o.title, o.author, o.pages, o.photo, o.created_at,
             u.name AS student_name, u.class_name AS student_class, u.role AS student_role,
             (SELECT b.id FROM books b WHERE b.owner_id IS NULL AND b.archived_at IS NULL
               AND LOWER(b.title) = LOWER(o.title) LIMIT 1) AS library_book_id
        FROM own_book_requests o JOIN users u ON u.id = o.user_id
       WHERE o.status = 'pending'
       ORDER BY o.created_at LIMIT 100`)
    return NextResponse.json(r.rows)
  } catch (err) {
    console.error('[own-books queue]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
