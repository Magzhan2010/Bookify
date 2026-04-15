import { NextResponse } from "next/server"
import jwt from 'jsonwebtoken'
import pool from "../../../../lib/db"

export async function GET(req) {
  try {
    console.log("--- GET REPORTS START ---")
    
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ error: "Токена нету" }, { status: 401 })
    }

    const token = auth.split(' ')[1]
    // Проверь, чтобы секрет был ТАКИМ ЖЕ как при логине!
    const payload = jwt.verify(token, "любой_длинный_секретный_текст_123")

    if (payload.role !== 'teacher' && payload.role !== 'admin') {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 })
    }

    // Тот самый мощный запрос с LEFT JOIN
   const result = await pool.query(`
			SELECT 
				reports.*, 
				users.name as student_name,
				COALESCE(books.title, reports.custom_title) as book_title
			FROM reports
			LEFT JOIN users ON reports.user_id = users.id
			LEFT JOIN books ON reports.book_id = books.id
			ORDER BY reports.created_at DESC
		`);

    console.log(`Найдено отчетов: ${result.rows.length}`)
    
    return NextResponse.json(result.rows)

  } catch (err) {
    console.error("ОШИБКА В API REPORTS:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
