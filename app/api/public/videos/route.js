import { NextResponse } from 'next/server'
import pool, { ensureSchema } from '../../../../lib/db'

/**
 * Видео для главной страницы — только те, что команда или библиотекарь отметили «На главную».
 * Без имён учеников: книга, класс и ссылка. Кэш 5 минут.
 */
export async function GET() {
  try {
    await ensureSchema()
    const r = await pool.query(
      `SELECT v.id, v.kind, v.url, v.title, v.created_at,
              b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover,
              NULLIF(u.class_name, '') AS class_name
         FROM student_videos v
         JOIN users u ON u.id = v.user_id
         LEFT JOIN books b ON b.id = v.book_id
        WHERE v.featured_at IS NOT NULL
        ORDER BY v.featured_at DESC
        LIMIT 12`
    )
    const counts = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE kind = 'video')::int AS videos,
              COUNT(*) FILTER (WHERE kind = 'tedx')::int AS talks
         FROM student_videos`
    )
    return NextResponse.json({ items: r.rows, ...counts.rows[0] }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    })
  } catch (e) {
    console.error('[public/videos]', e.message)
    return NextResponse.json({ items: [], videos: 0, talks: 0 })
  }
}
