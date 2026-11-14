import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { MAX_OWN_ACTIVE, PAGES_MIN, PAGES_MAX, titleKey, canFinishAt, minReadDays } from '../../../../lib/ownBooks'

/**
 * Свои книги ученика/учителя.
 * GET — заявки, книги «читаю сейчас» и все подтверждённые свои книги.
 * POST { title, author, pages, words_per_page?, photo? } — заявка начать читать свою книгу (подтверждает библиотекарь или команда).
 * PATCH { requestId | bookId, title, author, pages?, words_per_page?, photo?, description? } — поправить свою книгу:
 *   заявку, пока её не рассмотрели, — целиком; уже подтверждённую — название, автора, обложку и описание
 *   (страницы после подтверждения меняет только команда: от них зависят монеты).
 *   photo: data:image/… — новая обложка, 'remove' — убрать, иначе не трогаем.
 * DELETE ?id= — отменить заявку, пока её не рассмотрели.
 */
const clean = (v, n) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, n)
const photoOf = v => (typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(v) ? v : null)
const wordsOf = v => { const w = parseInt(v); return w > 0 && w < 2000 ? w : null }

export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  try {
    await ensureSchema()
    const [reqs, borrows, mine] = await Promise.all([
      pool.query(
        `SELECT id, title, author, pages, words_per_page, photo, status, note, created_at, decided_at
           FROM own_book_requests WHERE user_id = $1 AND status IN ('pending', 'rejected')
          ORDER BY created_at DESC LIMIT 20`, [guard.payload.id]),
      pool.query(
        `SELECT b.id AS borrow_id, b.status, b.borrowed_at, b.returned_at, bk.id AS book_id, bk.title, bk.author, bk.pages, bk.cover_url
           FROM borrows b JOIN books bk ON bk.id = b.book_id
          WHERE b.user_id = $1 AND b.own_book AND b.status = 'active'
          ORDER BY b.borrowed_at DESC`, [guard.payload.id]),
      pool.query(
        `SELECT DISTINCT ON (bk.id) bk.id AS book_id, bk.title, bk.author, bk.pages, bk.page_coef, bk.cover_url, bk.description,
                b.id AS borrow_id, b.status, b.borrowed_at
           FROM books bk JOIN borrows b ON b.book_id = bk.id AND b.own_book AND b.user_id = $1
          WHERE bk.owner_id = $1 AND b.status <> 'cancelled'
          ORDER BY bk.id, b.borrowed_at DESC`, [guard.payload.id])
    ])
    return NextResponse.json({
      requests: reqs.rows,
      books: mine.rows.sort((a, b) => new Date(b.borrowed_at) - new Date(a.borrowed_at)),
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
  const title = clean(body?.title, 200)
  const author = clean(body?.author, 120)
  const pages = parseInt(body?.pages)
  const words = wordsOf(body?.words_per_page)
  const photo = photoOf(body?.photo)
  if (title.length < 2 || author.length < 2) return NextResponse.json({ error: 'Напиши название и автора' }, { status: 400 })
  if (!pages || pages < PAGES_MIN || pages > PAGES_MAX) return NextResponse.json({ error: `Сколько страниц в книге? (${PAGES_MIN}–${PAGES_MAX})` }, { status: 400 })
  if (photo && photo.length > 400000) return NextResponse.json({ error: 'Фото слишком большое' }, { status: 400 })

  try {
    await ensureSchema()
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
      `INSERT INTO own_book_requests (user_id, title, author, pages, photo, words_per_page) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, title, author, pages, photo, words])
    return NextResponse.json({ success: true, id: r.rows[0].id })
  } catch (err) {
    console.error('[own-books POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function PATCH(req) {
  const guard = await requireAuth(req, ['student', 'teacher'])
  if (!guard.ok) return guard.response
  const userId = guard.payload.id
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const title = clean(body?.title, 200)
  const author = clean(body?.author, 120)
  const description = String(body?.description ?? '').trim().slice(0, 3000)
  const photo = photoOf(body?.photo)
  const removePhoto = body?.photo === 'remove'
  const reqId = parseInt(body?.requestId) || null
  const bookId = parseInt(body?.bookId) || null
  if (title.length < 2 || author.length < 2) return NextResponse.json({ error: 'Напиши название и автора' }, { status: 400 })
  if (photo && photo.length > 400000) return NextResponse.json({ error: 'Фото слишком большое' }, { status: 400 })

  try {
    await ensureSchema()
    // Название не должно совпасть с другой моей книгой — иначе одну книгу засчитали бы дважды
    const others = await pool.query(
      `SELECT bk.id AS book_id, NULL::int AS req_id, bk.title FROM borrows b JOIN books bk ON bk.id = b.book_id
        WHERE b.user_id = $1 AND b.status <> 'cancelled'
       UNION ALL
       SELECT NULL, id, title FROM own_book_requests WHERE user_id = $1 AND status = 'pending'`, [userId])
    const clash = others.rows.some(r => titleKey(r.title) === titleKey(title)
      && !(reqId && r.req_id === reqId) && !(bookId && r.book_id === bookId))
    if (clash) return NextResponse.json({ error: 'Книга с таким названием у тебя уже есть' }, { status: 400 })

    if (reqId) {
      const pages = parseInt(body?.pages)
      if (!pages || pages < PAGES_MIN || pages > PAGES_MAX) return NextResponse.json({ error: `Сколько страниц в книге? (${PAGES_MIN}–${PAGES_MAX})` }, { status: 400 })
      const r = await pool.query(
        `UPDATE own_book_requests SET title = $3, author = $4, pages = $5, words_per_page = $6,
                photo = CASE WHEN $7::text IS NOT NULL THEN $7 WHEN $8::boolean THEN NULL ELSE photo END
          WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING id`,
        [reqId, userId, title, author, pages, wordsOf(body?.words_per_page), photo, removePhoto])
      if (!r.rows[0]) return NextResponse.json({ error: 'Заявку уже рассмотрели — обнови страницу' }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (bookId) {
      const r = await pool.query(
        `UPDATE books SET title = $3, author = $4, description = NULLIF($5, ''),
                cover_url = CASE WHEN $6::text IS NOT NULL THEN $6 WHEN $7::boolean THEN NULL ELSE cover_url END,
                updated_at = NOW()
          WHERE id = $1 AND owner_id = $2 RETURNING id`,
        [bookId, userId, title, author, description, photo, removePhoto])
      if (!r.rows[0]) return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
      await pool.query(`UPDATE own_book_requests SET title = $3, author = $4 WHERE book_id = $1 AND user_id = $2`, [bookId, userId, title, author])
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Что поправить?' }, { status: 400 })
  } catch (err) {
    console.error('[own-books PATCH]', err)
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
