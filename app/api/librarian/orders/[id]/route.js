import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/**
 * PATCH /api/librarian/orders/[id]
 * Body: { action: 'issue' | 'cancel' }
 * issue  — приз вручён ученику
 * cancel — заказ отменён, баллы возвращаются ученику
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 })
  }
  const action = body?.action
  if (!['issue', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
  }

  try {
    const res = await pool.query(
      `UPDATE prize_orders
          SET status = $1, processed_by = $2, processed_at = NOW()
        WHERE id = $3 AND status = 'pending'
        RETURNING id, status`,
      [action === 'issue' ? 'issued' : 'cancelled', guard.payload.id, id]
    )
    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Заказ не найден или уже обработан' }, { status: 404 })
    }
    return NextResponse.json({ success: true, order: res.rows[0] })
  } catch (err) {
    console.error('Order action error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
