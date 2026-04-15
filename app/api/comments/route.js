import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import pool from '../../../lib/db'


export async function POST(req) {
	const { bookId,content } = await req.json()

	const auth = req.headers.get("authorization")
	if (!auth) {
		return NextResponse.json({ error:"Токена нету" }, { status: 401 })
	}
	const token = auth.split(' ')[1]
	const payload = jwt.verify(token, 'любой_длинный_секретный_текст_123')
	const userId = payload.id

	const insertRes = await pool.query('INSERT INTO comment(content, user_id,book_id) VALUES($1,$2,$3) RETURNING id',[content,userId,bookId])
	const newCommentId = insertRes.rows[0].id

	const fullComment = await pool.query(`SELECT comment.*, 	users.name as user_name 
       FROM comment 
       JOIN users ON comment.user_id = users.id 
       WHERE comment.id = $1`, [newCommentId])

	return NextResponse.json({ newComment: fullComment.rows[0] })
}

export async function GET(req) {
	const { searchParams } = new URL(req.url)
	const bookId = searchParams.get('bookId')
	
	if (!bookId) return NextResponse.json({ error: "ID книги не найдена" }, { status: 401 })
	const result = await pool.query(`
    SELECT 
      comment.id, 
      comment.content, 
      comment.created_at, 
      comment.is_pinned, 
      users.name as user_name 
    FROM comment 
    JOIN users ON comment.user_id = users.id 
    WHERE comment.book_id = $1 
    ORDER BY comment.is_pinned DESC, comment.created_at DESC
  `, [bookId])
	return NextResponse.json(result.rows)
}

export async function PATCH(req) {
	const { commentId } = await req.json()
	const auth = req.headers.get('authorization')
	if (!auth) {
		return NextResponse.json({ error: "Токена" }, { status: 401})
	}
	const token = auth.split(' ')[1]
	const payload = jwt.verify(token, "любой_длинный_секретный_текст_123")

	if (payload.role !== 'admin') {
		return NextResponse.json({ error: "Только Админ" }, { status: 403 })
	}

	const result = await pool.query('UPDATE comment SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING *', [commentId])
	
	if (result.rowCount === 0) {
		return NextResponse.json({ error: "Коментарий не найден" }, { status: 404 })
	}

	return NextResponse.json({ success: true, updatedComment: result.rows[0] })

}