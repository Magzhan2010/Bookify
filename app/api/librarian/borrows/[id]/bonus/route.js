import { NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'
import { requireAuth } from '../../../../../../lib/auth'
import { notify } from '../../../../../../lib/notify'
import { BONUSES } from '../../../../../../lib/points'

/**
 * POST { kind: 'video' | 'tedx' } — команда или библиотекарь отмечают, что ученик снял видео
 * о книге или выступил с ней на TEDx. Одно видео и одно выступление на книгу. Себе — нельзя.
 * Отменить — «Отменить» в блоке «Монеты» ученика.
 */
export async function POST(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const kind = body?.kind === 'tedx' ? 'tedx' : body?.kind === 'video' ? 'video' : null
  if (!kind) return NextResponse.json({ error: 'Видео или TEDx?' }, { status: 400 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(7310445, $1)', [id || 0])
    const r = await client.query(
      `SELECT b.id, b.user_id, b.book_id, b.status, b.notes, bk.title FROM borrows b JOIN books bk ON bk.id = b.book_id WHERE b.id = $1`, [id])
    const b = r.rows[0]
    if (!b) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Не найдено' }, { status: 404 }) }
    if (Number(b.user_id) === Number(guard.payload.id) && guard.payload.role !== 'librarian') {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Себе отмечает другой участник или библиотекарь' }, { status: 403 })
    }
    if (b.status !== 'approved') {
      await client.query('ROLLBACK'); return NextResponse.json({ error: 'Сначала нужен одобренный отзыв об этой книге' }, { status: 400 })
    }
    const dup = await client.query(`SELECT 1 FROM user_points WHERE borrow_id = $1 AND reason = $2 AND NOT reverted LIMIT 1`, [id, kind])
    if (dup.rows[0]) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Уже отмечено' }, { status: 400 }) }
    const bonus = BONUSES[kind]
    await client.query(
      `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [b.user_id, bonus.points, kind, `${bonus.title}: «${b.title}»`, id, b.book_id, guard.payload.id])
    await notify(client, b.user_id, { kind: 'bonus', title: `+${bonus.points} монет: ${bonus.short}`, body: `«${b.title}»`, link: '/profile' })
    await client.query('COMMIT')
    return NextResponse.json({ success: true, points: bonus.points })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[borrow bonus]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}
