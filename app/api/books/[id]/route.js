import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"
import pool from '../../../../lib/db'

export async function GET(req, {params}) {
	const {id} = await params
	try {
		const res = await pool.query("SELECT * FROM books WHERE id = $1", [id])
		if (!res.rows[0]) {
			return NextResponse.json({ error: "Книга не найдена" }, { status: 404 })
		}
		return NextResponse.json(res.rows[0])
	} catch(err) {
		console.error(err)
	}
}

export async function DELETE(req, { params }) {
	const { id } = await params; 	
	const auth = req.headers.get('authorization')

	const token = auth?.split(" ")[1]
	const payload = jwt.verify(token,"любой_длинный_секретный_текст_123")
	if (payload.role !== 'admin') {
		return NextResponse.json({ error:"Только Админ" }, {status: 401})
	}
	const result = await pool.query('DELETE FROM books WHERE id = $1', [parseInt(id)])
	console.log(result.rowCount)

	
	return NextResponse.json({ success: true })
}