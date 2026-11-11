import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { getGameStart } from '../../../../../lib/game'
import { addShelfBook } from '../../../../../lib/trophy'
import { notify } from '../../../../../lib/notify'

/**
 * PATCH /api/librarian/shelf-requests/[id] — { action: 'approve' | 'reject', note? }
 * approve: книга встаёт на полку (без монет); если это была сданная книга без отзыва — отзыв больше не ждём.
 * Свою заявку участник команды не решает.
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const action = body?.action
  if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
  const note = String(body?.note || '').trim().slice(0, 200) || null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const r = await client.query(
      `SELECT s.*, b.title FROM shelf_requests s JOIN books b ON b.id = s.book_id WHERE s.id = $1 FOR UPDATE OF s`, [id])
    const s = r.rows[0]
    if (!s) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 }) }
    if (s.status !== 'pending') { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Заявку уже решили' }, { status: 400 }) }
    if (Number(s.user_id) === Number(guard.payload.id) && guard.payload.role !== 'librarian') {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Свою заявку решает другой участник или библиотекарь' }, { status: 403 })
    }

    if (action === 'approve') {
      const have = await client.query(
        `SELECT 1 FROM borrows WHERE user_id = $1 AND book_id = $2 AND status IN ('approved', 'reviewed', 'active') LIMIT 1`,
        [s.user_id, s.book_id])
      if (!have.rows[0]) {
        await addShelfBook(client, { userId: s.user_id, bookId: s.book_id, byId: guard.payload.id, gameStart: await getGameStart(client) })
      }
      if (s.borrow_id) {
        await client.query(
          `UPDATE borrows SET status = 'cancelled', notes = 'На полку без отзыва', updated_at = NOW() WHERE id = $1 AND status = 'returned'`,
          [s.borrow_id])
        await client.query(`DELETE FROM book_reviews WHERE borrow_id = $1 AND status = 'rejected'`, [s.borrow_id])
      }
      await client.query(
        `UPDATE book_requests SET status = 'cancelled' WHERE user_id = $1 AND book_id = $2 AND status IN ('pending', 'approved')`,
        [s.user_id, s.book_id]).catch(() => {})
    }
    await client.query(
      `UPDATE shelf_requests SET status = $1, note = $2, decided_by = $3, decided_at = NOW() WHERE id = $4`,
      [action === 'approve' ? 'approved' : 'rejected', note, guard.payload.id, id])
    await notify(client, s.user_id, action === 'approve'
      ? { kind: 'shelf_approved', title: 'Книга на твоей полке', body: `«${s.title}» — без отзыва и без монет`, link: '/profile' }
      : { kind: 'shelf_rejected', title: 'Книгу не поставили на полку', body: note ? `«${s.title}»: ${note}` : `«${s.title}»`, link: `/books/${s.book_id}` })
    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[shelf-requests PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
