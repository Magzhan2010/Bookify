import pool from '../../../../lib/db'
import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"

export async function POST(req) {
	try{
		const { bookId } = await req.json()
		const auth = req.headers.get('authorization')
		 
		const token = auth?.split(' ')[1]
		if (!token) {
			return NextResponse.json({ error:"Токен не найден" }, {status: 401})
		}
		const payload = jwt.verify(token, 'любой_длинный_секретный_текст_123')
		const userId = payload.id
		
		const userLoans = await pool.query("SELECT COUNT(*) FROM borrows WHERE user_id = $1 AND status = 'active'", [userId])
		const count = parseInt(userLoans.rows[0].count)
		console.log("СКОЛЬКО КНИГ У ЮЗЕРА:", count);
		if (count >= 3) return NextResponse.json({ error: "Предел книг" }, { status: 400 })
		
		
	
		const result = await pool.query("INSERT INTO borrows (book_id, user_id, deadline) VALUES ($1, $2, CURRENT_DATE + INTERVAL '14 days') RETURNING id, deadline", [bookId,userId])
		return NextResponse.json({ success: true, borrowId: result.rows[0].id, deadline: result.rows[0].deadline })

	} catch(err) {
		console.error(err)
		return NextResponse.json({ error: "Ошибка Сервера" }, { status: 500 })
	}
}