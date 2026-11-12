import { NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'
import { requireAuth } from '../../../../../../lib/auth'
import { notify } from '../../../../../../lib/notify'

/**
 * POST /api/librarian/borrows/[id]/close — закрыть книгу ученика, ничего не добавляя в профиль.
 * - сдана, ждёт отзыва / отзыв на проверке → «вернул без отзыва» (библиотекарь и команда);
 * - уже на полке (одобрена) → убрать с полки и отменить монеты за неё (только библиотекарь и тимлид).
 * Body: { note? }
 */
export async function POST(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  let body = {}
  try { body = await req.json() } catch {}
  const note = String(body?.note || '').trim().slice(0, 200)
  const me = guard.payload
  const canRemove = me.role === 'librarian' || me.platform_role === 'lead'

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const r = await client.query(
      `SELECT b.*, bk.title FROM borrows b JOIN books bk ON bk.id = b.book_id WHERE b.id = $1 FOR UPDATE OF b`, [id])
    const b = r.rows[0]
    if (!b) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Не найдено' }, { status: 404 }) }
    if (Number(b.user_id) === Number(me.id) && me.role !== 'librarian') {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Свою книгу закрывает другой участник или библиотекарь' }, { status: 403 })
    }
    if (b.status === 'active') { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Книга ещё у ученика — прими возврат «Без отзыва»' }, { status: 400 }) }
    if (b.status === 'cancelled') { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Уже закрыто' }, { status: 400 }) }

    let reverted = 0
    if (b.status === 'approved') {
      if (!canRemove) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Убрать с полки может библиотекарь или тимлид' }, { status: 403 }) }
      // Монеты за эту книгу — обратными записями (история сохраняется)
      const pts = await client.query(
        `SELECT * FROM user_points WHERE borrow_id = $1 AND points > 0 AND NOT reverted AND revert_of IS NULL FOR UPDATE`, [id])
      for (const p of pts.rows) {
        await client.query(
          `INSERT INTO user_points (user_id, points, reason, description, book_id, created_by, created_at, revert_of)
           VALUES ($1, $2, 'adjust', $3, $4, $5, $6, $7)`,
          [p.user_id, -p.points, `Отмена: ${p.description || p.reason} — книга убрана с полки`, p.book_id, me.id, p.created_at, p.id])
        await client.query(`UPDATE user_points SET reverted = TRUE WHERE id = $1`, [p.id])
        reverted += p.points
      }
      await client.query(`UPDATE book_reviews SET status = 'rejected', review_note = $2 WHERE borrow_id = $1`, [id, note || 'Книга убрана с полки'])
    } else {
      // returned / reviewed: отзыв больше не ждём
      await client.query(`DELETE FROM book_reviews WHERE borrow_id = $1 AND status IN ('pending', 'rejected')`, [id])
    }
    await client.query(`UPDATE bonus_requests SET status = 'rejected', reject_note = 'Книга закрыта' WHERE borrow_id = $1 AND status = 'pending'`, [id])
    await client.query(
      `UPDATE borrows SET status = 'cancelled', notes = $2, updated_at = NOW() WHERE id = $1`,
      [id, b.status === 'approved' ? 'Убрано с полки' : 'Закрыто без отзыва'])
    await notify(client, b.user_id, {
      kind: 'borrow_closed',
      title: b.status === 'approved' ? 'Книгу убрали с полки' : 'Отзыв по книге больше не нужен',
      body: `«${b.title}»${reverted ? ` · −${reverted} монет` : ''}${note ? ` · ${note}` : ''}`, link: '/profile'
    })
    await client.query('COMMIT')
    return NextResponse.json({ success: true, reverted })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[borrow close]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
