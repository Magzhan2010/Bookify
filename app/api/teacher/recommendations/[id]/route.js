import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/** DELETE — убрать свой совет. */
export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['teacher', 'librarian'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  try {
    await pool.query(
      `DELETE FROM teacher_recommendations WHERE id = $1 AND (teacher_id = $2 OR $3)`,
      [id, guard.payload.id, guard.payload.role === 'librarian'])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[recs DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
