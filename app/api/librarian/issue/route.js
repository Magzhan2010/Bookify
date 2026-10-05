import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * POST /api/librarian/issue
 * Body: { studentIdentifier, bookId, dueDate?, notes? }
 * studentIdentifier может быть: id, email или имя (по частичному совпадению)
 *
 * Только librarian или admin могут выдавать книги.
 */
export async function POST(req) {
  const guard = requireAuth(req, ['librarian', 'admin'])
  if (!guard.ok) return guard.response

  const { studentIdentifier, bookId, dueDate, notes } = await req.json()

  if (!studentIdentifier || !bookId) {
    return NextResponse.json(
      { error: 'Не указан ученик или книга' },
      { status: 400 }
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Ищем ученика
    let studentRes
    if (typeof studentIdentifier === 'number' || /^\d+$/.test(studentIdentifier)) {
      studentRes = await client.query(
        `SELECT id, name, email, class_name, role FROM users
         WHERE id = $1 AND role IN ('student','teacher')`,
        [parseInt(studentIdentifier)]
      )
    } else if (studentIdentifier.includes('@')) {
      studentRes = await client.query(
        `SELECT id, name, email, class_name, role FROM users
         WHERE LOWER(email) = LOWER($1) AND role IN ('student','teacher')`,
        [studentIdentifier]
      )
    } else {
      studentRes = await client.query(
        `SELECT id, name, email, class_name, role FROM users
         WHERE LOWER(name) LIKE LOWER($1) AND role IN ('student','teacher')
         ORDER BY name ASC LIMIT 1`,
        [`%${studentIdentifier}%`]
      )
    }

    if (!studentRes.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Ученик не найден. Проверь имя, email или ID.' },
        { status: 404 }
      )
    }

    const student = studentRes.rows[0]

    // Проверяем книгу и доступность
    const bookRes = await client.query(
      'SELECT id, title, author, available_copies, total_copies FROM books WHERE id = $1 FOR UPDATE',
      [bookId]
    )
    if (!bookRes.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    }

    const book = bookRes.rows[0]
    if (book.available_copies <= 0) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: `Все экземпляры "${book.title}" на руках` },
        { status: 400 }
      )
    }

    // Проверяем нет ли уже этой книги у ученика
    const dup = await client.query(
      `SELECT id FROM borrows
       WHERE user_id = $1 AND book_id = $2 AND status = 'active'`,
      [student.id, bookId]
    )
    if (dup.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Этот ученик уже взял эту книгу' },
        { status: 400 }
      )
    }

    // Срок сдачи — по умолчанию 14 дней
    const due = dueDate
      ? new Date(dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    // Создаём запись о выдаче
    const borrowRes = await client.query(
      `INSERT INTO borrows (user_id, book_id, status, borrowed_at, due_date, issued_by, notes)
       VALUES ($1, $2, 'active', NOW(), $3, $4, $5)
       RETURNING *`,
      [student.id, bookId, due.toISOString(), guard.payload.id, notes || null]
    )

    // Уменьшаем available_copies
    await client.query(
      'UPDATE books SET available_copies = available_copies - 1, updated_at = NOW() WHERE id = $1',
      [bookId]
    )

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      borrow: borrowRes.rows[0],
      student: { id: student.id, name: student.name, class_name: student.class_name },
      book: { id: book.id, title: book.title, author: book.author },
      due_date: due.toISOString()
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Issue error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
  }
}