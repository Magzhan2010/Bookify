import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import pool from '../../../lib/db'

export async function POST(req) {
	try {
		const { bookId, borrowId, quote1, quote2, confusing, life_example, apply_today, rating } = await req.json()

		const auth = req.headers.get("authorization")
		if (!auth) return NextResponse.json({ error: "Токена нету" }, { status: 401 })
		const token = auth.split(' ')[1]

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

		// Проверяем что заём принадлежит этому студенту
		const borrowCheck = await pool.query(
			"SELECT * FROM borrows WHERE id = $1 AND user_id = $2 AND status = 'active'",
			[borrowId, userId]
		)
		if (!borrowCheck.rows[0]) {
			return NextResponse.json({ error: "У вас нет активной книги" }, { status: 403 })
		}

		const existingReport = await pool.query("SELECT id FROM reports WHERE user_id = $1 AND book_id = $2", [userId, bookId])
		if (existingReport.rows.length > 0) {
			return NextResponse.json({ error: "Ты уже сдавал отчет по этой книге!" }, { status: 403 })
		}

		if (!quote1 || !quote2 || !confusing || !life_example || !apply_today || !rating) {
			return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 })
		}
		if (quote1.length < 20 || quote2.length < 20 || confusing.length < 20 || life_example.length < 20 || apply_today.length < 20) {
			return NextResponse.json({ error: "Минимум 20 символов в каждом ответе" }, { status: 400 })
		}

		// Без AI — сохраняем отчёт со статусом pending
		await pool.query(
			`INSERT INTO reports 
			(user_id, book_id, borrow_id, quote1, quote2, confusing, life_example, apply_today, rating, ai_score, ai_feedback, status) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			[
				userId,
				bookId,
				borrowId,
				quote1, quote2, confusing, life_example, apply_today, rating,
				0, // ai_score = 0
				'Ожидает проверки учителем', // ai_feedback
				'pending' // status
			]
		)

		// Меняем статус заёма на submitted — освобождает слот (больше не active)
		await pool.query("UPDATE borrows SET status = 'submitted' WHERE id = $1", [borrowId])

		// Книга снова доступна для других
		await pool.query("UPDATE books SET available = true WHERE id = $1", [bookId])

		return NextResponse.json({ success: true, message: "Отчет отправлен учителю" })

	} catch (err) {
		console.error(err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
}

export async function PATCH(req) {
	const client = await pool.connect()
	try {
		await client.query("BEGIN")
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

		if (payload.role !== 'admin' && payload.role !== 'teacher') {
			return NextResponse.json({ error: "Только для учителя" }, { status: 403 })
		}
		const { reportId, bookId, borrowId, userId } = await req.json()
		await client.query("UPDATE reports SET status = 'approved' WHERE id = $1", [reportId])
		await client.query("UPDATE borrows SET status = 'approved' WHERE id = $1 AND user_id = $2", [borrowId, userId])
		if (bookId) {
			await client.query("UPDATE books SET available = true WHERE id = $1", [bookId])
		}
		await client.query("COMMIT")
		return NextResponse.json({ success: true, message: "Книга на полке ученика" })

	} catch (err) {
		console.error(err.message)
		await client.query("ROLLBACK")
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
	} finally { client.release() }
}
