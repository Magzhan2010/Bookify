import { NextResponse } from 'next/server'
import pool from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { getBalance } from '../../../lib/game'

/**
 * GET /api/shop
 * Призы, мой баланс и мои заказы.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const userId = guard.payload.id

  try {
    const [prizes, balance, orders] = await Promise.all([
      pool.query(
        `SELECT id, code, title, description, price, image, needs_note
           FROM prizes WHERE active ORDER BY sort ASC, price ASC`
      ),
      getBalance(pool, userId),
      pool.query(
        `SELECT o.id, o.price, o.note, o.status, o.created_at, o.processed_at,
                p.title, p.image
           FROM prize_orders o
           JOIN prizes p ON p.id = o.prize_id
          WHERE o.user_id = $1
          ORDER BY o.created_at DESC
          LIMIT 50`,
        [userId]
      )
    ])
    return NextResponse.json({ prizes: prizes.rows, balance, orders: orders.rows })
  } catch (err) {
    console.error('Shop error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
