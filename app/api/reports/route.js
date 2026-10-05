import { NextResponse } from 'next/server'
import pool from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

export async function POST(req) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const {
    bookId, borrowId, quote1, quote2, confusing,
    life_example, apply_today, rating
  } = await req.json()

  if (!borrowId || !bookId) {
    return NextResponse.json({ error: 'Не хватает данных' }, { status: 400 })
  }

  // Валидация
  const fields = { quote1, quote2, confusing, life_example, apply_today }
  for (const [name, val] of Object.entries(fields)) {
    if (!val || val.length < 20) {
      return NextResponse.json(
        { error: `Поле "${name}" должно содержать минимум 20 символов` },
        { status: 400 }
      )
    }
  }
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Поставь оценку от 1 до 5' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Проверяем заём
    const borrowCheck = await client.query(
      "SELECT id, user_id, book_id FROM borrows WHERE id = $1 AND user_id = $2 AND status IN ('active','overdue')",
      [borrowId, guard.payload.id]
    )
    if (!borrowCheck.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Нет активной книги' }, { status: 403 })
    }

    // Проверяем дубликат отчёта
    const dup = await client.query(
      'SELECT id FROM reports WHERE user_id = $1 AND book_id = $2',
      [guard.payload.id, bookId]
    )
    if (dup.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Ты уже сдавал отчёт по этой книге' }, { status: 403 })
    }

    // Создаём отчёт
    await client.query(
      `INSERT INTO reports
        (user_id, book_id, borrow_id, quote1, quote2, confusing,
         life_example, apply_today, rating, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [guard.payload.id, bookId, borrowId, quote1, quote2, confusing,
       life_example, apply_today, rating]
    )

    // Переводим заём в статус submitted
    await client.query(
      "UPDATE borrows SET status = 'submitted', updated_at = NOW() WHERE id = $1",
      [borrowId]
    )

    // Освобождаем экземпляр книги
    await client.query(
      'UPDATE books SET available_copies = LEAST(available_copies + 1, total_copies), updated_at = NOW() WHERE id = $1',
      [bookId]
    )

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      message: 'Отчёт отправлен. Учитель проверит и зачтёт книгу.'
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Report POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function PATCH(req) {
  const guard = requireAuth(req, ['admin', 'teacher', 'librarian'])
  if (!guard.ok) return guard.response

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { reportId, bookId, borrowId, userId, action } = await req.json()

    if (action === 'reject') {
      // Отклоняем отчёт — возвращаем заём в active
      await client.query("UPDATE reports SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2", [guard.payload.id, reportId])
      if (borrowId) {
        await client.query("UPDATE borrows SET status = 'active', updated_at = NOW() WHERE id = $1", [borrowId])
        if (bookId) {
          await client.query(
            'UPDATE books SET available_copies = GREATEST(available_copies - 1, 0), updated_at = NOW() WHERE id = $1',
            [bookId]
          )
        }
      }
    } else {
      // Одобряем
      await client.query("UPDATE reports SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2", [guard.payload.id, reportId])
      if (borrowId) {
        await client.query("UPDATE borrows SET status = 'approved', updated_at = NOW() WHERE id = $1 AND user_id = $2", [borrowId, userId])
      }
    }

    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Report PATCH error:', err.message)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  } finally {
    client.release()
  }
}