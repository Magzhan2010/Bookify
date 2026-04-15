import { NextResponse } from "next/server"
import pool from '../../../../lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req) {
	const { name, email, password } = await req.json()
	const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
	const isEmail = result.rows[0]
	if (isEmail) {
		return NextResponse.json({ error: "Почта занят" }, { status: 400 })
	}
	const hashPass = await bcrypt.hash(password, 10)
	let role = 'student'
	if (email.includes("@teacher.school.com")) {
		role = 'teacher'
	}
	await pool.query("INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4)", [name, email,hashPass,role])
	return NextResponse.json({ success: true })
} 