import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import pool from "../../../../lib/db"

export async function POST(req) {
	try {
		const { title,target,start_date,end_date,rating } = await req.json()
		const auth = req.headers.get('authorization')
		if (!auth) {
			return NextResponse.json({ error: "Токена нету" }, { status: 401 })
		}
		const token = auth.split(" ")[1]
		const payload = jwt.verify(token,process.env.JWT_SECRET)
		const id  = payload.id
		const checkBook = await pool.query("SELECT id FROM book_tracker WHERE title = $1 AND user_id = $2", [title,id])
		if (checkBook.rows.length > 0) {
			await pool.query(
      "UPDATE book_tracker SET start_date = $1, end_date = $2, rating = $3 WHERE user_id = $4 AND title = $5", 
      [start_date, end_date, rating,id,title])
		} else {
			await pool.query("INSERT INTO book_tracker (user_id, title, target, start_date, end_date, rating) VALUES($1, $2, $3, $4, $5,$6)", 
        [id, title, target, start_date, end_date, rating])
		}
		return NextResponse.json({ success: true })
		
	} catch(err) {
		console.error(err.message)
		return NextResponse.json({ error:err.message }, { status: 500 })
	}

} 


export async function GET(req) {
	try {
		const auth = req.headers.get('authorization')
		if (!auth) {
			return NextResponse.json({ error: "Токена нету" }, { status: 401 })
		}
		const token = auth.split(" ")[1]
		const payload = jwt.verify(token,process.env.JWT_SECRET)
		const id  = payload.id
	
		const result = await pool.query("SELECT * FROM book_tracker WHERE user_id = $1", [id])
	
		return NextResponse.json({ success:true,bookTracker: result.rows })
	} catch(err) {
		return NextResponse.json({ error: err.message }, {status: 500})
	}
}