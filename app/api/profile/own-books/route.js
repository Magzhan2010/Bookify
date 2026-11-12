import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { MAX_OWN_ACTIVE, PAGES_MIN, PAGES_MAX, titleKey, canFinishAt, minReadDays } from '../../../../lib/ownBooks'

/**
 * Свои книги ученика/учителя.
 * GET — заявки и книги «читаю сейчас / дочитал».
 * POST { title, author, pages, photo? } — заявка начать читать свою книгу (подтверждает библиотекарь или команда).
 * DELETE ?id= — отменить заявку, пока её не рассмотрели.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  try {
    const [reqs, borrows] = await Promise.all([
      pool.query(
        `SELECT id, title, author, pages, status, note, created_at, decided_at
           FROM own_book_requests WHERE user_id = $1 AND status IN ('pending', 'rejected')
          ORDER BY created_at DESC LIMIT 20`, [guard.payload.id]),
      pool.query(
        `SELECT b.id AS borrow_id, b.status, b.borrowed_at, b.returned_at, bk.id AS book_id, bk.title, bk.author, bk.pages, bk.cover_url
           FROM borrows b JOIN books bk ON bk.id = b.book_id
          WHERE b.user_id = $1 AND b.own_book AND b.status = 'active'
          ORDER BY b.borrowed_at DESC`, [guard.payload.id])
    ])
    return NextResponse.json({
      requests: reqs.rows,
      reading: borrows.rows.map(b => ({ ...b, can_finish_at: canFinishAt(b.borrowed_at, b.pages), min_days: minReadDays(b.pages) }))
    })
  } catch (err) {
    console.error('[own-books GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  const userId = guard.payload.id
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const title = String(body?.title || '').trim().replace(/\s+/g, ' ').slice(0, 200)
  const author = String(body?.author || '').trim().replace(/\s+/g, ' ').slice(0, 120)
  const pages = parseInt(body?.pages)
  const photo = typeof body?.photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(body.photo) ? body.photo : null
  if (title.length < 2 || author.length < 2) return NextResponse.json({ error: 'Напиши название и автора' }, { status: 400 })
  if (!pages || pages < PAGES_MIN || pages > PAGES_MAX) return NextResponse.json({ error: `Сколько страниц в книге? (${PAGES_MIN}–${PAGES_MAX})` }, { status: 400 })
  if (photo && photo.length > 400000) return NextResponse.json({ error: 'Фото слишком большое' }, { status: 400 })

  try {
    const open = await pool.query(
      `SELECT (SELECT COUNT(*) FROM own_book_requests WHERE user_id = $1 AND status = 'pending')::int
            + (SELECT COUNT(*) FROM borrows WHERE user_id = $1 AND own_book AND status = 'active')::int AS n`, [userId])
    if (open.rows[0].n >= MAX_OWN_ACTIVE) {
      return NextResponse.json({ error: `Одновременно можно читать не больше ${MAX_OWN_ACTIVE} своих книг — сначала дочитай` }, { status: 400 })
    }
    // Ту же книгу второй раз не засчитываем: ни свою, ни библиотечную
    const mine = await pool.query(
      `SELECT bk.title FROM borrows b JOIN books bk ON bk.id = b.book_id
        WHERE b.user_id = $1 AND b.status <> 'cancelled'
       UNION ALL
       SELECT title FROM own_book_requests WHERE user_id = $1 AND status = 'pending'`, [userId])
    if (mine.rows.some(r => titleKey(r.title) === titleKey(title))) {
      return NextResponse.json({ error: 'Эта книга у тебя уже есть — второй раз её не засчитать' }, { status: 400 })
    }
    const r = await pool.query(
      `INSERT INTO own_book_requests (user_id, title, author, pages, photo) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, title, author, pages, photo])
    return NextResponse.json({ success: true, id: r.rows[0].id })
  } catch (err) {
    console.error('[own-books POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const id = parseInt(new URL(req.url).searchParams.get('id'))
  try {
    const r = await pool.query(
      `DELETE FROM own_book_requests WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'rejected') RETURNING id`, [id, guard.payload.id])
    if (!r.rows[0]) return NextResponse.json({ error: 'Заявку уже рассмотрели' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[own-books DELETE]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
