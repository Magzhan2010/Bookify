import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { getBalance } from '../../../../lib/game'
import { HIGHLIGHTER_COLORS, COLOR_NOTE_PREFIX } from '../../../../lib/points'

/**
 * POST /api/shop/order
 * Body: { prizeId, note? }
 * Ученик «покупает» приз: баллы сразу резервируются, заказ ждёт библиотекаря.
 *
 * Баланс считается под блокировкой строки ученика — два быстрых клика
 * не позволят потратить одни и те же баллы дважды.
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['student'])
  if (!guard.ok) return guard.response
  const userId = guard.payload.id

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 })
  }
  const prizeId = parseInt(body?.prizeId)
  let note = String(body?.note || '').trim().slice(0, 300) || null
  if (!prizeId) return NextResponse.json({ error: 'Не выбран приз' }, { status: 400 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId])

    const prizeRes = await client.query(
      'SELECT id, code, title, price, needs_note FROM prizes WHERE id = $1 AND active',
      [prizeId]
    )
    const prize = prizeRes.rows[0]
    if (!prize) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Приз не найден' }, { status: 404 })
    }
    // Текстовыделитель — с выбором цвета (по умолчанию жёлтый)
    if (prize.code === 'highlighter') {
      const c = HIGHLIGHTER_COLORS.find(x => x.key === body?.color) || HIGHLIGHTER_COLORS[0]
      note = COLOR_NOTE_PREFIX + c.label
    }
    if (prize.needs_note && !note) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Напиши, какую книгу ты хочешь' }, { status: 400 })
    }

    const balance = await getBalance(client, userId)
    if (balance.available < prize.price) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: `Не хватает ${prize.price - balance.available} баллов` },
        { status: 400 }
      )
    }

    const order = await client.query(
      `INSERT INTO prize_orders (user_id, prize_id, price, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, price, note, status, created_at`,
      [userId, prize.id, prize.price, note]
    )
    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      order: { ...order.rows[0], title: prize.title },
      balance: { ...balance, spent: balance.spent + prize.price, available: balance.available - prize.price }
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Order error:', err)
    return NextResponse.json({ error: 'Не удалось оформить заказ' }, { status: 500 })
  } finally {
    client.release()
  }
}

/**
 * DELETE /api/shop/order
 * Body: { orderId }
 * Ученик отменяет свой заказ, пока библиотекарь его не выдал — баллы возвращаются.
 */
export async function DELETE(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 })
  }

  try {
    const res = await pool.query(
      `UPDATE prize_orders SET status = 'cancelled', processed_at = NOW()
        WHERE id = $1 AND user_id = $2 AND status = 'pending'
        RETURNING id`,
      [parseInt(body?.orderId), guard.payload.id]
    )
    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Заказ не найден или уже выдан' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Cancel order error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
