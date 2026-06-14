import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'

export async function GET(req) {
	try {
		const q = req.nextUrl.searchParams.get('q')
		if (!q || !q.trim()) {
			return NextResponse.json([])
		}
		const result = await pool.query("SELECT * FROM books WHERE title ILIKE $1 OR author ILIKE $1 LIMIT 5", [`%${q}%`])
		return NextResponse.json(result.rows)
	} catch (err) {
		console.error(err)
		return NextResponse.json({ error: "Ошибка поиска" }, { status: 500 })
	}
}
