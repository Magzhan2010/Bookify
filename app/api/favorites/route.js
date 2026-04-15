import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import pool from '../../../lib/db'

export async function POST(req) {
	const {bookId} = await req.json()
	const auth = req.headers.get('authorization')
	if (!auth) {
		return NextResponse.json({ error: "Токена нету" }, { status: 401 })
	}
	const token = auth.split(' ')[1]
	const payload = jwt.verify(token,"любой_длинный_секретный_текст_123")
	const userId = payload.id

	const bookCheck = await pool.query("SELECT * FROM favorites WHERE user_id = $1 AND book_id = $2",[userId,bookId])
	if (bookCheck.rows.length > 0) {
		return NextResponse.json({ error: 'Уже в избранном' }, { status: 400 })
	}
	await pool.query('INSERT INTO favorites(user_id,book_id) VALUES($1,$2)', [userId,bookId])
	return NextResponse.json({ success:true })
}

export async function DELETE(req) {
	const { bookId } = await req.json()
	const auth = req.headers.get("authorization")
	if (!auth) {
		return NextResponse.json({ error: "Токена нету" }, { status: 400 })
	}
	const token = auth.split(" ")[1]
	const payload = jwt.verify(token, "любой_длинный_секретный_текст_123")
	const userId = payload.id

	await pool.query("DELETE FROM favorites WHERE user_id = $1 AND book_id = $2", [userId,bookId])
	return NextResponse.json({ success: true })
}

export async function GET(req) {
	const auth = req.headers.get('authorization')
	if(!auth) {
		return NextResponse.json({ error: "Токена нету" }, {status: 401})
	}
	const token = auth.split(" ")[1]
	const payload = jwt.verify(token,"любой_длинный_секретный_текст_123")
	const userId = payload.id
	const result = await pool.query("SELECT books.* FROM books JOIN favorites ON books.id = favorites.book_id WHERE favorites.user_id = $1",[userId])
	return NextResponse.json(result.rows)
}