import { NextResponse } from "next/server";
import jwt from 'jsonwebtoken'
import pool from '../../../lib/db'

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    
    // 1. Сначала проверяем запрошены ли просто все жанры
    const allGenres = searchParams.get('allGenres') === 'true'
    if (allGenres) {
        const result = await pool.query('SELECT DISTINCT genre FROM books ORDER BY genre ASC')
        // Возвращаем массив строк ['Бизнес', 'Психология', ...]
        return NextResponse.json(result.rows.map(row => row.genre))
    }

    // Дальше идет твой обычный код...
    const countOnly = searchParams.get('countOnly') === 'true'
    const page = parseInt(searchParams.get('page')) || 1
    const limit = 12
    const offset = (page - 1) * limit
    const genre = searchParams.get('genre')
    const isFiltered = genre && genre !== 'Все'

    if (countOnly) {
        if(isFiltered) {
            const result = await pool.query('SELECT COUNT(*) AS total FROM books WHERE genre = $1',[genre])
            return NextResponse.json({ total: result.rows[0].total })
        } else {
            const result = await pool.query('SELECT COUNT(*) AS total FROM books')
            return NextResponse.json({ total: result.rows[0].total })
        }
    } else {
        if (isFiltered) {
            const result = await pool.query("SELECT * FROM books WHERE genre = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",[genre,limit,offset])
            return NextResponse.json(result.rows)
        } else {
            const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC LIMIT $1 OFFSET $2;',[limit,offset])
            return NextResponse.json(result.rows)
        }
    }
};

export async function POST(req) {
    const auth = req.headers.get("authorization")
    const token = auth?.split(' ')[1]
    if (!token) {
        return NextResponse.json({ error: "Доступа нет" }, { status: 401 })
    }

    const payload = jwt.verify(token,process.env.JWT_SECRET)
    if(payload.role !== 'admin') {
        return NextResponse.json({ error: "Только для Админа" }, { status: 403 })
    }

    const { title, author, genre, year, description, cover_url, available, file } = await req.json();

    await pool.query("INSERT INTO books(title, author, genre, year, description,cover_url, available,file) VALUES($1,$2,$3,$4,$5,$6,$7,$8);",[title, author,genre,year, description,cover_url,available,file])
    
    return NextResponse.json({ success: true })
}