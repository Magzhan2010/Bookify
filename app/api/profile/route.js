import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"
import pool from '../../../lib/db'

export async function GET(req) {
	const auth = req.headers.get('authorization')
	if (!auth) {
		return NextResponse.json({ error: "Токена нету" }, { status: 401 })
	}
	const token = auth.split(" ")[1]

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

	const userId = payload.id;
	const result = await pool.query("SELECT id,name,email,role FROM users WHERE id = $1", [userId])

	// Активные книги (ученик сейчас читает)
	const activeBooks = await pool.query(`
		SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author, books.id as book_id, borrows.deadline
		FROM borrows 
		JOIN books ON borrows.book_id = books.id 
		WHERE borrows.user_id = $1 AND borrows.status = 'active'
	`, [userId])

	// Книги на проверке (отчёт сдан, ждёт учителя)
	const submittedBooks = await pool.query(`
		SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author, books.id as book_id
		FROM borrows 
		JOIN books ON borrows.book_id = books.id 
		WHERE borrows.user_id = $1 AND borrows.status = 'submitted'
	`, [userId])

	// Законченные книги (учитель подтвердил — на полке)
	const finishedBooks = await pool.query(`
		SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author
		FROM borrows 
		JOIN books ON borrows.book_id = books.id 
		WHERE borrows.user_id = $1 AND borrows.status = 'approved'
	`, [userId]);

	return NextResponse.json({ 
		user: result.rows[0], 
		active: activeBooks.rows, 
		submitted: submittedBooks.rows,
		finished: finishedBooks.rows 
	})
}
