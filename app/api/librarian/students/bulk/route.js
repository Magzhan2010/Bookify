import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { sealPassword } from '../../../../../lib/passVault'
import { emailBaseFromName, generatePassword, pickFreeEmail } from '../../../../../lib/students'

/**
 * POST /api/librarian/students/bulk
 * Body: { students: [{ name, className?, email? }] }  — до 50 за раз
 *
 * Создаёт учеников. Логин (если не указан) строится из имени,
 * пароль генерируется для каждого свой. В ответе — логины и пароли,
 * чтобы библиотекарь раздал их ученикам (больше нигде пароли не хранятся
 * в открытом виде).
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['librarian', 'team'])
  if (!guard.ok) return guard.response

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 })
  }

  const input = Array.isArray(body?.students) ? body.students : []
  const rows = input
    .map(s => ({
      name: String(s?.name || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      className: String(s?.className || '').trim().slice(0, 40) || null,
      email: String(s?.email || '').trim().toLowerCase().slice(0, 200) || null
    }))
    .filter(s => s.name)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Добавь хотя бы одного ученика' }, { status: 400 })
  }
  // Хеширование пароля занимает время — держим запрос коротким.
  // Интерфейс сам делит длинный список на части по 40.
  if (rows.length > 50) {
    return NextResponse.json({ error: 'Не больше 50 учеников за один запрос' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT LOWER(email) AS email FROM users')
    const taken = new Set(existing.rows.map(r => r.email))

    const created = []
    const skipped = []

    for (const s of rows) {
      let email
      if (s.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) {
          skipped.push({ name: s.name, reason: 'Неверный email' })
          continue
        }
        if (taken.has(s.email)) {
          skipped.push({ name: s.name, reason: `Email ${s.email} уже занят` })
          continue
        }
        email = s.email
        taken.add(email)
      } else {
        email = pickFreeEmail(emailBaseFromName(s.name), taken)
      }

      const password = generatePassword()
      const hash = await bcrypt.hash(password, 10)
      const ins = await client.query(
        `INSERT INTO users (name, email, password, role, class_name, password_view)
         VALUES ($1, $2, $3, 'student', $4, $5)
         RETURNING id, name, email, class_name`,
        [s.name, email, hash, s.className, sealPassword(password)]
      )
      created.push({ ...ins.rows[0], password })
    }

    await client.query('COMMIT')
    return NextResponse.json({ success: true, created, skipped })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Bulk students error:', err)
    return NextResponse.json({ error: 'Не удалось создать учеников' }, { status: 500 })
  } finally {
    client.release()
  }
}
