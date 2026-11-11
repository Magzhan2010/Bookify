import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { notify } from '../../../../../lib/notify'
import { tierForPages } from '../../../../../lib/points'

/**
 * Доначисление за объём книги по уже одобренным отзывам.
 * Раньше, если у книги не было числа страниц, ученик получал только +5 за отзыв (и бонусы),
 * а за саму прочитанную книгу — 0.
 *
 * GET — одобренные отзывы без монет за объём (книга не короче 100 стр. или объём неизвестен).
 * POST { borrowId, pages } — вписать страницы (сохраняются в карточку книги) и начислить.
 */
const MISSING = `
  SELECT r.id AS review_id, r.borrow_id, r.user_id, r.book_id, r.reviewed_at,
         u.name AS student_name, u.class_name AS student_class,
         b.title AS book_title, b.author AS book_author, b.pages AS book_pages
    FROM book_reviews r
    JOIN users u ON u.id = r.user_id
    JOIN books b ON b.id = r.book_id
   WHERE r.status = 'approved'
     AND (b.pages IS NULL OR b.pages = 0 OR b.pages >= 100)
     AND NOT EXISTS (SELECT 1 FROM user_points p
                      WHERE p.user_id = r.user_id AND p.book_id = r.book_id AND p.reason LIKE 'pages%')`

export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query(`${MISSING} ORDER BY r.reviewed_at DESC LIMIT 200`)
    return NextResponse.json(r.rows)
  } catch (err) {
    console.error('[reviews/topup GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const borrowId = parseInt(body?.borrowId)
  const pages = parseInt(body?.pages) || 0

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Два быстрых клика не начислят дважды
    await client.query('SELECT pg_advisory_xact_lock(7310443, $1)', [borrowId || 0])
    const r = await client.query(`${MISSING} AND r.borrow_id = $1`, [borrowId])
    const row = r.rows[0]
    if (!row) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Уже начислено или отзыв не найден' }, { status: 400 }) }
    if (Number(row.user_id) === Number(guard.payload.id)) {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Себе начислить нельзя' }, { status: 403 })
    }
    const total = parseInt(row.book_pages) || pages
    if (!total || total > 5000) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Впиши число страниц' }, { status: 400 }) }
    if (!parseInt(row.book_pages)) {
      await client.query('UPDATE books SET pages = $1, updated_at = NOW() WHERE id = $2', [total, row.book_id])
    }
    const tier = tierForPages(total)
    if (tier) {
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [row.user_id, tier.points, tier.code, `Прочитал книгу: ${tier.label}`, row.borrow_id, row.book_id, guard.payload.id])
      await notify(client, row.user_id, {
        kind: 'bonus', title: `+${tier.points} монет за книгу`,
        body: `«${row.book_title}» — ${tier.label}`, link: '/profile'
      })
    }
    await client.query('COMMIT')
    return NextResponse.json({ success: true, points: tier?.points || 0, student_name: row.student_name })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[reviews/topup POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
