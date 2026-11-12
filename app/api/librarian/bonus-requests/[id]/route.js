import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { notify } from '../../../../../lib/notify'
import { BONUSES } from '../../../../../lib/points'

/** PATCH { action: 'approve' | 'reject', note? } — начислить бонус за видео / TEDx или отказать. Свою — нельзя. */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  if (!['approve', 'reject'].includes(body?.action)) return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
  const note = String(body?.note || '').trim().slice(0, 200) || null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const r = await client.query(
      `SELECT q.*, bk.title FROM bonus_requests q LEFT JOIN books bk ON bk.id = q.book_id WHERE q.id = $1 FOR UPDATE OF q`, [id])
    const q = r.rows[0]
    if (!q) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 }) }
    if (q.status !== 'pending') { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Заявку уже решили' }, { status: 400 }) }
    if (Number(q.user_id) === Number(guard.payload.id) && guard.payload.role !== 'librarian') {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Свой бонус проверяет другой участник или библиотекарь' }, { status: 403 })
    }
    const bonus = BONUSES[q.kind]
    if (body.action === 'approve') {
      const dup = await client.query(
        `SELECT 1 FROM user_points WHERE borrow_id = $1 AND reason = $2 AND NOT reverted LIMIT 1`, [q.borrow_id, q.kind])
      if (dup.rows[0]) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Бонус за эту книгу уже начислен' }, { status: 400 }) }
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [q.user_id, bonus.points, q.kind, `${bonus.title}${q.title ? `: «${q.title}»` : ''}`, q.borrow_id, q.book_id, guard.payload.id])
    }
    await client.query(
      `UPDATE bonus_requests SET status = $2, reject_note = $3, decided_by = $4, decided_at = NOW() WHERE id = $1`,
      [id, body.action === 'approve' ? 'approved' : 'rejected', note, guard.payload.id])
    await notify(client, q.user_id, body.action === 'approve'
      ? { kind: 'bonus', title: `+${bonus.points} монет: ${bonus.short}`, body: q.title ? `«${q.title}»` : bonus.title, link: '/profile' }
      : { kind: 'bonus_rejected', title: `${bonus.short}: не засчитано`, body: note || 'Подойди к команде, чтобы узнать подробнее', link: '/profile' })
    await client.query('COMMIT')
    return NextResponse.json({ success: true, points: body.action === 'approve' ? bonus.points : 0 })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[bonus-requests PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
