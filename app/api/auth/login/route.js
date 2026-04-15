import { NextResponse } from "next/server"
import pool from '../../../../lib/db'
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken"

export async function POST(req) {
	const { email, password } = await req.json()
	const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])
	const user = result.rows[0]
	if (!user) {
		return NextResponse.json({ error: "Пользователь не найден" }, { status: 400 })
	}

	const valid = await bcrypt.compare(password,user.password)
	if(!valid) {
		return NextResponse.json({ error: "Пароль не найден" }, { status: 400 })
	}

	const token = jwt.sign(
		{id: user.id, role: user.role, name: user.name},
		"любой_длинный_секретный_текст_123",
		{ expiresIn: '7d' }
	)
	return NextResponse.json({ token,user: { id: user.id,name: user.name, role: user.role,} })
}