import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { approvedTeacher } from '../../../../lib/teachers'
import { notifyMany } from '../../../../lib/notify'

/** GET — мои советы книг. */
export async function GET(req) {
  const guard = await requireAuth(req, ['teacher'])
  if (!guard.ok) return guard.response
  try {
    const r = await pool.query(`
      SELECT t.id, t.class_name, t.note, t.created_at, b.id AS book_id, b.title, b.author, b.cover_url
        FROM teacher_recommendations t JOIN books b ON b.id = t.book_id
       WHERE t.teacher_id = $1 ORDER BY t.created_at DESC LIMIT 100`, [guard.payload.id])
    return NextResponse.json(r.rows)
  } catch (err) {
    console.error('[recs GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/** POST { bookId, className?, note? } — посоветовать книгу классу (или всей школе без класса). */
export async function POST(req) {
  const guard = await requireAuth(req, ['teacher'])
  if (!guard.ok) return guard.response
  const { teacher, error, status } = await approvedTeacher(pool, guard.payload.id)
  if (error) return NextResponse.json({ error }, { status })
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const bookId = parseInt(body?.bookId)
  const cls = String(body?.className || '').trim().slice(0, 40) || null
  const note = String(body?.note || '').trim().slice(0, 300) || null
  try {
    const b = await pool.query('SELECT id, title FROM books WHERE id = $1', [bookId])
    if (!b.rows[0]) return NextResponse.json({ error: 'Книга не найдена' }, { status: 404 })
    const r = await pool.query(
      `INSERT INTO teacher_recommendations (teacher_id, book_id, class_name, note) VALUES ($1, $2, $3, $4) RETURNING id`,
      [teacher.id, bookId, cls, note])
    const students = await pool.query(
      `SELECT id FROM users WHERE role = 'student' ${cls ? 'AND class_name = $1' : ''}`, cls ? [cls] : [])
    await notifyMany(pool, students.rows.map(s => s.id), {
      kind: 'recommendation',
      title: `${teacher.name} советует: ${b.rows[0].title}`,
      body: note, link: `/books/${bookId}`
    })
    return NextResponse.json({ success: true, id: r.rows[0].id, notified: students.rows.length })
  } catch (err) {
    console.error('[recs POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
