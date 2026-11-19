import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { fmtWhen, notifyMeeting } from '../../../../lib/meetings'

/**
 * PATCH /api/meetings/[id]
 *  { response: 'yes' | 'no' } — приглашённый отвечает, придёт ли;
 *  { cancel: true }           — отменить (кто созвал или тимлид); всем приходит уведомление.
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const me = guard.payload
  const { id } = await params
  const meetingId = Number(id)

  try {
    const b = await req.json().catch(() => ({}))
    const m = (await pool.query('SELECT * FROM meetings WHERE id = $1', [meetingId])).rows[0]
    if (!m) return NextResponse.json({ error: 'Собрание не найдено' }, { status: 404 })

    if (b.cancel) {
      const allowed = m.created_by === me.id || me.platform_role === 'lead'
      if (!allowed) return NextResponse.json({ error: 'Отменить может тот, кто созвал, или тимлид' }, { status: 403 })
      if (m.cancelled_at) return NextResponse.json({ ok: true })
      await pool.query('UPDATE meetings SET cancelled_at = NOW() WHERE id = $1', [meetingId])
      if (new Date(m.starts_at) > Date.now() - 3600000) {
        const ids = (await pool.query('SELECT user_id FROM meeting_invites WHERE meeting_id = $1', [meetingId])).rows.map(r => r.user_id)
        await notifyMeeting(pool, ids, {
          kind: 'meeting_cancel',
          title: `Собрание отменено: ${m.title}`,
          body: `Не нужно приходить ${fmtWhen(m.starts_at)} — ${m.place}.`,
          dedupe: `meet-cancel-${meetingId}-`
        })
      }
      return NextResponse.json({ ok: true })
    }

    if (b.response === 'yes' || b.response === 'no') {
      if (m.cancelled_at) return NextResponse.json({ error: 'Собрание отменено' }, { status: 400 })
      const upd = await pool.query(
        `UPDATE meeting_invites SET response = $3, responded_at = NOW()
          WHERE meeting_id = $1 AND user_id = $2`,
        [meetingId, me.id, b.response]
      )
      if (!upd.rowCount) return NextResponse.json({ error: 'Тебя не звали на это собрание' }, { status: 403 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Нечего менять' }, { status: 400 })
  } catch (err) {
    console.error('[meetings PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
