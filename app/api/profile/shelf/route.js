import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { getGameStart } from '../../../../lib/game'
import { TROPHY_NOTE, addShelfBook } from '../../../../lib/trophy'

/**
 * «На мою полку» — ученик сам ставит книгу на полку: без отзыва, без страниц, без монет.
 * GET ?bookId=   — где книга у ученика: none | shelf | read | reading
 * POST { bookId } — поставить книгу из каталога на полку
 * POST { borrowId } — сданная книга, отзыв писать не хочет: «без отзыва — на полку»
 * DELETE ?bookId= — убрать с полки (только то, что поставлено без отзыва)
 */
const MAX_SHELF = 150

async function stateFor(userId, bookId) {
  const r = await pool.query(
    `SELECT id, status, notes FROM borrows WHERE user_id = $1 AND book_id = $2 AND status <> 'cancelled'
      ORDER BY (status = 'active') DESC, id DESC`, [userId, bookId])
  const rows = r.rows
  if (rows.some(x => x.status === 'active')) return { state: 'reading' }
  const shelf = rows.find(x => x.status === 'approved' && x.notes === TROPHY_NOTE)
  if (shelf) return { state: 'shelf', borrowId: shelf.id }
  if (rows.some(x => ['approved', 'reviewed'].includes(x.status))) return { state: 'read' }
  const pendingReview = rows.find(x => x.status === 'returned')
  if (pendingReview) return { state: 'returned', borrowId: pendingReview.id }
  return { state: 'none' }
}

export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const bookId = parseInt(new URL(req.url).searchParams.get('bookId'))
  if (!bookId) return NextResponse.json({ error: 'Не указана книга' }, { status: 400 })
  try {
    return NextResponse.json(await stateFor(guard.payload.id, bookId))
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

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let bookId = parseInt(body?.bookId)
    // Сданная книга без отзыва → закрываем её «без отзыва» и ставим на полку
    if (body?.borrowId) {
      const b = await client.query(
        `SELECT id, book_id, status FROM borrows WHERE id = $1 AND user_id = $2 FOR UPDATE`, [parseInt(body.borrowId), userId])
      const row = b.rows[0]
      if (!row) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 }) }
      if (row.status !== 'returned') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: row.status === 'active' ? 'Сначала сдай книгу в библиотеку' : 'Отзыв уже отправлен — книга попадёт на полку после проверки' }, { status: 400 })
      }
      await client.query(`UPDATE borrows SET status = 'cancelled', notes = 'На полку без отзыва', updated_at = NOW() WHERE id = $1`, [row.id])
      await client.query(`DELETE FROM book_reviews WHERE borrow_id = $1 AND status = 'rejected'`, [row.id])
      bookId = row.book_id
    }
    if (!bookId) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Не указана книга' }, { status: 400 }) }

    const book = await client.query(`SELECT id, title FROM books WHERE id = $1`, [bookId])
    if (!book.rows[0]) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 }) }
    const have = await client.query(
      `SELECT status FROM borrows WHERE user_id = $1 AND book_id = $2 AND status IN ('active', 'approved', 'reviewed', 'returned')`,
      [userId, bookId])
    if (have.rows.some(x => x.status === 'active')) {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Книга сейчас у тебя — сначала сдай её' }, { status: 400 })
    }
    if (have.rows.some(x => x.status === 'returned')) {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Эта книга ждёт отзыва — в профиле нажми «Без отзыва — на полку»' }, { status: 400 })
    }
    if (have.rows.length) {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Книга уже на полке' }, { status: 400 })
    }
    const count = await client.query(`SELECT COUNT(*)::int AS n FROM borrows WHERE user_id = $1 AND notes = $2`, [userId, TROPHY_NOTE])
    if (count.rows[0].n >= MAX_SHELF) {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'На полке уже слишком много книг без отзыва' }, { status: 400 })
    }
    const id = await addShelfBook(client, { userId, bookId, byId: userId, gameStart: await getGameStart(client) })
    // Заявку «хочу забрать» на эту книгу закрываем — книга уже на полке
    await client.query(
      `UPDATE book_requests SET status = 'cancelled' WHERE user_id = $1 AND book_id = $2 AND status IN ('pending', 'approved')`,
      [userId, bookId]).catch(() => {})
    await client.query('COMMIT')
    return NextResponse.json({ success: true, borrowId: id, title: book.rows[0].title })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[profile/shelf POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function DELETE(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const bookId = parseInt(new URL(req.url).searchParams.get('bookId'))
  try {
    const r = await pool.query(
      `DELETE FROM borrows WHERE user_id = $1 AND book_id = $2 AND notes = $3 AND status = 'approved' RETURNING id`,
      [guard.payload.id, bookId, TROPHY_NOTE])
    if (!r.rows[0]) return NextResponse.json({ error: 'Эту книгу убрать нельзя' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[profile/shelf DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
