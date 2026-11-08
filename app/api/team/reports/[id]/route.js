import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/** DELETE /api/team/reports/[id] — автор или тимлид. */
export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['team'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  const me = guard.payload
  try {
    const r = await pool.query('SELECT user_id FROM task_reports WHERE id = $1', [id])
    if (!r.rows[0]) return NextResponse.json({ error: 'Отчёт не найден' }, { status: 404 })
    if (r.rows[0].user_id !== me.id && me.platform_role !== 'lead') {
      return NextResponse.json({ error: 'Можно удалить только свой отчёт' }, { status: 403 })
    }
    await pool.query('DELETE FROM task_reports WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/reports DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
