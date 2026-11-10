import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { emailBaseFromName, pickFreeEmail, nameKey } from '../../../../../lib/students'

/**
 * POST /api/librarian/students/passwords — пароли списком.
 * Body: { rows: [{ name?, email?, password }], apply?: boolean, createMissing?: boolean }
 *
 * Если в строке есть почта — ученик ищется по почте (точно, это и есть логин).
 * Иначе — по имени (без учёта регистра, порядка слов, казахских/русских букв).
 * Аккаунты-«двойники», которые раньше по ошибке создавались с почтой вместо имени
 * (имя = эта почта, ни одной книги/монеты/отзыва), удаляются при сохранении.
 * Участники командной платформы и библиотекари не трогаются никогда.
 * apply=false — только проверка (ничего не меняется), apply=true — сохранить.
 * После смены пароля старые входы ученика закрываются (token_version + 1).
 * До 40 строк за запрос — интерфейс сам делит список.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** musa.adamov@dls.school → «Musa Adamov» (для новых аккаунтов без имени). */
function nameFromEmail(email) {
  return email.split('@')[0].split(/[._-]+/).filter(Boolean)
    .map(w => w.replace(/\d+$/, '')).filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1)).join(' ') || email
}

export async function POST(req) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }) }
  const rows = (Array.isArray(body?.rows) ? body.rows : [])
    .map(r => ({
      name: String(r?.name || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      email: String(r?.email || '').trim().toLowerCase().slice(0, 160),
      password: String(r?.password || '').trim().slice(0, 64)
    }))
    .map(r => (!r.email && EMAIL_RE.test(r.name) ? { ...r, email: r.name.toLowerCase(), name: '' } : r))
    .filter(r => r.name || r.email)
  if (!rows.length) return NextResponse.json({ error: 'Список пуст' }, { status: 400 })
  if (rows.length > 40) return NextResponse.json({ error: 'Не больше 40 строк за раз' }, { status: 400 })
  const apply = body?.apply === true
  const createMissing = body?.createMissing === true

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const users = await client.query(`
      SELECT u.id, u.name, u.email, u.role, u.class_name,
             EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id) AS in_team
        FROM users u`)
    const byKey = new Map()
    for (const u of users.rows) {
      const k = nameKey(u.name)
      if (!byKey.has(k)) byKey.set(k, [])
      byKey.get(k).push(u)
    }
    const taken = new Set(users.rows.map(u => u.email.toLowerCase()))
    const byEmail = new Map(users.rows.map(u => [u.email.toLowerCase(), u]))

    const result = []
    for (const r of rows) {
      const label = r.name || r.email
      if (r.password.length < 4) { result.push({ name: label, email: r.email || undefined, status: 'invalid', note: 'Пароль короче 4 символов' }); continue }
      let u
      if (r.email) {
        if (!EMAIL_RE.test(r.email)) { result.push({ name: label, status: 'invalid', note: 'Неверная почта' }); continue }
        u = byEmail.get(r.email)
      } else {
        const found = byKey.get(nameKey(r.name)) || []
        if (found.length > 1) {
          result.push({ name: r.name, status: 'ambiguous', note: `Найдено ${found.length} ученика с таким именем` }); continue
        }
        u = found[0]
      }
      if (!u) {
        if (!createMissing) { result.push({ name: label, email: r.email || undefined, status: 'not_found' }); continue }
        const name = r.name || nameFromEmail(r.email)
        const email = r.email || pickFreeEmail(emailBaseFromName(r.name), taken)
        taken.add(email)
        if (apply) {
          const hash = await bcrypt.hash(r.password, 10)
          await client.query(`INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'student')`, [name, email, hash])
        }
        result.push({ name, status: 'created', email, password: r.password }); continue
      }
      if (u.in_team) { result.push({ name: u.name, status: 'team', email: u.email, note: 'Участник команды — пароль не меняем' }); continue }
      if (u.role !== 'student') { result.push({ name: u.name, status: 'skipped', email: u.email, note: 'Не ученик' }); continue }
      if (apply) {
        const hash = await bcrypt.hash(r.password, 10)
        await client.query(
          `UPDATE users SET password = $1, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW() WHERE id = $2`,
          [hash, u.id])
      }
      result.push({ name: u.name, status: 'updated', email: u.email, class_name: u.class_name, password: r.password })
    }

    // Двойники от прошлой загрузки: имя = почта из списка, никакой активности
    let removed = 0
    const listed = rows.map(r => r.email).filter(Boolean)
    if (listed.length) {
      const dup = await client.query(`
        SELECT u.id FROM users u
         WHERE u.role = 'student' AND LOWER(u.name) = ANY($1::text[])
           AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM borrows b WHERE b.user_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM user_points p WHERE p.user_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM book_reviews r WHERE r.user_id = u.id)`, [listed])
      removed = dup.rows.length
      if (apply && removed) {
        await client.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [dup.rows.map(d => d.id)])
      }
    }

    await client.query(apply ? 'COMMIT' : 'ROLLBACK')
    return NextResponse.json({ applied: apply, result, duplicates: removed })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[students/passwords]', err)
    return NextResponse.json({ error: 'Не удалось обработать список' }, { status: 500 })
  } finally {
    client.release()
  }
}
