import { NextResponse } from 'next/server'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { notify } from '../../../../../lib/notify'
import { BONUSES, tierForPages } from '../../../../../lib/points'

/**
 * PATCH /api/librarian/reviews/[id]
 * Библиотекарь или участник команды одобряет / отклоняет отзыв.
 * Свой собственный отзыв проверить нельзя — иначе можно самому себе начислить монеты.
 * Body: { action: 'approve' | 'reject', note?, bonuses?: ['video','tedx'], pagesRead? }
 *
 * При approve:
 * - отзыв → approved
 * - заём → approved (книга в "прочитанные", личная полка)
 * - начисляются баллы: +5 за отзыв, за объём книги, бонусы за видео/TEDx
 */
export async function PATCH(req, { params }) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response

  const { id } = await params
  const { action, note, bonuses, pagesRead } = await req.json()

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

    if (Number(review.user_id) === Number(guard.payload.id)) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Свой отзыв проверяет другой участник или библиотекарь' }, { status: 403 })
    }

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
      await notify(client, review.user_id, {
        kind: 'review_rejected',
        title: 'Отзыв нужно переписать',
        body: note ? `Библиотекарь: ${note}` : 'Открой профиль и напиши отзыв своими словами ещё раз.',
        link: '/profile'
      })
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

    // === Начисление баллов (правила — в lib/points.js) ===
    let totalPoints = 0
    const awarded = []
    const award = async (points, reason, description) => {
      await client.query(
        `INSERT INTO user_points (user_id, points, reason, description, borrow_id, book_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [review.user_id, points, reason, description, review.borrow_id, review.book_id, guard.payload.id]
      )
      totalPoints += points
      awarded.push({ reason: description, points })
    }

    // За отзыв
    await award(BONUSES.review.points, 'review', BONUSES.review.title)

    // За объём книги (страницы из карточки книги или указанные библиотекарем)
    const tier = tierForPages(parseInt(pagesRead) || parseInt(review.book_pages) || 0)
    if (tier) {
      await award(tier.points, tier.code, `Прочитал книгу: ${tier.label}`)
    }

    // Бонусы за видео / TEDx — библиотекарь отмечает галочками.
    // bonusPoints (старое поле: число) больше не принимается — только известные бонусы.
    const extra = Array.isArray(bonuses) ? bonuses : []
    for (const code of ['video', 'tedx']) {
      if (extra.includes(code)) {
        await award(BONUSES[code].points, code, BONUSES[code].title)
      }
    }

    await notify(client, review.user_id, {
      kind: 'review_approved',
      title: `Отзыв одобрен · +${totalPoints} монет`,
      body: awarded.map(a => `${a.reason} +${a.points}`).join(' · '),
      link: '/profile'
    })
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