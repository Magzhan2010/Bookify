import { google } from 'googleapis'

/**
 * Подключение к Google Sheets API.
 * Требует переменные окружения:
 *   - GOOGLE_SHEETS_ID  (id таблицы из URL)
 *   - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   - GOOGLE_PRIVATE_KEY  (с переносами строк \n)
 *
 * Структура таблицы (лист "books"):
 *   A: title         (название)
 *   B: author        (автор)
 *   C: genre         (жанр)
 *   D: year          (год)
 *   E: description   (описание)
 *   F: cover_url     (ссылка на обложку)
 *   G: file_url      (ссылка на PDF)
 *   H: total_copies  (кол-во экземпляров, default 1)
 *   I: isbn
 *   J: pages         (кол-во страниц)
 *   K: tags          (через запятую)
 */

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error(
      'Google Sheets credentials не настроены. Проверь GOOGLE_SERVICE_ACCOUNT_EMAIL и GOOGLE_PRIVATE_KEY в .env'
    )
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })

  return google.sheets({ version: 'v4', auth })
}

/**
 * Возвращает все книги из Google Sheets в формате для БД.
 */
export async function fetchBooksFromSheet() {
  const sheets = getSheetsClient()
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_ID не задан в .env')
  }

  const range = process.env.GOOGLE_SHEETS_RANGE || 'books!A2:K1000'

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  })

  const rows = response.data.values || []
  const books = []

  for (const row of rows) {
    if (!row[0] || !row[0].trim()) continue
    books.push({
      title: (row[0] || '').trim(),
      author: (row[1] || '').trim(),
      genre: (row[2] || 'Без разг').trim(),
      year: (row[3] || '').trim(),
      description: (row[4] || '').trim(),
      cover_url: (row[5] || '').trim(),
      file_url: (row[6] || '').trim(),
      total_copies: parseInt(row[7]) || 1,
      isbn: (row[8] || '').trim(),
      pages: parseInt(row[9]) || null,
      tags: (row[10] || '').trim()
    })
  }

  return books
}

/**
 * Upsert книги в БД из массива.
 * Возвращает статистику: добавлено, обновлено, ошибки.
 */
export async function upsertBooksFromSheet(pool, books) {
  const stats = { added: 0, updated: 0, errors: [] }

  for (const book of books) {
    try {
      if (!book.title || !book.author) {
        stats.errors.push({ title: book.title, error: 'Нет названия или автора' })
        continue
      }

      const existing = await pool.query(
        'SELECT id FROM books WHERE LOWER(title) = LOWER($1) AND LOWER(author) = LOWER($2) LIMIT 1',
        [book.title, book.author]
      )

      if (existing.rows[0]) {
        await pool.query(
          `UPDATE books SET
            genre = COALESCE(NULLIF($2, ''), genre),
            description = COALESCE(NULLIF($3, ''), description),
            cover_url = COALESCE(NULLIF($4, ''), cover_url),
            file_url = COALESCE(NULLIF($5, ''), file_url),
            total_copies = GREATEST($6, available_copies),
            isbn = COALESCE(NULLIF($7, ''), isbn),
            pages = COALESCE($8, pages),
            tags = COALESCE(NULLIF($9, ''), tags),
            updated_at = NOW()
           WHERE id = $1`,
          [
            existing.rows[0].id,
            book.genre, book.description, book.cover_url, book.file_url,
            book.total_copies, book.isbn, book.pages, book.tags
          ]
        )
        stats.updated++
      } else {
        await pool.query(
          `INSERT INTO books
            (title, author, genre, year, description, cover_url, file_url,
             total_copies, available_copies, isbn, pages, tags)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11)`,
          [
            book.title, book.author, book.genre, book.year, book.description,
            book.cover_url, book.file_url, book.total_copies,
            book.isbn, book.pages, book.tags
          ]
        )
        stats.added++
      }
    } catch (err) {
      stats.errors.push({ title: book.title, error: err.message })
    }
  }

  return stats
}