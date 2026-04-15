import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"
import pool from '../../../lib/db'

export async function GET(req) {
	const auth = req.headers.get('authorization')
	if (!auth) {
		return NextResponse.json({ error: "Токена нету" }, { status: 401})
	}
	const token = auth.split(" ")[1]
	const payload = jwt.verify(token,'любой_длинный_секретный_текст_123')
	const userId = payload.id;
	const result = await pool.query("SELECT id,name,email,role FROM users WHERE id = $1", [userId])
	const activeBooks = await pool.query(`
   SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author,books.id as book_id, borrows.deadline
    FROM borrows 
    JOIN books ON borrows.book_id = books.id 
    WHERE borrows.user_id = $1 AND borrows.status = 'active'
`, [userId])

	const finishedBooks = await pool.query(`
    SELECT borrows.id as borrow_id, books.title, books.cover_url, books.author
    FROM borrows 
    JOIN books ON borrows.book_id = books.id 
    WHERE borrows.user_id = $1 AND borrows.status = 'approved'
`, [userId]);
	return NextResponse.json({ user:  result.rows[0], active: activeBooks.rows, finished: finishedBooks.rows })
}