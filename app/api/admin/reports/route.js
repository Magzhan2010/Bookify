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
    const payload = jwt.verify(token, "любой_длинный_секретный_текст_123")

    // Базовый запрос
    let queryText = `
      SELECT 
        reports.*, 
        users.name as student_name,
        COALESCE(books.title, reports.custom_title) as book_title
      FROM reports
      LEFT JOIN users ON reports.user_id = users.id
      LEFT JOIN books ON reports.book_id = books.id
    `;
    
    let queryParams = [];

    // ЛОГИКА РОЛЕЙ:
    if (payload.role === 'teacher' || payload.role === 'admin') {
      // Учителя и админы видят ВСЕ отчеты
      queryText += ` ORDER BY reports.created_at DESC`;
    } else {
      // Ученики видят ТОЛЬКО СВОИ отчеты
      queryText += ` WHERE reports.user_id = $1 ORDER BY reports.created_at DESC`;
      queryParams.push(payload.id);
    }

    const result = await pool.query(queryText, queryParams);

    console.log(`Найдено отчетов: ${result.rows.length}`)
    
    return NextResponse.json(result.rows)

  } catch (err) {
    console.error("ОШИБКА В API REPORTS:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}