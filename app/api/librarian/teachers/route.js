import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { notify } from '../../../../lib/notify'

/** GET — заявки учителей и подтверждённые учителя (+ их советы книг). */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query(`
      SELECT u.id, u.name, u.email, u.class_name, u.avatar_url, u.teacher_pending, u.created_at,
             (SELECT COUNT(*) FROM borrows b WHERE b.user_id = u.id)::int AS borrows,
             (SELECT COUNT(*) FROM teacher_recommendations t WHERE t.teacher_id = u.id)::int AS recommendations
        FROM users u WHERE u.role = 'teacher'
       ORDER BY u.teacher_pending DESC, u.name`)
    return NextResponse.json({
      pending: r.rows.filter(t => t.teacher_pending),
      teachers: r.rows.filter(t => !t.teacher_pending)
    })
  } catch (err) {
    console.error('[teachers GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/** POST { userId, className? } — сделать ученика (зарегистрированного учителя) учителем. */
export async function POST(req) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const userId = parseInt(body?.userId)
  try {
    const inTeam = await pool.query('SELECT 1 FROM team_members WHERE user_id = $1', [userId])
    if (inTeam.rows[0]) return NextResponse.json({ error: 'Это участник команды проекта' }, { status: 400 })
    const r = await pool.query(
      `UPDATE users SET role = 'teacher', teacher_pending = FALSE,
              class_name = COALESCE($2, class_name), token_version = COALESCE(token_version, 0) + 1, updated_at = NOW()
        WHERE id = $1 AND role = 'student' RETURNING id, name`,
      [userId, String(body?.className || '').trim() || null])
    if (!r.rows[0]) return NextResponse.json({ error: 'Ученик не найден' }, { status: 404 })
    await notify(pool, userId, { kind: 'teacher', title: 'Вам открыт кабинет учителя', body: 'Войдите заново — в меню появится раздел «Мой класс».', link: '/teacher' })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[teachers POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
