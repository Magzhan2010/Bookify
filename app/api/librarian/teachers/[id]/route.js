import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { notify } from '../../../../../lib/notify'

/**
 * PATCH /api/librarian/teachers/[id]
 * Body: { action: 'approve' | 'reject' | 'demote', className? }
 *  approve — подтвердить заявку учителя; reject / demote — сделать обычным читателем (учеником);
 *  className — класс, где учитель классный руководитель.
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const cls = 'className' in (body || {}) ? (String(body.className || '').trim().slice(0, 40) || null) : undefined

  try {
    let r
    if (body?.action === 'approve') {
      r = await pool.query(
        `UPDATE users SET teacher_pending = FALSE, class_name = COALESCE($2, class_name), updated_at = NOW()
          WHERE id = $1 AND role = 'teacher' RETURNING id`, [id, cls ?? null])
      if (r.rows[0]) await notify(pool, id, { kind: 'teacher', title: 'Аккаунт учителя подтверждён', body: 'В меню появился раздел «Мой класс».', link: '/teacher' })
    } else if (body?.action === 'reject' || body?.action === 'demote') {
      r = await pool.query(
        `UPDATE users SET role = 'student', teacher_pending = FALSE, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW()
          WHERE id = $1 AND role = 'teacher' RETURNING id`, [id])
    } else if (cls !== undefined) {
      r = await pool.query(`UPDATE users SET class_name = $2, updated_at = NOW() WHERE id = $1 AND role = 'teacher' RETURNING id`, [id, cls])
    } else {
      return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
    }
    if (!r.rows[0]) return NextResponse.json({ error: 'Учитель не найден' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[teachers PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
