import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { notify } from '../../../../../lib/notify'
import { PAGES_MIN, PAGES_MAX, minReadDays } from '../../../../../lib/ownBooks'

/**
 * PATCH { action: 'approve' | 'reject', note?, title?, author?, pages? }
 * approve: «видел книгу» — создаём книгу ученика (в каталоге её нет) и запускаем чтение с этой минуты.
 * Проверяющий может поправить название, автора и страницы. Свою заявку участник команды не решает.
 */
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
    const r = await client.query(`SELECT * FROM own_book_requests WHERE id = $1 FOR UPDATE`, [id])
    const o = r.rows[0]
    if (!o) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 }) }
    if (o.status !== 'pending') { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Заявку уже решили' }, { status: 400 }) }
    if (Number(o.user_id) === Number(guard.payload.id) && guard.payload.role !== 'librarian') {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Свою книгу подтверждает другой участник или библиотекарь' }, { status: 403 })
    }

    if (body.action === 'reject') {
      await client.query(`UPDATE own_book_requests SET status = 'rejected', note = $2, decided_by = $3, decided_at = NOW() WHERE id = $1`,
        [id, note, guard.payload.id])
      await notify(client, o.user_id, { kind: 'own_book_rejected', title: 'Свою книгу не подтвердили', body: note ? `«${o.title}»: ${note}` : `«${o.title}»`, link: '/profile' })
      await client.query('COMMIT')
      return NextResponse.json({ success: true })
    }

    const title = String(body.title || o.title).trim().slice(0, 200)
    const author = String(body.author || o.author).trim().slice(0, 120)
    const pages = parseInt(body.pages) || o.pages
    if (!title || !author || pages < PAGES_MIN || pages > PAGES_MAX) {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Проверь название, автора и страницы' }, { status: 400 })
    }
    // Книга ученика: в архиве (в каталоге и выдаче её нет), с владельцем
    const book = await client.query(
      `INSERT INTO books (title, author, pages, cover_url, total_copies, available_copies, owner_id, archived_at)
       VALUES ($1, $2, $3, $4, 0, 0, $5, NOW()) RETURNING id`,
      [title, author, pages, o.photo, o.user_id])
    const borrow = await client.query(
      `INSERT INTO borrows (user_id, book_id, status, borrowed_at, due_date, issued_by, own_book, notes)
       VALUES ($1, $2, 'active', NOW(), NULL, $3, TRUE, 'Своя книга') RETURNING id`,
      [o.user_id, book.rows[0].id, guard.payload.id])
    await client.query(
      `UPDATE own_book_requests SET status = 'approved', note = $2, decided_by = $3, decided_at = NOW(), book_id = $4, borrow_id = $5,
              title = $6, author = $7, pages = $8, photo = NULL WHERE id = $1`,
      [id, note, guard.payload.id, book.rows[0].id, borrow.rows[0].id, title, author, pages])
    await notify(client, o.user_id, {
      kind: 'own_book_started', title: 'Своя книга засчитана — читай!',
      body: `«${title}». Нажать «Дочитал» можно через ${minReadDays(pages)} дн., потом пиши отзыв.`, link: '/profile'
    })
    await client.query('COMMIT')
    return NextResponse.json({ success: true, book_id: book.rows[0].id, borrow_id: borrow.rows[0].id })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[own-books decide]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
