import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { notify } from '../../../../lib/notify'
import { CHALLENGE_DAYS, MAX_OPEN } from '../../../../lib/challenges'

/**
 * PATCH /api/challenges/[id] — { action: 'accept' | 'decline' | 'cancel' }
 * accept/decline — соперник, пока вызов ждёт ответа; cancel — автор, пока не приняли.
 * После принятия стартуют оба одновременно, на вызов CHALLENGE_DAYS дней.
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['student'])
  if (!guard.ok) return guard.response
  const me = guard.payload.id
  const id = parseInt((await params).id)

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const action = body?.action

  try {
    const r = await pool.query(
      `SELECT c.*, b.title AS book_title, u.name AS me_name
         FROM challenges c JOIN books b ON b.id = c.book_id JOIN users u ON u.id = $2
        WHERE c.id = $1`, [id, me])
    const c = r.rows[0]
    if (!c) return NextResponse.json({ error: 'Вызов не найден' }, { status: 404 })
    if (c.status !== 'pending') return NextResponse.json({ error: 'На этот вызов уже ответили' }, { status: 400 })

    if (action === 'accept' || action === 'decline') {
      if (c.opponent_id !== me) return NextResponse.json({ error: 'Это не твой вызов' }, { status: 403 })
      if (action === 'accept') {
        const open = await pool.query(
          `SELECT COUNT(*)::int AS n FROM challenges
            WHERE (challenger_id = $1 OR opponent_id = $1) AND status = 'active'`, [me])
        if (open.rows[0].n >= MAX_OPEN) {
          return NextResponse.json({ error: `Одновременно можно вести не больше ${MAX_OPEN} вызовов` }, { status: 400 })
        }
        await pool.query(
          `UPDATE challenges SET status = 'active', accepted_at = NOW(),
                  deadline_at = NOW() + make_interval(days => $2)
            WHERE id = $1 AND status = 'pending'`, [id, CHALLENGE_DAYS])
        await notify(pool, c.challenger_id, {
          kind: 'challenge',
          title: `${c.me_name} принял вызов — старт!`,
          body: `Теперь возьми «${c.book_title}» или книгу похожего объёма в библиотеке. Время пошло.`,
          link: '/profile#challenges'
        })
      } else {
        await pool.query(`UPDATE challenges SET status = 'declined', finished_at = NOW() WHERE id = $1 AND status = 'pending'`, [id])
        await notify(pool, c.challenger_id, { kind: 'challenge', title: `${c.me_name} отклонил вызов`, link: '/profile#challenges' })
      }
    } else if (action === 'cancel') {
      if (c.challenger_id !== me) return NextResponse.json({ error: 'Отменить может только автор' }, { status: 403 })
      await pool.query(`UPDATE challenges SET status = 'cancelled', finished_at = NOW() WHERE id = $1 AND status = 'pending'`, [id])
    } else {
      return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[challenges PATCH]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
