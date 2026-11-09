import { NextResponse } from 'next/server'
import pool from '../../../../../../lib/db'
import { requireAuth } from '../../../../../../lib/auth'

/**
 * POST /api/librarian/borrows/[id]/extend — продлить срок возврата книги.
 * Body: { days: 1..90 }  — продлить на N дней (от текущего срока; если уже
 *                           просрочено — от сегодняшнего дня)
 *    или { dueDate: 'YYYY-MM-DD' } — поставить конкретную дату (не раньше завтра).
 * Доступно библиотекарю и участникам командной платформы.
 */
export async function POST(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response
  const id = parseInt((await params).id)

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }

  const days = parseInt(body?.days)
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(body?.dueDate || '') ? body.dueDate : null
  if (!dueDate && !(days >= 1 && days <= 90)) {
    return NextResponse.json({ error: 'Укажи, на сколько дней продлить (1–90)' }, { status: 400 })
  }

  try {
    const cur = await pool.query(
      `SELECT b.id, b.status, b.due_date, u.name AS student_name, bk.title
         FROM borrows b JOIN users u ON u.id = b.user_id JOIN books bk ON bk.id = b.book_id
        WHERE b.id = $1`, [id])
    const loan = cur.rows[0]
    if (!loan) return NextResponse.json({ error: 'Выдача не найдена' }, { status: 404 })
    if (loan.status !== 'active') return NextResponse.json({ error: 'Книга уже сдана' }, { status: 400 })

    let res
    if (dueDate) {
      // конец выбранного дня
      res = await pool.query(
        `UPDATE borrows SET due_date = ($1::date + INTERVAL '23 hours 59 minutes'),
                extensions = COALESCE(extensions, 0) + 1
          WHERE id = $2 AND $1::date > CURRENT_DATE
          RETURNING due_date, extensions`, [dueDate, id])
      if (!res.rows[0]) return NextResponse.json({ error: 'Дата должна быть не раньше завтрашнего дня' }, { status: 400 })
    } else {
      res = await pool.query(
        `UPDATE borrows SET due_date = GREATEST(due_date, NOW()) + make_interval(days => $1),
                extensions = COALESCE(extensions, 0) + 1
          WHERE id = $2
          RETURNING due_date, extensions`, [days, id])
    }
    return NextResponse.json({ success: true, due_date: res.rows[0].due_date, extensions: res.rows[0].extensions, title: loan.title, student_name: loan.student_name })
  } catch (err) {
    console.error('[extend]', err)
    return NextResponse.json({ error: 'Не удалось продлить' }, { status: 500 })
  }
}
