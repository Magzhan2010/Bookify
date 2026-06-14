import { NextResponse } from "next/server"
import pool from '../../../../lib/db'
import jwt from "jsonwebtoken"

export async function POST(req) {
	const client = await pool.connect()
	try {
		const { borrowId, bookId } = await req.json()
		const auth = req.headers.get('authorization')
		const token = auth?.split(' ')[1]

		if (!token) {
			return NextResponse.json({ error: "Токена нету" }, { status: 401 })
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

		// ИСПРАВЛЕНО: проверяем что заём принадлежит этому пользователю
		const borrowCheck = await pool.query(
			'SELECT user_id, book_id FROM borrows WHERE id = $1',
			[borrowId]
		)
		if (!borrowCheck.rows[0]) {
			return NextResponse.json({ error: "Заём не найден" }, { status: 404 })
		}
		if (borrowCheck.rows[0].user_id !== userId) {
			return NextResponse.json({ error: "Это не ваша книга" }, { status: 403 })
		}

		const realBookId = bookId || borrowCheck.rows[0].book_id

		await client.query("BEGIN")

		await client.query(
			"UPDATE borrows SET status = 'returned', return_date = CURRENT_DATE WHERE id = $1 AND user_id = $2",
			[borrowId, userId]
		)

		await client.query(
			"UPDATE books SET available = true WHERE id = $1",
			[realBookId]
		)

		await client.query("COMMIT")
		return NextResponse.json({ success: true })

	} catch (err) {
		await client.query("ROLLBACK")
		console.error(err)
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
	} finally {
		client.release()
	}
}
