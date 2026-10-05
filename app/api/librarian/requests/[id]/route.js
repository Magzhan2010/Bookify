import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/**
 * POST /api/librarian/requests/[id]
 * Body: { action: 'approve' | 'reject' | 'issue', dueDate?, rating? }
 *
 * approve → book_requests.status = 'approved' (ученик может прийти забрать)
 * reject  → book_requests.status = 'rejected'
 * issue   → book_requests.status = 'fulfilled' + создать borrows (active)
 */
export async function POST(req, { params }) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await req.json()
  const { action, dueDate, notes } = body

  if (!['approve', 'reject', 'issue'].includes(action)) {
    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Получаем заявку с защитой от гонок
    const reqRes = await client.query(
      `SELECT * FROM book_requests WHERE id = $1 FOR UPDATE`, [id]
    )
    if (!reqRes.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
    }
    const request = reqRes.rows[0]

    if (action === 'reject') {
      await client.query(
        `UPDATE book_requests
         SET status = 'rejected', processed_at = NOW(), processed_by = $1, notes = COALESCE($2, notes)
         WHERE id = $3`,
        [guard.payload.id, notes || null, id]
      )
      await client.query('COMMIT')
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    if (action === 'approve') {
      // Проверяем доступность книги
      const bookRes = await client.query(
        'SELECT title, available_copies FROM books WHERE id = $1 FOR UPDATE', [request.book_id]
      )
      if (!bookRes.rows[0]) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
      }
      if (bookRes.rows[0].available_copies <= 0) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { error: `Все экземпляры "${bookRes.rows[0].title}" на руках` },
          { status: 400 }
        )
      }

      await client.query(
        `UPDATE book_requests
         SET status = 'approved', processed_at = NOW(), processed_by = $1, notes = COALESCE($2, notes)
         WHERE id = $3`,
        [guard.payload.id, notes || null, id]
      )
      await client.query('COMMIT')
      return NextResponse.json({ success: true, status: 'approved' })
    }

    if (action === 'issue') {
      // Сразу выдаём книгу: создаём borrows + помечаем заявку fulfilled
      const bookRes = await client.query(
        'SELECT title, available_copies FROM books WHERE id = $1 FOR UPDATE', [request.book_id]
      )
      if (!bookRes.rows[0]) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
      }
      if (bookRes.rows[0].available_copies <= 0) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { error: `Все экземпляры "${bookRes.rows[0].title}" на руках` },
          { status: 400 }
        )
      }

      // Срок сдачи — по умолчанию 14 дней
      const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

      const borrowRes = await client.query(
        `INSERT INTO borrows (user_id, book_id, status, borrowed_at, due_date, issued_by, notes)
         VALUES ($1, $2, 'active', NOW(), $3, $4, $5)
         RETURNING id, due_date`,
        [request.user_id, request.book_id, due.toISOString(), guard.payload.id, notes || null]
      )

      await client.query(
        `UPDATE book_requests
         SET status = 'fulfilled', processed_at = NOW(), processed_by = $1, notes = COALESCE($2, notes)
         WHERE id = $3`,
        [guard.payload.id, notes || null, id]
      )

      await client.query(
        'UPDATE books SET available_copies = available_copies - 1, updated_at = NOW() WHERE id = $1',
        [request.book_id]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        status: 'fulfilled',
        borrow_id: borrowRes.rows[0].id,
        due_date: borrowRes.rows[0].due_date,
        student_name: request.user_id,
        book_title: bookRes.rows[0].title
      })
    }
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Request action error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
  }
}