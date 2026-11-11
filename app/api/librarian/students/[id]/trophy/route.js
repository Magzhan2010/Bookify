import { NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'
import { requireAuth } from '../../../../../../lib/auth'
import { getGameStart } from '../../../../../../lib/game'
import { TROPHY_NOTE } from '../../../../../../lib/trophy'

/**
 * «Трофей»: книга, которую ученик прочитал до запуска Bookify, — на полку без отзыва и без монет.
 * Дата ставится до старта игры, поэтому в игру (достижения, мониторинг, лидеры) она не попадает.
 * POST { bookId } — добавить; DELETE ?borrowId= — убрать ошибочно добавленный трофей.
 */

export async function POST(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const userId = parseInt((await params).id)
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const bookId = parseInt(body?.bookId)
  if (!userId || !bookId) return NextResponse.json({ error: 'Выбери книгу' }, { status: 400 })
  if (userId === Number(guard.payload.id) && guard.payload.role !== 'librarian') {
    return NextResponse.json({ error: 'Себе добавляет другой участник или библиотекарь' }, { status: 403 })
  }
  try {
    const u = await pool.query(`SELECT id FROM users WHERE id = $1 AND role IN ('student', 'teacher')`, [userId])
    if (!u.rows[0]) return NextResponse.json({ error: 'Ученик не найден' }, { status: 404 })
    const b = await pool.query(`SELECT id, title FROM books WHERE id = $1`, [bookId])
    if (!b.rows[0]) return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    const dup = await pool.query(
      `SELECT 1 FROM borrows WHERE user_id = $1 AND book_id = $2 AND status IN ('approved', 'reviewed', 'returned') LIMIT 1`,
      [userId, bookId])
    if (dup.rows[0]) return NextResponse.json({ error: 'Эта книга уже есть у ученика' }, { status: 400 })

    const start = await getGameStart(pool)
    const at = start ? new Date(new Date(start).getTime() - 86400000) : new Date()
    const r = await pool.query(
      `INSERT INTO borrows (user_id, book_id, status, borrowed_at, due_date, returned_at, issued_by, notes)
       VALUES ($1, $2, 'approved', $3, $3, $3, $4, $5) RETURNING id`,
      [userId, bookId, at.toISOString(), guard.payload.id, TROPHY_NOTE])
    return NextResponse.json({ success: true, id: r.rows[0].id, title: b.rows[0].title })
  } catch (err) {
    console.error('[trophy POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const userId = parseInt((await params).id)
  const borrowId = parseInt(new URL(req.url).searchParams.get('borrowId'))
  try {
    const r = await pool.query(
      `DELETE FROM borrows WHERE id = $1 AND user_id = $2 AND notes = $3 RETURNING id`,
      [borrowId, userId, TROPHY_NOTE])
    if (!r.rows[0]) return NextResponse.json({ error: 'Это не трофей' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[trophy DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
