import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { getBalance } from '../../../../lib/game'
import { levelFor } from '../../../../lib/points'

/**
 * GET /api/profile/points
 * Баланс баллов ученика, уровень, история начислений (карточки) и правила.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const userId = guard.payload.id

  try {
    const [balance, historyRes, rulesRes] = await Promise.all([
      getBalance(pool, userId),
      pool.query(
        `SELECT up.id, up.points, up.reason, up.description, up.created_at,
                b.id AS book_id, b.title AS book_title, b.cover_url AS book_cover
           FROM user_points up
           LEFT JOIN books b ON b.id = up.book_id
          WHERE up.user_id = $1
          ORDER BY up.created_at DESC, up.id DESC
          LIMIT 100`,
        [userId]
      ),
      pool.query('SELECT code, title, points, description FROM point_rules ORDER BY points DESC')
    ])

    return NextResponse.json({
      // total оставлен для совместимости со старым интерфейсом
      balance: { ...balance, total: balance.earned },
      level: levelFor(balance.earned),
      history: historyRes.rows,
      rules: rulesRes.rows
    })
  } catch (err) {
    console.error('Points error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
