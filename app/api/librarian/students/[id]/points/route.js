import { NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'
import { requireAuth } from '../../../../../../lib/auth'
import { getBalance } from '../../../../../../lib/game'
import { notify } from '../../../../../../lib/notify'

/**
 * Монеты ученика: история и исправление ошибок.
 * GET — история (видят библиотекарь и команда).
 * POST — только библиотекарь и тимлид:
 *   { action: 'revert', pointId, note? }   — отменить ошибочное начисление (обратная запись той же датой,
 *                                             поэтому месяц/сезон считаются честно; второй раз не отменить)
 *   { action: 'deduct', amount, note }     — списать N монет с причиной
 * Записи не удаляются — видно, кто и когда исправил.
 */
export async function GET(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const userId = parseInt((await params).id)
  try {
    const [rows, balance] = await Promise.all([
      pool.query(
        `SELECT p.id, p.points, p.reason, p.description, p.created_at, p.reverted, p.revert_of,
                c.name AS created_by_name
           FROM user_points p LEFT JOIN users c ON c.id = p.created_by
          WHERE p.user_id = $1
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT 300`, [userId]),
      getBalance(pool, userId)
    ])
    return NextResponse.json({ balance, items: rows.rows })
  } catch (err) {
    console.error('[student points GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  const userId = parseInt((await params).id)
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const note = String(body?.note || '').trim().slice(0, 200)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Одна правка за раз на ученика — двойной клик не спишет дважды
    await client.query('SELECT pg_advisory_xact_lock(7310444, $1)', [userId || 0])

    if (body?.action === 'revert') {
      const r = await client.query(
        `SELECT * FROM user_points WHERE id = $1 AND user_id = $2 FOR UPDATE`, [parseInt(body.pointId), userId])
      const p = r.rows[0]
      if (!p) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 }) }
      if (p.reverted) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Уже отменено' }, { status: 400 }) }
      if (p.revert_of || p.points <= 0) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Эту запись отменить нельзя' }, { status: 400 }) }
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, book_id, created_by, created_at, revert_of)
         VALUES ($1, $2, 'adjust', $3, $4, $5, $6, $7)`,
        [userId, -p.points, `Отмена: ${p.description || p.reason}${note ? ` — ${note}` : ''}`, p.book_id, guard.payload.id, p.created_at, p.id])
      await client.query(`UPDATE user_points SET reverted = TRUE WHERE id = $1`, [p.id])
      await notify(client, userId, {
        kind: 'points_removed', title: `−${p.points} монет`,
        body: `Отменено начисление: ${p.description || p.reason}${note ? `. ${note}` : ''}`, link: '/profile'
      })
    } else if (body?.action === 'deduct') {
      const amount = parseInt(body.amount)
      if (!amount || amount < 1 || amount > 1000) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Сколько монет списать? (1–1000)' }, { status: 400 }) }
      if (!note) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Напиши причину — ученик её увидит' }, { status: 400 }) }
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, created_by) VALUES ($1, $2, 'adjust', $3, $4)`,
        [userId, -amount, `Списано: ${note}`, guard.payload.id])
      await notify(client, userId, { kind: 'points_removed', title: `−${amount} монет`, body: `Списано: ${note}`, link: '/profile' })
    } else {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
    }
    const balance = await getBalance(client, userId)
    await client.query('COMMIT')
    return NextResponse.json({ success: true, balance })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[student points POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
