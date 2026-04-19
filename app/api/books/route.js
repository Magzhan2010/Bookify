import { NextResponse } from "next/server";
import jwt from 'jsonwebtoken'
import pool from '../../../lib/db'

export async function GET(req) {
	const { searchParams } = new URL(req.url)
	const countOnly = searchParams.get('countOnly') === 'true'
	const page = parseInt(searchParams.get('page')) || 1

	
	if (countOnly) {
		const result = await pool.query("SELECT COUNT(*) AS total FROM books")
		const sortBooks = await pool.query('SELECT * FROM books;')

		return NextResponse.json({total: result.rows[0].total,sortBooks: result.rows[0]})
	} else {
		const limit = 12
		const offset = (page - 1) * limit
		const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC LIMIT $1 OFFSET $2;', [limit,offset])
		return NextResponse.json(result.rows)
	}


};


export async function POST(req) {
	const auth = req.headers.get("authorization")
	const token = auth?.split(' ')[1]
	if (!token) {
		return NextResponse.json({ error: "Доступа нет" }, { status: 401 })
	}

	const payload = jwt.verify(token,process.env.JWT_SECRET)
	if(payload.role !== 'admin') {
		return NextResponse.json({ error: "Только для Админа" }, { status: 403 })
	}

	const { title, author, genre, year, description, cover_url, available,file } = await req.json();

	await pool.query("INSERT INTO books(title, author, genre, year, description,cover_url, available,file) VALUES($1,$2,$3,$4,$5,$6,$7,$8);",[title, author,genre,year, description,cover_url,available,file])
	
	return NextResponse.json({ success: true })
}