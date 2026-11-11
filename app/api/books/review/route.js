import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { getGameStart } from '../../../../lib/game'
import { reviewLengthError } from '../../../../lib/reviewRules'

/**
 * POST /api/books/review
 * Ученик пишет отзыв о прочитанной книге.
 * Body: { borrowId, rating, content }
 *
 * Правила:
 * - книга должна быть у ученика и возвращена (status = 'returned')
 * - один отзыв на книгу (UNIQUE borrow_id)
 * - от 150 до 300 слов (требования школы, lib/reviewRules.js)
 */
export async function POST(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response

  const { borrowId, rating, content } = await req.json()

  if (!borrowId) return NextResponse.json({ error: 'Не указан займ' }, { status: 400 })
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Поставь оценку от 1 до 5' }, { status: 400 })
  }
  const lengthError = reviewLengthError(content)
  if (lengthError) return NextResponse.json({ error: lengthError }, { status: 400 })
  if (content.length > 4000) {
    return NextResponse.json({ error: 'Слишком длинный текст' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Проверяем заём
    const borrowRes = await client.query(
      `SELECT b.*, bk.title, bk.cover_url, bk.pages
       FROM borrows b
       JOIN books bk ON bk.id = b.book_id
       WHERE b.id = $1 AND b.user_id = $2 FOR UPDATE`,
      [borrowId, guard.payload.id]
    )
    if (!borrowRes.rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Книга не найдена у тебя' }, { status: 404 })
    }

    const borrow = borrowRes.rows[0]

    if (borrow.status === 'active') {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Сначала верни книгу в библиотеку' },
        { status: 400 }
      )
    }
    const start = await getGameStart(client)
    if (start && borrow.returned_at && new Date(borrow.returned_at) < new Date(start)) {
      await client.query('ROLLBACK')
      return NextResponse.json(
        { error: 'Эта книга сдана до старта программы — за неё монеты не начисляются' },
        { status: 400 }
      )
    }
    if (borrow.status === 'reviewed' || borrow.status === 'approved') {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Ты уже написал отзыв на эту книгу' }, { status: 400 })
    }

    // Отзыв мог быть отклонён библиотекарем — тогда переписываем его,
    // а не создаём новый (на borrow_id стоит UNIQUE, и INSERT падал с
    // «Отзыв уже написан», хотя ученика просили переписать)
    const existing = await client.query(
      'SELECT id, status FROM book_reviews WHERE borrow_id = $1 FOR UPDATE',
      [borrowId]
    )
    let review
    if (existing.rows[0]) {
      if (existing.rows[0].status !== 'rejected') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Ты уже написал отзыв на эту книгу' }, { status: 400 })
      }
      review = await client.query(
        `UPDATE book_reviews
            SET rating = $1, content = $2, status = 'pending',
                reviewed_by = NULL, reviewed_at = NULL, review_note = NULL,
                created_at = NOW()
          WHERE id = $3
          RETURNING *`,
        [parseInt(rating), content.trim(), existing.rows[0].id]
      )
    } else {
      review = await client.query(
        `INSERT INTO book_reviews (borrow_id, user_id, book_id, rating, content)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [borrowId, guard.payload.id, borrow.book_id, parseInt(rating), content.trim()]
      )
    }

    // Заём переходит в статус "reviewed" (ждёт одобрения)
    await client.query(
      "UPDATE borrows SET status = 'reviewed', rating = $2, updated_at = NOW() WHERE id = $1",
      [borrowId, parseInt(rating)]
    )

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      review: review.rows[0],
      book_title: borrow.title,
      message: 'Отзыв отправлен! Библиотекарь проверит и начислит баллы'
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Create review error:', err)
    if (err.message?.includes('duplicate key')) {
      return NextResponse.json({ error: 'Отзыв уже написан' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Не удалось сохранить отзыв' }, { status: 500 })
  } finally {
    client.release()
  }
}

/**
 * GET /api/books/review?borrowId=X
 * Мой отзыв по конкретному займу.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const borrowId = searchParams.get('borrowId')
  if (!borrowId) return NextResponse.json({ error: 'Не указан займ' }, { status: 400 })

  try {
    const res = await pool.query(
      'SELECT * FROM book_reviews WHERE borrow_id = $1 AND user_id = $2',
      [borrowId, guard.payload.id]
    )
    return NextResponse.json(res.rows[0] || null)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}