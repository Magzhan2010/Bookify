import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/librarian/history
 *
 * Возвращает ОБЪЕДИНЁННЫЙ список:
 * - book_requests (заявки учеников) — когда кто-то запросил книгу
 * - borrows (выдачи и возвраты) — когда библиотекарь выдал/принял книгу
 *
 * Query:
 *   from ?    YYYY-MM-DD
 *   to ?      YYYY-MM-DD
 *   student ? id|name
 *   book ?    id|title
 *   status ?  pending|approved|rejected|fulfilled|active|returned
 */
export async function GET(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const student = searchParams.get('student')
  const book = searchParams.get('book')
  const status = searchParams.get('status')

  try {
    const filters = []
    const params = []
    let i = 1

    if (from) { filters.push(`event_at >= $${i++}`); params.push(from) }
    if (to) { filters.push(`event_at <= $${i++}`); params.push(to + ' 23:59:59') }
    if (student) {
      if (/^\d+$/.test(student)) { filters.push(`user_id = $${i++}`); params.push(parseInt(student)) }
      else { filters.push(`LOWER(student_name) LIKE $${i++}`); params.push(`%${student}%`) }
    }
    if (book) {
      if (/^\d+$/.test(book)) { filters.push(`book_id = $${i++}`); params.push(parseInt(book)) }
      else { filters.push(`LOWER(book_title) LIKE $${i++}`); params.push(`%${book}%`) }
    }
    if (status) { filters.push(`status = $${i++}`); params.push(status) }

    const where = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : ''

    // Объединённый список: заявки + выдачи/возвраты
    const sql = `
      SELECT * FROM (
        -- Заявки учеников
        SELECT
          'request' AS kind,
          r.id AS event_id,
          r.user_id, u.name AS student_name, u.class_name AS student_class,
          r.book_id, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover,
          r.status,
          NULL::int AS days_held,
          r.requested_at AS event_at,
          NULL::timestamp AS due_at,
          NULL::timestamp AS returned_at,
          NULL::timestamp AS borrowed_at,
          NULL::int AS rating,
          NULL::text AS notes,
          NULL::int AS issued_by_id,
          NULL::text AS issued_by_name
        FROM book_requests r
        JOIN users u ON u.id = r.user_id
        JOIN books b ON b.id = r.book_id

        UNION ALL

        -- Выдачи и возвраты
        SELECT
          'borrow' AS kind,
          br.id AS event_id,
          br.user_id, u.name AS student_name, u.class_name AS student_class,
          br.book_id, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover,
          br.status,
          CASE
            WHEN br.returned_at IS NOT NULL THEN EXTRACT(DAY FROM (br.returned_at - br.borrowed_at))::INT
            ELSE NULL
          END AS days_held,
          br.borrowed_at AS event_at,
          br.due_date AS due_at,
          br.returned_at,
          br.borrowed_at,
          br.rating,
          br.notes,
          br.issued_by AS issued_by_id,
          lib.name AS issued_by_name
        FROM borrows br
        JOIN users u ON u.id = br.user_id
        JOIN books b ON b.id = br.book_id
        LEFT JOIN users lib ON lib.id = br.issued_by
      ) AS events
      ${where}
      ORDER BY event_at DESC
      LIMIT 200
    `

    const result = await pool.query(sql, params)
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error('History error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}