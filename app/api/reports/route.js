import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import pool from '../../../lib/db'
import Anthropic from '@anthropic-ai/sdk'


export async function POST(req){
	try {
		const { bookId, borrowId, quote1, quote2, confusing, life_example, apply_today, rating} = await req.json()

		const auth = req.headers.get("authorization")
		if (!auth) return NextResponse.json({ error: "Токена нету" }, { status: 401 })
		const token = auth.split(' ')[1]

		const payload = jwt.verify(token, "любой_длинный_секретный_текст_123")
		const userId = payload.id
		const existingReport = await pool.query("SELECT id FROM reports WHERE user_id = $1 AND book_id = $2",[userId,bookId])
		if (existingReport.rows.length > 0) {
			return NextResponse.json({error: "Ты уже сдавал отчет по этой книге!"}, { status: 403 })
		}

		if (!quote1 || !quote2 || !confusing ||		!life_example || !apply_today || !rating) {
  		return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 })
		}
		if (quote1.length < 50 || quote2.length < 50 || confusing.length < 50 || life_example.length < 50 || apply_today.length < 50) {
			return NextResponse.json({ error: "Минимум 50 слов" }, { status: 400 })
		}

		
		const borrowCheck = await pool.query(
			"SELECT * FROM borrows WHERE id = $1 AND user_id = $2 AND status = 'active'",
			[borrowId, userId]
		);
		if (!borrowCheck.rows[0]) {
			return NextResponse.json({ error: "У вас нет активной книг" }, { status: 403 });
		}
		
		const resultTitle = await pool.query("SELECT title FROM books WHERE id = $1", [bookId])
		
		const nameBook = resultTitle.rows[0].title

		const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY})

		const message = await anthropic.messages.create( {
			model: "claude-3-haiku-20240307",
			max_tokens: 400,
			messages: [
				{
					role: "user",
					content: `Ты строгий но справедливый учитель. Оцени отчёт ученика по книге.
						Книга: ${nameBook}
						Вопрос 1 — Две важные цитаты и их смысл:
						${quote1}

						Вопрос 2 — Что было непонятно или удивило:
						${quote2}

						Вопрос 3 — Как это проявляется в моей жизни:
						${life_example}

						Вопрос 4 — Что попробую применить уже сегодня:
						${apply_today}

						Вопрос 5 — Какие новые факты узнал:
						${confusing}

						Критерии оценки:
						- Осмысленность — ответы должны быть связаны с книгой
						- Глубина понимания — не поверхностно
						- Личная связь — конкретные примеры из жизни
						- Если ответы бессмысленные или одинаковые слова повторяются — score 0

						Верни ТОЛЬКО JSON без лишнего текста:
						{"ai_score": число от 0 до 100, "ai_feedback": "подробный комментарий на русском языке по каждому вопросу"}`
				}
			]
		})
		const responseText = message.content[0].text
		const cleanJson = responseText.replace(/```json|```/g, "").trim();
		const parsed = JSON.parse(cleanJson)
		const ai_score = parsed.ai_score
		const ai_feedback = parsed.ai_feedback

		const result = await pool.query(
      `INSERT INTO reports 
      (user_id, book_id, borrow_id, quote1, quote2, confusing, life_example, apply_today, rating, ai_score, ai_feedback) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11)`,
      [
        userId, 
        bookId, 
        borrowId, 
        quote1, quote2, confusing, life_example, apply_today, rating, ai_score, ai_feedback,
      ]
    )


		return NextResponse.json({ success:true, ai_score,ai_feedback })

	} catch(err) {
		console.error(err)
		return NextResponse.json({ error: err.message }, { status: 500 })
	}
}

export async function PATCH(req) {
	const client = await pool.connect()
	try {
		await client.query("BEGIN")
		const auth = req.headers.get('authorization')
		const token = auth?.split(' ')[1]
		if (!token) {
			return NextResponse.json({ error: "Токена нету" }, { status: 401 })
		} 
		const payload = jwt.verify(token,"любой_длинный_секретный_текст_123")

		if (payload.role !== 'admin' && payload.role !== 'teacher') {
			return NextResponse.json({ error: "Только для учителя" }, { status: 403 })
		}
		const { reportId,bookId,borrowId,userId } = await req.json()
		await client.query("UPDATE reports SET status = 'approved' WHERE id = $1",[reportId])
		await client.query("UPDATE borrows SET status = 'approved' WHERE id = $1 AND user_id = $2", [borrowId,userId])
		if (bookId) {
			await client.query("UPDATE books SET available = true WHERE id = $1",[bookId])
		}
		await client.query("COMMIT")
		return NextResponse.json({ success: true, message: "Книга на полке ученика"})

	}catch(err) {
		console.error(err.message)
		await client.query("ROLLBACK")
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
	} finally { client.release() }
}