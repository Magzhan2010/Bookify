import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { openPassword } from '../../../../../lib/passVault'

/**
 * GET ?class=9A — логины и выданные пароли списком (для листочков ученикам).
 * Библиотекарь и тимлид; просмотр записывается в журнал. Участники команды — без пароля.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  const cls = new URL(req.url).searchParams.get('class')?.trim() || null
  try {
    const r = await pool.query(
      `SELECT u.id, u.name, u.email, u.class_name, u.role, u.password_view,
              EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id) AS in_team
         FROM users u
        WHERE u.role IN ('student', 'teacher') ${cls ? 'AND u.class_name = $1' : ''}
        ORDER BY u.role DESC, u.class_name NULLS LAST, u.name`, cls ? [cls] : [])
    const rows = r.rows.map(u => ({
      id: u.id, name: u.name, email: u.email, class_name: u.class_name, role: u.role,
      password: u.in_team ? null : openPassword(u.password_view),
      note: u.in_team ? 'команда' : u.password_view ? null : 'не задан школой'
    }))
    const shown = rows.filter(x => x.password).length
    if (shown) {
      await pool.query(`INSERT INTO password_view_log (viewer_id, user_id, count) VALUES ($1, NULL, $2)`, [guard.payload.id, shown])
    }
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[credentials list]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
