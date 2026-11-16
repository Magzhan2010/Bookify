import { NextResponse } from 'next/server'
import pool from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { notify } from '../../../lib/notify'
import {
  resolveForUser, sideState, pagesRange, MAX_OPEN, MIN_PAGES, CHALLENGE_DAYS
} from '../../../lib/challenges'

/**
 * GET /api/challenges — мои вызовы (с пересчётом победителя).
 *   ?people=1&q=  — кого можно вызвать (ученики, сначала мой класс)
 *   ?books=1&q=&target=N — книги для вызова; с target — только с похожим числом страниц (±10%)
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['student'])
  if (!guard.ok) return guard.response
  const me = guard.payload.id
  const sp = new URL(req.url).searchParams
  const q = String(sp.get('q') || '').trim().slice(0, 60)

  try {
    if (sp.get('people')) {
      const r = await pool.query(
        `SELECT u.id, u.name, u.class_name,
                (u.class_name IS NOT DISTINCT FROM (SELECT class_name FROM users WHERE id = $1)) AS same_class
           FROM users u
          WHERE u.role = 'student' AND u.id <> $1
            AND ($2 = '' OR u.name ILIKE '%' || $2 || '%' OR u.class_name ILIKE $2 || '%')
          ORDER BY same_class DESC, u.name ASC
          LIMIT 40`, [me, q])
      return NextResponse.json(r.rows)
    }

    if (sp.get('books')) {
      const target = parseInt(sp.get('target')) || 0
      const [lo, hi] = target ? pagesRange(target) : [MIN_PAGES, 100000]
      const r = await pool.query(
        `SELECT id, title, author, cover_url, available_copies,
                ROUND(COALESCE(pages, 0) * COALESCE(page_coef, 1))::int AS counted_pages, pages
           FROM books
          WHERE archived_at IS NULL AND COALESCE(pages, 0) > 0
            AND ROUND(COALESCE(pages, 0) * COALESCE(page_coef, 1)) BETWEEN $2 AND $3
            AND ($1 = '' OR title ILIKE '%' || $1 || '%' OR author ILIKE '%' || $1 || '%')
          ORDER BY (available_copies > 0) DESC, ${target ? 'ABS(ROUND(COALESCE(pages, 0) * COALESCE(page_coef, 1)) - $4)' : 'title'} ASC, title ASC
          LIMIT 40`, target ? [q, lo, hi, target] : [q, lo, hi])
      return NextResponse.json(r.rows)
    }

    await resolveForUser(pool, me)

    const r = await pool.query(
      `SELECT c.*, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover,
              ch.name AS challenger_name, ch.class_name AS challenger_class,
              op.name AS opponent_name, op.class_name AS opponent_class
         FROM challenges c
         JOIN books b ON b.id = c.book_id
         JOIN users ch ON ch.id = c.challenger_id
         JOIN users op ON op.id = c.opponent_id
        WHERE (c.challenger_id = $1 OR c.opponent_id = $1)
          AND (c.status IN ('pending', 'active') OR c.finished_at > NOW() - INTERVAL '60 days')
        ORDER BY CASE c.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, c.created_at DESC
        LIMIT 30`, [me])

    const list = []
    for (const c of r.rows) {
      const sides = c.status === 'active' || c.status === 'finished' || c.status === 'expired'
        ? { challenger: await sideState(pool, c.book_id, c.challenger_borrow_id), opponent: await sideState(pool, c.opponent_book_id, c.opponent_borrow_id) }
        : null
      list.push({
        id: c.id,
        status: c.status,
        mine: c.challenger_id === me ? 'challenger' : 'opponent',
        message: c.message,
        book: { id: c.book_id, title: c.book_title, author: c.book_author, cover_url: c.book_cover },
        target_pages: c.target_pages,
        pages_range: pagesRange(c.target_pages),
        challenger: { id: c.challenger_id, name: c.challenger_name, class_name: c.challenger_class, ...(sides?.challenger || {}) },
        opponent: { id: c.opponent_id, name: c.opponent_name, class_name: c.opponent_class, ...(sides?.opponent || {}) },
        winner_id: c.winner_id,
        result: c.result,
        created_at: c.created_at,
        accepted_at: c.accepted_at,
        deadline_at: c.deadline_at,
        finished_at: c.finished_at
      })
    }
    const wins = await pool.query(`SELECT COUNT(*)::int AS n FROM challenges WHERE winner_id = $1`, [me])
    return NextResponse.json({ challenges: list, wins: wins.rows[0].n })
  } catch (err) {
    console.error('[challenges GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * POST /api/challenges — бросить вызов.
 * Body: { opponentId, bookId, message? } — bookId: книга автора вызова, задаёт число страниц
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['student'])
  if (!guard.ok) return guard.response
  const me = guard.payload.id

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const opponentId = parseInt(body?.opponentId)
  const bookId = parseInt(body?.bookId)
  const message = String(body?.message || '').trim().slice(0, 200) || null
  if (!opponentId || !bookId) return NextResponse.json({ error: 'Выбери соперника и книгу' }, { status: 400 })
  if (opponentId === me) return NextResponse.json({ error: 'Себе вызов не бросить' }, { status: 400 })

  try {
    const [opp, book, open] = await Promise.all([
      pool.query(`SELECT id, name FROM users WHERE id = $1 AND role = 'student'`, [opponentId]),
      pool.query(`SELECT id, title, ROUND(COALESCE(pages, 0) * COALESCE(page_coef, 1))::int AS counted
                    FROM books WHERE id = $1 AND archived_at IS NULL`, [bookId]),
      pool.query(
        `SELECT COUNT(*)::int AS mine,
                COUNT(*) FILTER (WHERE challenger_id IN ($1, $2) AND opponent_id IN ($1, $2))::int AS pair
           FROM challenges WHERE (challenger_id = $1 OR opponent_id = $1) AND status IN ('pending', 'active')`,
        [me, opponentId])
    ])
    if (!opp.rows[0]) return NextResponse.json({ error: 'Такого ученика нет' }, { status: 400 })
    if (!book.rows[0]) return NextResponse.json({ error: 'Книга не найдена' }, { status: 400 })
    if (book.rows[0].counted < MIN_PAGES) {
      return NextResponse.json({ error: `Для вызова нужна книга от ${MIN_PAGES} страниц` }, { status: 400 })
    }
    if (open.rows[0].pair > 0) return NextResponse.json({ error: 'С этим учеником у тебя уже есть вызов' }, { status: 400 })
    if (open.rows[0].mine >= MAX_OPEN) {
      return NextResponse.json({ error: `Одновременно можно вести не больше ${MAX_OPEN} вызовов` }, { status: 400 })
    }
    const r = await pool.query(
      `INSERT INTO challenges (challenger_id, opponent_id, book_id, target_pages, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [me, opponentId, bookId, book.rows[0].counted, message]
    )
    const meName = await pool.query('SELECT name FROM users WHERE id = $1', [me])
    await notify(pool, opponentId, {
      kind: 'challenge',
      title: `${meName.rows[0]?.name || 'Одноклассник'} бросает тебе вызов`,
      body: `Кто первым дочитает? У соперника «${book.rows[0].title}» (${book.rows[0].counted} стр.) — выбери свою книгу такого же объёма. ${CHALLENGE_DAYS} дней после старта.`,
      link: '/profile#challenges'
    })
    return NextResponse.json({ success: true, id: r.rows[0].id })
  } catch (err) {
    console.error('[challenges POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
