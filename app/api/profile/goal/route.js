import { NextResponse } from 'next/server'
import pool from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

/**
 * GET /api/profile/goal?year=2026
 * Получить цель чтения на год.
 */
export async function GET(req) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year')) || new Date().getFullYear()

  try {
    const res = await pool.query(
      'SELECT goal FROM reading_goals WHERE user_id = $1 AND year = $2',
      [guard.payload.id, year]
    )
    return NextResponse.json({ goal: res.rows[0]?.goal || 12, year })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/profile/goal
 * Body: { goal, year? }
 */
export async function POST(req) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const { goal, year } = await req.json()
  const y = year || new Date().getFullYear()

  if (!goal || goal < 1) {
    return NextResponse.json({ error: 'Цель должна быть больше 0' }, { status: 400 })
  }

  try {
    await pool.query(
      `INSERT INTO reading_goals (user_id, year, goal) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, year) DO UPDATE SET goal = $3`,
      [guard.payload.id, y, goal]
    )
    return NextResponse.json({ success: true, goal, year })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}