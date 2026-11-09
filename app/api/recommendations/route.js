import { NextResponse } from 'next/server'
import pool from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

/** GET — что советуют учителя мне (моему классу и всей школе). */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  try {
    const me = await pool.query('SELECT class_name FROM users WHERE id = $1', [guard.payload.id])
    const cls = me.rows[0]?.class_name || null
    const r = await pool.query(`
      SELECT DISTINCT ON (b.id) t.id, t.note, t.class_name, t.created_at,
             u.name AS teacher_name, u.avatar_url AS teacher_avatar,
             b.id AS book_id, b.title, b.author, b.cover_url
        FROM teacher_recommendations t
        JOIN books b ON b.id = t.book_id
        JOIN users u ON u.id = t.teacher_id
       WHERE t.class_name IS NULL OR t.class_name = $1
       ORDER BY b.id, t.created_at DESC`, [cls])
    const rows = r.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12)
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[recommendations]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
