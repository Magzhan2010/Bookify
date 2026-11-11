import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { TROPHY_NOTE } from '../../../../lib/trophy'

/**
 * «На мою полку» — заявка ученика поставить книгу на полку без отзыва и без монет.
 * Ставит книгу библиотекарь или команда (/api/librarian/shelf-requests), ученик только просит.
 * GET ?bookId=   — none | pending | shelf | read | reading | returned
 * POST { bookId } — попросить книгу из каталога; POST { borrowId } — сданная книга без отзыва
 * DELETE ?bookId= — отменить заявку или убрать книгу, поставленную без отзыва
 */
const MAX_PENDING = 5

async function stateFor(db, userId, bookId) {
  const [b, r] = await Promise.all([
    db.query(`SELECT id, status, notes FROM borrows WHERE user_id = $1 AND book_id = $2 AND status <> 'cancelled'`, [userId, bookId]),
    db.query(`SELECT id FROM shelf_requests WHERE user_id = $1 AND book_id = $2 AND status = 'pending'`, [userId, bookId])
  ])
  const rows = b.rows
  if (rows.some(x => x.status === 'active')) return { state: 'reading' }
  if (rows.some(x => x.status === 'approved' && x.notes === TROPHY_NOTE)) return { state: 'shelf' }
  if (rows.some(x => ['approved', 'reviewed'].includes(x.status))) return { state: 'read' }
  if (r.rows[0]) return { state: 'pending' }
  const ret = rows.find(x => x.status === 'returned')
  if (ret) return { state: 'returned', borrowId: ret.id }
  return { state: 'none' }
}

export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const bookId = parseInt(new URL(req.url).searchParams.get('bookId'))
  if (!bookId) return NextResponse.json({ error: 'Не указана книга' }, { status: 400 })
  try {
    return NextResponse.json(await stateFor(pool, guard.payload.id, bookId))
  } catch (err) {
    console.error('[profile/shelf GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  const userId = guard.payload.id
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }

  try {
    let bookId = parseInt(body?.bookId)
    let borrowId = null
    if (body?.borrowId) {
      const b = await pool.query(`SELECT id, book_id, status FROM borrows WHERE id = $1 AND user_id = $2`, [parseInt(body.borrowId), userId])
      const row = b.rows[0]
      if (!row) return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
      if (row.status !== 'returned') {
        return NextResponse.json({ error: row.status === 'active' ? 'Сначала сдай книгу в библиотеку' : 'Отзыв уже отправлен — книга попадёт на полку после проверки' }, { status: 400 })
      }
      bookId = row.book_id; borrowId = row.id
    }
    if (!bookId) return NextResponse.json({ error: 'Не указана книга' }, { status: 400 })

    const st = await stateFor(pool, userId, bookId)
    if (st.state === 'reading') return NextResponse.json({ error: 'Книга сейчас у тебя — сначала сдай её' }, { status: 400 })
    if (st.state === 'shelf' || st.state === 'read') return NextResponse.json({ error: 'Книга уже на полке' }, { status: 400 })
    if (st.state === 'pending') return NextResponse.json({ error: 'Заявка уже отправлена' }, { status: 400 })
    if (st.state === 'returned' && !borrowId) borrowId = st.borrowId

    const n = await pool.query(`SELECT COUNT(*)::int AS n FROM shelf_requests WHERE user_id = $1 AND status = 'pending'`, [userId])
    if (n.rows[0].n >= MAX_PENDING) {
      return NextResponse.json({ error: `Сразу можно попросить не больше ${MAX_PENDING} книг — подожди, пока проверят` }, { status: 400 })
    }
    const book = await pool.query(`SELECT title FROM books WHERE id = $1`, [bookId])
    if (!book.rows[0]) return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    await pool.query(
      `INSERT INTO shelf_requests (user_id, book_id, borrow_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [userId, bookId, borrowId])
    return NextResponse.json({ success: true, state: 'pending', title: book.rows[0].title })
  } catch (err) {
    console.error('[profile/shelf POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const bookId = parseInt(new URL(req.url).searchParams.get('bookId'))
  try {
    const cancel = await pool.query(
      `DELETE FROM shelf_requests WHERE user_id = $1 AND book_id = $2 AND status = 'pending' RETURNING id`, [guard.payload.id, bookId])
    if (cancel.rows[0]) return NextResponse.json({ success: true, state: 'none' })
    const r = await pool.query(
      `DELETE FROM borrows WHERE user_id = $1 AND book_id = $2 AND notes = $3 AND status = 'approved' RETURNING id`,
      [guard.payload.id, bookId, TROPHY_NOTE])
    if (!r.rows[0]) return NextResponse.json({ error: 'Эту книгу убрать нельзя' }, { status: 400 })
    return NextResponse.json({ success: true, state: 'none' })
  } catch (err) {
    console.error('[profile/shelf DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
