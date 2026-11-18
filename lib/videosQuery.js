/** Видео ученика с книгой — для профиля и страницы ученика. */
export const VIDEOS_SQL = `
  SELECT v.id, v.kind, v.url, v.title, v.created_at, v.borrow_id,
         b.id AS book_id, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover,
         c.name AS added_by
    FROM student_videos v
    LEFT JOIN books b ON b.id = v.book_id
    LEFT JOIN users c ON c.id = v.created_by
   WHERE v.user_id = $1
   ORDER BY v.created_at DESC
   LIMIT 100`
