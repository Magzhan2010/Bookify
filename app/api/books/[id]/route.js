import { NextResponse } from "next/server"
import pool, { ensureSchema } from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

export async function GET(req, { params }) {
  const { id } = await params
  try {
    await ensureSchema()
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
  await ensureSchema()

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
  const { searchParams } = new URL(req.url)
  // ?hard=1 — полное удаление (разрешено только если по книге НЕТ никакой истории)
  const hard = searchParams.get('hard') === '1'

  try {
    await ensureSchema()

    // Проверяем, есть ли активные займы этой книги
    const active = await pool.query(
      `SELECT id FROM borrows WHERE book_id = $1 AND status = 'active' LIMIT 1`,
      [id]
    )
    if (active.rows[0]) {
      return NextResponse.json(
        { error: 'Нельзя удалить: книга сейчас у кого-то на руках' },
        { status: 400 }
      )
    }

    const current = await pool.query('SELECT title, archived_at FROM books WHERE id = $1', [id])
    if (!current.rows[0]) {
      return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    }
    const title = current.rows[0].title

    // ─── Полное удаление ───
    // Раньше здесь был DELETE FROM books, а из-за ON DELETE CASCADE
    // вместе с книгой стирались ВСЕ borrows и book_requests — история выдач пропадала.
    if (hard) {
      const history = await pool.query(
        'SELECT COUNT(*)::int AS count FROM borrows WHERE book_id = $1',
        [id]
      )
      if (history.rows[0].count > 0) {
        return NextResponse.json(
          {
            error: `Нельзя удалить навсегда: по книге есть история выдач (${history.rows[0].count}). Отправьте её в архив — история сохранится.`
          },
          { status: 400 }
        )
      }

      await pool.query('DELETE FROM book_comments WHERE book_id = $1', [id])
      await pool.query('DELETE FROM favorites WHERE book_id = $1', [id])

      const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING title', [id])
      if (!result.rows[0]) {
        return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
      }
      return NextResponse.json({ success: true, deleted: result.rows[0].title, hard: true })
    }

    // ─── Архивирование (по умолчанию) ───
    const result = await pool.query(
      `UPDATE books SET archived_at = COALESCE(archived_at, NOW()), updated_at = NOW()
       WHERE id = $1 RETURNING title`,
      [id]
    )

    return NextResponse.json({
      success: true,
      archived: title,
      hard: false,
      message: 'Книга убрана из каталога. История выдач сохранена.'
    })
  } catch (err) {
    console.error('Delete book error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}