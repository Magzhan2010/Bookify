import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'
import { fetchBooksFromSheet, upsertBooksFromSheet } from '../../../../lib/google-sheets'

/**
 * POST /api/librarian/sync-sheets
 * Синхронизирует книги из Google Sheets в БД.
 *
 * Body: { mode: 'append' | 'replace' }
 *   append (default) — добавляет новые + обновляет существующие
 *   replace          — удаляет все и заливает заново (ОСТОРОЖНО)
 */
export async function POST(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  try {
    let mode = 'append'
    try {
      const body = await req.json()
      mode = body.mode || 'append'
    } catch (e) { /* пустое тело — ок */ }

    const books = await fetchBooksFromSheet()

    if (books.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets пустой или недоступен. Проверь доступы.'
      }, { status: 400 })
    }

    if (mode === 'replace') {
      // Полная замена: удаляем все книги и вставляем новые
      // Нельзя удалять книги, на которые есть ссылки из borrows (FK)
      // Поэтому: деактивируем
      await pool.query('DELETE FROM books WHERE 1=1')
    }

    const stats = await upsertBooksFromSheet(pool, books)

    return NextResponse.json({
      success: true,
      mode,
      from_sheet: books.length,
      added: stats.added,
      updated: stats.updated,
      errors: stats.errors,
      synced_by: guard.payload.name
    })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({
      error: err.message,
      hint: 'Проверь GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY'
    }, { status: 500 })
  }
}

/**
 * GET /api/librarian/sync-sheets
 * Тест подключения к Google Sheets + превью данных.
 */
export async function GET(req) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  try {
    const books = await fetchBooksFromSheet()
    return NextResponse.json({
      ok: true,
      rows: books.length,
      preview: books.slice(0, 3)
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err.message,
      hint: 'Проверь GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY'
    }, { status: 500 })
  }
}