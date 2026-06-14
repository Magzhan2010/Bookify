import pool from '../../../../lib/db'
import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"

export async function POST(req) {
	const client = await pool.connect()
	try {
		const { bookId } = await req.json()
		const auth = req.headers.get('authorization')
		const token = auth?.split(' ')[1]
		if (!token) {
			return NextResponse.json({ error: "Токен не найден" }, { status: 401 })
		}

		const secret = process.env.JWT_SECRET
		if (!secret) {
			return NextResponse.json({ error: "JWT_SECRET не задан" }, { status: 500 })
		}

		let payload
		try {
			payload = jwt.verify(token, secret)
		} catch (err) {
			if (err.name === 'TokenExpiredError') {
				return NextResponse.json({ error: "Токен истёк, войдите заново" }, { status: 401 })
			}
			return NextResponse.json({ error: "Недействительный токен" }, { status: 401 })
		}

		const userId = payload.id

		await client.query('BEGIN')

		// Проверяем сколько книг уже на руках
		const userLoans = await client.query(
			"SELECT COUNT(*) as count FROM borrows WHERE user_id = $1 AND status = 'active'",
			[userId]
		)
		const count = parseInt(userLoans.rows[0].count)
		if (count >= 3) {
			await client.query('ROLLBACK')
			return NextResponse.json({ error: "Максимум 3 книги одновременно" }, { status: 400 })
		}

		// Проверяем доступность книги (FOR UPDATE блокирует строку)
		const bookCheck = await client.query(
			'SELECT available FROM books WHERE id = $1 FOR UPDATE',
			[bookId]
		)
		if (!bookCheck.rows[0] || !bookCheck.rows[0].available) {
			await client.query('ROLLBACK')
			return NextResponse.json({ error: "Книга недоступна" }, { status: 400 })
		}

		// Не дать взять одну книгу дважды
		const alreadyBorrowed = await client.query(
			"SELECT id FROM borrows WHERE user_id = $1 AND book_id = $2 AND status = 'active'",
			[userId, bookId]
		)
		if (alreadyBorrowed.rows.length > 0) {
			await client.query('ROLLBACK')
			return NextResponse.json({ error: "Вы уже взяли эту книгу" }, { status: 400 })
		}

		const result = await client.query(
			"INSERT INTO borrows (book_id, user_id, deadline, status) VALUES ($1, $2, CURRENT_DATE + INTERVAL '14 days', 'active') RETURNING id, deadline",
			[bookId, userId]
		)

		// ИСПРАВЛЕНО: помечаем книгу как недоступную
		await client.query(
			'UPDATE books SET available = false WHERE id = $1',
			[bookId]
		)

		await client.query('COMMIT')
		return NextResponse.json({
			success: true,
			borrowId: result.rows[0].id,
			deadline: result.rows[0].deadline
		})

	} catch (err) {
		await client.query('ROLLBACK')
		console.error(err)
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
	} finally {
		client.release()
	}
}
