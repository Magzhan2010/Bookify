import { NextResponse } from "next/server"
import jwt from 'jsonwebtoken'
import pool from '../../../../../lib/db'


export async function DELETE(req,{params}) {
	const { id } = await params
	const auth = req.headers.get('authorization')
	if (!auth) {
		return NextResponse.json({ error: "Токена нету" },  {status: 401})
	}
	const token = auth.split(' ')[1]
	const payload = jwt.verify(token,'любой_длинный_секретный_текст_123')
	if (payload.role !== 'admin' && payload.role !== 'teacher') {
		return NextResponse.json({ error: "Только Админ" }, { status: 403 })
	}
	await pool.query("DELETE FROM reports WHERE id = $1", [id])
	return NextResponse.json({ success:true })
}