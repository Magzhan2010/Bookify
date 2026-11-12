import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { sealPassword } from '../../../../../lib/passVault'

/**
 * GET /api/librarian/students/[id]
 * Полная информация об ученике + вся история займов.
 */
export async function GET(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response

  const { id } = await params

  try {
    const userRes = await pool.query(
      `SELECT id, name, email, role, class_name, phone, avatar_url, created_at
       FROM users WHERE id = $1`,
      [id]
    )
    if (!userRes.rows[0]) {
      return NextResponse.json({ error: 'Не найден' }, { status: 404 })
    }

    const statsRes = await pool.query(
      `SELECT
         COUNT(*) AS total_borrows,
         COUNT(*) FILTER (WHERE status NOT IN ('active', 'cancelled')) AS returned_count,
         COUNT(*) FILTER (WHERE status = 'active') AS active_count,
         COUNT(*) FILTER (WHERE status = 'active' AND due_date < NOW()) AS overdue_count,
         COUNT(DISTINCT bk.genre) AS genres_count
       FROM borrows b
       LEFT JOIN books bk ON bk.id = b.book_id
       WHERE b.user_id = $1`,
      [id]
    )

    const historyRes = await pool.query(
      `SELECT b.id, b.status, b.borrowed_at, b.due_date, b.returned_at, b.notes, b.own_book,
              bk.id AS book_id, bk.title, bk.author, bk.cover_url, bk.genre,
              lib.name AS issued_by_name
       FROM borrows b
       JOIN books bk ON bk.id = b.book_id
       LEFT JOIN users lib ON lib.id = b.issued_by
       WHERE b.user_id = $1
       ORDER BY b.borrowed_at DESC
       LIMIT 100`,
      [id]
    )

    const favoritesRes = await pool.query(
      `SELECT b.id, b.title, b.author, b.cover_url, b.genre
       FROM favorites f
       JOIN books b ON b.id = f.book_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT 50`,
      [id]
    )

    return NextResponse.json({
      user: userRes.rows[0],
      stats: statsRes.rows[0],
      history: historyRes.rows,
      favorites: favoritesRes.rows
    })
  } catch (err) {
    console.error('Student detail error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * PATCH /api/librarian/students/[id]
 * Обновить данные ученика: имя, класс, телефон, пароль.
 *
 * БЕЗОПАСНОСТЬ:
 * - Редактировать можно ТОЛЬКО учеников. Другого библиотекаря — нельзя
 *   (иначе любой библиотекарь перезаписывал бы пароль коллеги и входил под ним).
 * - Себя библиотекарь править может (имя/телефон/пароль).
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params
  const selfId = guard.payload.id

  try {
    const target = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    )
    if (!target.rows[0]) {
      return NextResponse.json({ error: 'Не найден' }, { status: 404 })
    }
    if (target.rows[0].role === 'librarian' && Number(id) !== Number(selfId)) {
      return NextResponse.json(
        { error: 'Нельзя редактировать другого библиотекаря' },
        { status: 403 }
      )
    }

    const { name, className, phone, password } = await req.json()

    const fields = []
    const values = []
    let i = 1

    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json({ error: 'Имя не может быть пустым' }, { status: 400 })
      }
      fields.push(`name = $${i++}`)
      values.push(String(name).trim())
    }
    if (className !== undefined) {
      fields.push(`class_name = $${i++}`)
      values.push(className || null)
    }
    if (phone !== undefined) {
      fields.push(`phone = $${i++}`)
      values.push(phone || null)
    }
    if (password) {
      if (String(password).length < 6) {
        return NextResponse.json(
          { error: 'Пароль должен быть не короче 6 символов' },
          { status: 400 }
        )
      }
      fields.push(`password = $${i++}`)
      values.push(await bcrypt.hash(password, 10))
      fields.push(`password_view = $${i++}`)
      values.push(sealPassword(password))
      // Сброс пароля библиотекарем выкидывает ученика со всех устройств
      fields.push(`token_version = token_version + 1`)
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 })
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    // Строка-guard по роли остаётся и в самом UPDATE (защита от гонки)
    const res = await pool.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${i} AND (role = 'student' OR id = $${i + 1})
       RETURNING id, name, email, role, class_name, phone`,
      [...values, selfId]
    )

    if (!res.rows[0]) {
      return NextResponse.json(
        { error: 'Недостаточно прав или пользователь не найден' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, student: res.rows[0] })
  } catch (err) {
    console.error('Update student error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/librarian/students/[id]
 * Удалить ученика. Только если у него нет активных займов.
 */
export async function DELETE(req, { params }) {
  // Удаляет библиотекарь или тимлид командной платформы
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response

  const { id } = await params
  const force = new URL(req.url).searchParams.get('force') === '1'

  if (Number(id) === Number(guard.payload.id)) {
    return NextResponse.json({ error: 'Нельзя удалить свой аккаунт' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const target = await client.query(
      `SELECT u.id, u.role, u.name,
              EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id) AS in_team
         FROM users u WHERE u.id = $1 FOR UPDATE`, [id])
    const t = target.rows[0]
    if (!t) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Не найден' }, { status: 404 }) }
    if (t.role !== 'student') {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Удалять можно только учеников' }, { status: 403 })
    }
    if (t.in_team) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Это участник команды — сначала уберите его с командной платформы' }, { status: 400 })
    }

    const active = await client.query(
      `SELECT id, book_id FROM borrows WHERE user_id = $1 AND status = 'active'`, [id])
    if (active.rows.length && !force) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: `У ученика на руках книг: ${active.rows.length}`, active_books: active.rows.length },
        { status: 409 }
      )
    }
    // force: книги считаем возвращёнными, экземпляры возвращаются в фонд
    for (const b of active.rows) {
      await client.query(
        'UPDATE books SET available_copies = LEAST(available_copies + 1, total_copies), updated_at = NOW() WHERE id = $1',
        [b.book_id])
    }

    await client.query(`DELETE FROM users WHERE id = $1 AND role = 'student'`, [id])
    await client.query('COMMIT')
    return NextResponse.json({ success: true, returned_books: active.rows.length })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Delete student error:', err)
    return NextResponse.json({ error: 'Не удалось удалить ученика' }, { status: 500 })
  } finally {
    client.release()
  }
}
