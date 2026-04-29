import { NextResponse } from "next/server"
import pool from '../../../../lib/db'
import jwt from "jsonwebtoken"
export async function POST(req) {
  try {
    const { borrowId, bookId } = await req.json()
    const auth = req.headers.get('authorization')
    const token = auth?.split(' ')[1]

    if (!token) {
      return NextResponse.json({ error: "Токена нету" }, { status: 401 })
    }

    const payload = jwt.verify(token, "любой_длинный_секретный_текст_123")
    const userId = payload.id

    await pool.query("BEGIN")

  	await pool.query(
    	"UPDATE borrows SET status = 'returned', return_date = CURRENT_DATE WHERE id = $1 AND user_id = $2",
      [borrowId, userId]
    )

    await pool.query(
    	"UPDATE books SET available = true WHERE id = $1",
      [bookId]
    )

    await pool.query("COMMIT")

  	return NextResponse.json({ success: true })

  } catch (err) {
    await pool.query("ROLLBACK")  
    console.error(err)
  	return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}