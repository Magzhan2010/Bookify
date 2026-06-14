import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
export async function GET(req) {
	const q = req.nextUrl.searchParams.get('q')
	const result = await pool.query("SELECT * FROM books WHERE title ILIKE $1 OR author ILIKE $1 LIMIT 5",[`%${q}%`])
	return NextResponse.json(result.rows)
}