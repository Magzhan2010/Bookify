import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/books/match?seen=1,2,3 — колода для «Подбора книг».
 * Книги из каталога с обложкой, которые ученик ещё не читал, не берёт и не отложил.
 * Половина колоды — из любимых жанров (избранное и прочитанное), остальное — случайно, чтобы открывать новое.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const userId = guard.payload.id
  const seen = (new URL(req.url).searchParams.get('seen') || '')
    .split(',').map(x => parseInt(x)).filter(Boolean).slice(-500)
  try {
    const fav = await pool.query(`
      SELECT bk.genre, COUNT(*)::int AS n FROM books bk
       WHERE bk.genre IS NOT NULL AND bk.genre <> '' AND bk.id IN (
         SELECT book_id FROM favorites WHERE user_id = $1
         UNION ALL SELECT book_id FROM borrows WHERE user_id = $1 AND status <> 'cancelled')
       GROUP BY bk.genre ORDER BY n DESC LIMIT 3`, [userId])
    const genres = fav.rows.map(r => r.genre)
    const base = `
      SELECT bk.id, bk.title, bk.author, bk.cover_url, bk.genre, bk.pages, bk.year,
             LEFT(COALESCE(bk.description, ''), 260) AS description, bk.available_copies,
             (SELECT COUNT(DISTINCT b.user_id) FROM borrows b WHERE b.book_id = bk.id AND b.status IN ('approved', 'reviewed', 'returned'))::int AS readers,
             (SELECT ROUND(AVG(value)::numeric, 1) FROM book_ratings r WHERE r.book_id = bk.id)::float AS rating
        FROM books bk
       WHERE bk.archived_at IS NULL AND bk.owner_id IS NULL
         AND bk.cover_url IS NOT NULL AND bk.cover_url <> ''
         AND NOT (bk.id = ANY($2::int[]))
         AND NOT EXISTS (SELECT 1 FROM borrows b WHERE b.book_id = bk.id AND b.user_id = $1 AND b.status <> 'cancelled')
         AND NOT EXISTS (SELECT 1 FROM favorites f WHERE f.book_id = bk.id AND f.user_id = $1)`
    const [liked, random] = await Promise.all([
      genres.length
        ? pool.query(`${base} AND bk.genre = ANY($3::text[]) ORDER BY random() LIMIT 8`, [userId, seen, genres])
        : Promise.resolve({ rows: [] }),
      pool.query(`${base} ORDER BY random() LIMIT 16`, [userId, seen])
    ])
    const out = []
    const ids = new Set()
    const a = liked.rows, b = random.rows
    for (let i = 0; out.length < 15 && (i < a.length || i < b.length); i++) {
      for (const x of [a[i], b[i]]) if (x && !ids.has(x.id) && out.length < 15) { ids.add(x.id); out.push({ ...x, for_you: a.includes(x) }) }
    }
    return NextResponse.json({ books: out, genres })
  } catch (err) {
    console.error('[books/match]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
