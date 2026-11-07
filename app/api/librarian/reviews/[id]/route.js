import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/**
 * PATCH /api/librarian/reviews/[id]
 * Библиотекарь одобряет или отклоняет отзыв.
 * Body: { action: 'approve' | 'reject', note?, bonusPoints? }
 *
 * При approve:
 * - отзыв → approved
 * - заём → approved (книга в "прочитанные", личная полка)
 * - начисляются баллы: +5 за отзыв + бонус за страницы (если указано количество страниц)
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params
  const { action, note, bonusPoints, pagesRead } = await req.json()

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const reviewRes = await client.query(
      `SELECT r.*, b.pages AS book_pages, u.name AS student_name
       FROM book_reviews r
       JOIN books b ON b.id = r.book_id
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1 FOR UPDATE`,
      [id]
    )
    if (!reviewRes.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
    }

    const review = reviewRes.rows[0]

    if (review.status !== 'pending') {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Отзыв уже обработан' }, { status: 400 })
    }

    if (action === 'reject') {
      await client.query(
        `UPDATE book_reviews
         SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_note = $2
         WHERE id = $3`,
        [guard.payload.id, note || null, id]
      )
      // Возвращаем заём в returned — ученик может переписать отзыв
      await client.query(
        "UPDATE borrows SET status = 'returned', updated_at = NOW() WHERE id = $1",
        [review.borrow_id]
      )
      await client.query('COMMIT')
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    // === APPROVE ===
    await client.query(
      `UPDATE book_reviews
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_note = $2
       WHERE id = $3`,
      [guard.payload.id, note || null, id]
    )

    // Заём → approved (книга попадает на личную полку)
    await client.query(
      "UPDATE borrows SET status = 'approved', updated_at = NOW() WHERE id = $1",
      [review.borrow_id]
    )

    // === Начисление баллов ===
    let totalPoints = 0
    const awarded = []

    // +5 за отзыв
    await client.query(
      `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
       VALUES ($1, 5, 'review', 'Написал отзыв о книге', $2, $3, $4)`,
      [review.user_id, review.borrow_id, review.book_id, guard.payload.id]
    )
    totalPoints += 5
    awarded.push({ reason: 'Отзыв', points: 5 })

    // Баллы за страницы (по количеству страниц в книге или переданному значению)
    const pages = parseInt(pagesRead) || parseInt(review.book_pages) || 0
    if (pages >= 500) {
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
         VALUES ($1, 20, 'pages_500_plus', 'Прочитал 500+ страниц', $2, $3, $4)`,
        [review.user_id, review.borrow_id, review.book_id, guard.payload.id]
      )
      totalPoints += 20
      awarded.push({ reason: '500+ страниц', points: 20 })
    } else if (pages >= 301) {
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
         VALUES ($1, 15, 'pages_301_400', 'Прочитал 301-400 страниц', $2, $3, $4)`,
        [review.user_id, review.borrow_id, review.book_id, guard.payload.id]
      )
      totalPoints += 15
      awarded.push({ reason: '301-400 страниц', points: 15 })
    } else if (pages >= 201) {
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
         VALUES ($1, 10, 'pages_201_300', 'Прочитал 201-300 страниц', $2, $3, $4)`,
        [review.user_id, review.borrow_id, review.book_id, guard.payload.id]
      )
      totalPoints += 10
      awarded.push({ reason: '201-300 страниц', points: 10 })
    } else if (pages >= 100) {
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
         VALUES ($1, 5, 'pages_100_200', 'Прочитал 100-200 страниц', $2, $3, $4)`,
        [review.user_id, review.borrow_id, review.book_id, guard.payload.id]
      )
      totalPoints += 5
      awarded.push({ reason: '100-200 страниц', points: 5 })
    }

    // Дополнительный бонус от библиотекаря (видео/TEDx)
    if (bonusPoints && parseInt(bonusPoints) > 0) {
      const bp = parseInt(bonusPoints)
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
         VALUES ($1, $2, 'bonus', $3, $4, $5, $6)`,
        [review.user_id, bp, note || 'Дополнительный бонус от библиотекаря', review.borrow_id, review.book_id, guard.payload.id]
      )
      totalPoints += bp
      awarded.push({ reason: note || 'Бонус', points: bp })
    }

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      status: 'approved',
      total_points: totalPoints,
      awarded,
      student_name: review.student_name
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Review action error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  } finally {
    client.release()
  }
}

/**
 * DELETE /api/librarian/reviews/[id]
 * Удалить отзыв.
 */
export async function DELETE(req, { params }) {
  const guard = await requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params

  try {
    const res = await pool.query(
      'DELETE FROM book_reviews WHERE id = $1 RETURNING borrow_id',
      [id]
    )
    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
    }
    // Возвращаем заём в returned
    await pool.query(
      "UPDATE borrows SET status = 'returned', updated_at = NOW() WHERE id = $1",
      [res.rows[0].borrow_id]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}