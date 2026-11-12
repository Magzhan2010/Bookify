import { NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'
import { requireAuth } from '../../../../../../lib/auth'
import { openPassword } from '../../../../../../lib/passVault'

/**
 * GET — логин и выданный школой пароль ученика (библиотекарь и тимлид). Каждый просмотр — в журнал.
 * Пароль участника команды и пароль, который человек поставил себе сам, не показываются.
 */
export async function GET(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  try {
    const r = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.password_view,
              EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id) AS in_team
         FROM users u WHERE u.id = $1`, [id])
    const u = r.rows[0]
    if (!u || u.role === 'librarian') return NextResponse.json({ error: 'Не найден' }, { status: 404 })
    let password = null, note = null
    if (u.in_team && Number(u.id) !== Number(guard.payload.id)) note = 'Участник команды — пароль не показываем'
    else if (!u.password_view) note = 'Пароль поставлен самим учеником или до этой функции — задай новый, тогда он будет виден'
    else {
      password = openPassword(u.password_view)
      if (!password) note = 'Не удалось расшифровать — задай пароль заново'
      else await pool.query(`INSERT INTO password_view_log (viewer_id, user_id) VALUES ($1, $2)`, [guard.payload.id, u.id])
    }
    return NextResponse.json({ email: u.email, password, note })
  } catch (err) {
    console.error('[credentials one]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
