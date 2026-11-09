import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { getBalance, getRanks } from '../../../../lib/game'
import { levelFor } from '../../../../lib/points'

/**
 * GET /api/game/summary
 * Всё, что нужно для игровой панели ученика одним запросом:
 * баланс, уровень, место в рейтинге, последние карточки, ближайший приз.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const userId = guard.payload.id

  try {
    const [balance, ranks, recent, nextPrize, booksRead, me] = await Promise.all([
      getBalance(pool, userId),
      getRanks(pool, userId),
      pool.query(
        `SELECT p.id, p.points, p.reason, p.description, p.created_at,
                b.title AS book_title
           FROM user_points p
           LEFT JOIN books b ON b.id = p.book_id
          WHERE p.user_id = $1
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT 30`,
        [userId]
      ),
      pool.query(
        `SELECT id, title, price FROM prizes
          WHERE active AND (stock IS NULL OR stock > 0) ORDER BY price ASC`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS n FROM borrows WHERE user_id = $1 AND status = 'approved'`,
        [userId]
      ),
      pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId])
    ])

    const prizes = nextPrize.rows
    const next = prizes.find(p => p.price > balance.available) || null
    const affordable = prizes.filter(p => p.price <= balance.available).length

    return NextResponse.json({
      balance,
      level: levelFor(balance.earned),
      ranks,
      books_read: booksRead.rows[0].n,
      avatar_url: me.rows[0]?.avatar_url || null,
      recent: recent.rows,
      next_prize: next,
      affordable_prizes: affordable
    })
  } catch (err) {
    console.error('Game summary error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
