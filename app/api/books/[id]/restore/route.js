import { NextResponse } from "next/server"
import pool, { ensureSchema } from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'

/**
 * POST /api/books/[id]/restore
 * Вернуть книгу из архива в каталог (обратное действие архивирования).
 */
export async function POST(req, { params }) {
  const guard = requireAuth(req, ['librarian'])
  if (!guard.ok) return guard.response

  const { id } = await params

  try {
    await ensureSchema()
    const result = await pool.query(
      `UPDATE books SET archived_at = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    )
    if (!result.rows[0]) {
      return NextResponse.json({ error: "Книга не найдена" }, { status: 404 })
    }
    return NextResponse.json({ success: true, book: result.rows[0] })
  } catch (err) {
    console.error('Restore book error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}