import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { notify } from '../../../../../lib/notify'

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
        RETURNING id, status, user_id, (SELECT title FROM prizes WHERE id = prize_orders.prize_id) AS title, note`,
      [action === 'issue' ? 'issued' : 'cancelled', guard.payload.id, id]
    )
    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Заказ не найден или уже обработан' }, { status: 404 })
    }
    const o = res.rows[0]
    if (o.status === 'cancelled') {
      await pool.query(
        'UPDATE prizes SET stock = stock + 1 WHERE id = (SELECT prize_id FROM prize_orders WHERE id = $1) AND stock IS NOT NULL', [o.id])
    }
    await notify(pool, o.user_id, o.status === 'issued'
      ? { kind: 'prize_issued', title: `Приз выдан: ${o.title}`, body: 'Поздравляем! Читай дальше — впереди новые призы.', link: '/shop' }
      : { kind: 'prize_cancelled', title: `Заказ отменён: ${o.title}`, body: 'Монеты вернулись на твой счёт.', link: '/shop' })
    return NextResponse.json({ success: true, order: { id: o.id, status: o.status } })
  } catch (err) {
    console.error('Order action error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
