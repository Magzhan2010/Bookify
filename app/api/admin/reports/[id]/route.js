import { NextResponse } from "next/server"
import jwt from 'jsonwebtoken'
import pool from '../../../../../lib/db'

export async function DELETE(req, { params }) {
	const { id } = await params
	const auth = req.headers.get('authorization')
	if (!auth) {
		return NextResponse.json({ error: "Токена нету" }, { status: 401 })
	}

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

	if (payload.role !== 'admin' && payload.role !== 'teacher') {
		return NextResponse.json({ error: "Только Админ" }, { status: 403 })
	}
	await pool.query("DELETE FROM reports WHERE id = $1", [id])
	return NextResponse.json({ success: true })
}
