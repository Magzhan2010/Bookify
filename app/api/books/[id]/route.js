import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

export async function GET(req, { params }) {
  const { id } = await params
  try {
    const res = await pool.query("SELECT * FROM books WHERE id = $1", [id])
    if (!res.rows[0]) {
      return NextResponse.json({ error: "Книга не найдена" }, { status: 404 })
    }
    return NextResponse.json(res.rows[0])
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}

export async function PATCH(req, { params }) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params
  const data = await req.json()

  // Разрешённые поля для обновления.
  // ВАЖНО: 'language' и 'difficulty' НЕ включаем — таких колонок в books нет,
  // они хранятся внутри tags (см. app/api/books/route.js POST).
  const allowed = [
    'title', 'author', 'genre', 'year', 'description',
    'cover_url', 'file_url', 'total_copies', 'isbn', 'pages', 'tags'
  ]

  const fields = []
  const values = []
  let i = 1

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${i++}`)
      // Конвертируем числа (NaN → null, чтобы не сломать INT-колонку)
      if (['total_copies', 'pages'].includes(key)) {
        const num = parseInt(data[key])
        values.push(Number.isNaN(num) ? null : num)
      } else {
        values.push(data[key] === '' ? null : data[key])
      }
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 })
  }

  // Если меняется total_copies, обновим available_copies пропорционально
  let extraUpdate = ''
  if (data.total_copies !== undefined) {
    const current = await pool.query(
      'SELECT available_copies, total_copies FROM books WHERE id = $1',
      [id]
    )
    if (current.rows[0]) {
      const oldAvail = current.rows[0].available_copies ?? 0
      const oldTotal = current.rows[0].total_copies ?? 0
      const parsed = parseInt(data.total_copies)
      const newTotal = Number.isNaN(parsed) ? oldTotal : Math.max(1, parsed)
      // Дельта
      const delta = newTotal - oldTotal
      const newAvail = Math.max(0, Math.min(newTotal, oldAvail + delta))
      // Добавим в апдейт явно
      if (!fields.some(f => f.startsWith('available_copies'))) {
        fields.push(`available_copies = $${i++}`)
        values.push(newAvail)
      }
    }
  }

  fields.push(`updated_at = NOW()`)
  values.push(id)

  try {
    const result = await pool.query(
      `UPDATE books SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    )
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    }
    return NextResponse.json({ success: true, book: result.rows[0] })
  } catch (err) {
    console.error('Update book error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params

  try {
    // Проверяем, есть ли активные займы этой книги
    const active = await pool.query(
      `SELECT id FROM borrows WHERE book_id = $1 AND status = 'active' LIMIT 1`,
      [id]
    )
    if (active.rows[0]) {
      return NextResponse.json(
        { error: 'Нельзя удалить: у книги есть активные займы' },
        { status: 400 }
      )
    }

    // Удаляем связанные данные (комментарии, избранное)
    await pool.query('DELETE FROM book_comments WHERE book_id = $1', [id])
    await pool.query('DELETE FROM favorites WHERE book_id = $1', [id])

    const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING title', [id])
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      deleted: result.rows[0].title
    })
  } catch (err) {
    console.error('Delete book error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}