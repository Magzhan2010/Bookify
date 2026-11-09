import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/librarian/orders?status=pending|issued|cancelled|all
 * Заказы призов от учеников.
 */
export async function GET(req) {
  const guard = await requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'
  if (!['pending', 'issued', 'cancelled', 'all'].includes(status)) {
    return NextResponse.json({ error: 'Неизвестный статус' }, { status: 400 })
  }

  try {
    const params = []
    let where = ''
    if (status !== 'all') {
      params.push(status)
      where = 'WHERE o.status = $1'
    }
    const [orders, counts] = await Promise.all([
      pool.query(
        `SELECT o.id, o.price, o.note, o.status, o.created_at, o.processed_at,
                p.title AS prize_title, p.id AS prize_id, p.updated_at AS prize_updated, p.code AS prize_code,
                CASE WHEN p.image LIKE 'data:%' THEN 1 ELSE 0 END AS has_custom,
                u.id AS student_id, u.name AS student_name, u.avatar_url AS student_avatar, u.class_name AS student_class,
                lib.name AS processed_by_name
           FROM prize_orders o
           JOIN prizes p ON p.id = o.prize_id
           JOIN users u ON u.id = o.user_id
           LEFT JOIN users lib ON lib.id = o.processed_by
           ${where}
          ORDER BY o.created_at ${status === 'pending' ? 'ASC' : 'DESC'}
          LIMIT 200`,
        params
      ),
      pool.query(`SELECT status, COUNT(*)::int AS n FROM prize_orders GROUP BY status`)
    ])
    const byStatus = { pending: 0, issued: 0, cancelled: 0 }
    counts.rows.forEach(r => { byStatus[r.status] = r.n })
    const rows = orders.rows.map(({ has_custom, prize_updated, ...o }) => ({
      ...o, prize_custom_image: has_custom ? `/api/prizes/${o.prize_id}/image?v=${new Date(prize_updated).getTime()}` : null
    }))
    return NextResponse.json({ orders: rows, counts: byStatus })
  } catch (err) {
    console.error('Librarian orders error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
