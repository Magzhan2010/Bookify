import { NextResponse } from 'next/server'
import pool from '../../../lib/db'

/**
 * GET /api/health
 * Проверка состояния приложения и БД.
 * Возвращает всегда JSON с подробной диагностикой.
 */
export async function GET() {
  const result = {
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      has_database_url: !!process.env.DATABASE_URL,
      has_jwt_secret: !!process.env.JWT_SECRET,
      has_google_sheets_id: !!process.env.GOOGLE_SHEETS_ID
    },
    db: { connected: false, latency_ms: null, error: null }
  }

  try {
    const start = Date.now()
    const r = await pool.query('SELECT 1 AS ok, COUNT(*) FROM users')
    result.db.connected = true
    result.db.latency_ms = Date.now() - start
    result.db.users_count = parseInt(r.rows[0].count)
  } catch (err) {
    result.ok = false
    result.db.connected = false
    result.db.error = err.message?.substring(0, 200) || 'unknown'

    // Классифицируем ошибку
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('econnrefused') || msg.includes('enotfound')) {
      result.db.error_type = 'connection'
      result.db.hint = 'БД недоступна. Проверь DATABASE_URL'
    } else if (msg.includes('timeout')) {
      result.db.error_type = 'timeout'
      result.db.hint = 'Neon уснул. Разбуди его на console.neon.tech'
    } else if (msg.includes('ssl')) {
      result.db.error_type = 'ssl'
      result.db.hint = 'Добавь ?sslmode=require в DATABASE_URL'
    } else if (msg.includes('does not exist') || msg.includes('relation')) {
      result.db.error_type = 'schema'
      result.db.hint = 'Запусти node scripts/setup-db.js'
    } else {
      result.db.error_type = 'unknown'
    }
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}