import pool from '../../../../lib/db'
import { NextResponse } from 'next/server'
import { requireAuth } from '../../../../lib/auth'

/**
 * POST /api/books/return
 * Body: { borrowId }
 * Ученик отмечает, что вернул книгу.
 *
 * БЕЗОПАСНОСТЬ:
 * - bookId НЕ принимается из тела запроса. Он берётся ТОЛЬКО из строки заёма.
 *   Раньше можно было вернуть свою книгу, а счётчик available_copies увеличить
 *   у произвольной книги по её id — счётчики рассинхронизировались навсегда.
 * - Поиск заёма и его закрытие идут под AND status='active' + FOR UPDATE,
 *   поэтому повторный запрос больше не накручивает счётчик.
 */
export async function POST(req) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const client = await pool.connect()
  let inTx = false

  try {
    const { borrowId } = await req.json()
    const userId = guard.payload.id

    if (!borrowId) {
      return NextResponse.json({ error: 'Не указан заём' }, { status: 400 })
    }

    await client.query('BEGIN')
    inTx = true

    // Заём должен существовать, принадлежать пользователю и быть активным
    const borrowCheck = await client.query(
      `SELECT user_id, book_id FROM borrows
       WHERE id = $1 AND user_id = $2 AND status = 'active'
       FOR UPDATE`,
      [borrowId, userId]
    )

    if (!borrowCheck.rows[0]) {
      await client.query('ROLLBACK')
      inTx = false
      return NextResponse.json(
        { error: 'Заём не найден или книга уже возвращена' },
        { status: 404 }
      )
    }

    // id книги — только из БД, клиенту доверять нельзя
    const realBookId = borrowCheck.rows[0].book_id

    const updated = await client.query(
      `UPDATE borrows
       SET status = 'returned', returned_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [borrowId, userId]
    )

    if (updated.rowCount === 0) {
      await client.query('ROLLBACK')
      inTx = false
      return NextResponse.json({ error: 'Книга уже возвращена' }, { status: 409 })
    }

    await client.query(
      `UPDATE books
       SET available_copies = LEAST(available_copies + 1, total_copies), updated_at = NOW()
       WHERE id = $1 AND archived_at IS NULL`,
      [realBookId]
    )

    await client.query('COMMIT')
    inTx = false
    return NextResponse.json({ success: true })
  } catch (err) {
    if (inTx) {
      try {
        await client.query('ROLLBACK')
      } catch (_) {}
    }
    console.error('Return error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}