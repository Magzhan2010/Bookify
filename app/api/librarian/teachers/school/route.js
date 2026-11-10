import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '../../../../../lib/db'
import { requireAuth } from '../../../../../lib/auth'
import { schoolGet, normalizeTabs, rowsOf, pickTeacherTab, parseTeacherRows, schoolApiConfigured } from '../../../../../lib/schoolApi'
import { emailBaseFromName, generatePassword, pickFreeEmail, nameKey } from '../../../../../lib/students'

/**
 * Учителя из школьной базы dls.edu.kz.
 * GET  ?tab=Имя — предпросмотр: какие вкладки есть, какая выбрана, кого создадим.
 * POST { tab?, apply: true } — создать аккаунты учителей (подтверждённых), пароли — один раз в ответе.
 * Уже существующих не трогаем (неподтверждённого учителя с той же почтой — подтверждаем).
 */
async function loadPreview(tabName) {
  const tabs = normalizeTabs(await schoolGet('/tabs'))
  const tab = tabName ? tabs.find(t => t.name === tabName) : pickTeacherTab(tabs)
  if (!tab) return { tabs: tabs.map(t => t.name), tab: null, people: [], headers: [], mapping: {} }
  const rows = tab.rows || rowsOf(await schoolGet(`/tabs?name=${encodeURIComponent(tab.name)}`))
  const parsed = parseTeacherRows(rows)
  return { tabs: tabs.map(t => t.name), tab: tab.name, ...parsed }
}

async function plan(db, people) {
  const users = await db.query(`SELECT id, name, email, role, teacher_pending FROM users`)
  const byEmail = new Map(users.rows.map(u => [u.email.toLowerCase(), u]))
  const byName = new Map()
  for (const u of users.rows) {
    const k = nameKey(u.name)
    if (!byName.has(k)) byName.set(k, [])
    byName.get(k).push(u)
  }
  const seen = new Set()
  return people.map(p => {
    const key = p.email || nameKey(p.name)
    if (seen.has(key)) return { ...p, status: 'duplicate' }
    seen.add(key)
    let u = p.email ? byEmail.get(p.email) : null
    if (!u) { const same = (byName.get(nameKey(p.name)) || []).filter(x => x.role !== 'student'); if (same.length === 1) u = same[0] }
    if (u) {
      if (u.role === 'teacher') return { ...p, status: u.teacher_pending ? 'approve' : 'exists', user_id: u.id, email: u.email }
      if (u.role === 'librarian') return { ...p, status: 'librarian', email: u.email }
      return { ...p, status: 'student', email: u.email, user_id: u.id }
    }
    return { ...p, status: 'create' }
  })
}

export async function GET(req) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  if (!schoolApiConfigured()) return NextResponse.json({ error: 'Школьная база не подключена' }, { status: 503 })
  try {
    const p = await loadPreview(new URL(req.url).searchParams.get('tab'))
    const people = await plan(pool, p.people)
    return NextResponse.json({ tabs: p.tabs, tab: p.tab, headers: p.headers, mapping: p.mapping, people })
  } catch (err) {
    console.error('[teachers/school GET]', err)
    return NextResponse.json({ error: err.message || 'Не удалось прочитать школьную базу' }, { status: 502 })
  }
}

export async function POST(req) {
  const guard = await requireAuth(req, ['librarian', 'teamlead'])
  if (!guard.ok) return guard.response
  if (!schoolApiConfigured()) return NextResponse.json({ error: 'Школьная база не подключена' }, { status: 503 })
  let body
  try { body = await req.json() } catch { body = {} }
  if (body?.apply !== true) return NextResponse.json({ error: 'Нужно подтверждение' }, { status: 400 })

  let preview
  try { preview = await loadPreview(body.tab || null) } catch (err) {
    return NextResponse.json({ error: err.message || 'Не удалось прочитать школьную базу' }, { status: 502 })
  }
  if (!preview.tab) return NextResponse.json({ error: 'Не нашли вкладку с учителями — выбери её' }, { status: 400 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const people = await plan(client, preview.people)
    const taken = new Set((await client.query(`SELECT LOWER(email) AS e FROM users`)).rows.map(r => r.e))
    const result = []
    for (const p of people) {
      if (p.status === 'approve') {
        await client.query(`UPDATE users SET teacher_pending = FALSE, updated_at = NOW() WHERE id = $1`, [p.user_id])
        result.push({ name: p.name, email: p.email, status: 'approved' }); continue
      }
      if (p.status !== 'create') { result.push({ name: p.name, email: p.email, status: p.status }); continue }
      const email = p.email || pickFreeEmail(emailBaseFromName(p.name), taken)
      taken.add(email)
      const password = generatePassword()
      await client.query(
        `INSERT INTO users (name, email, password, role, class_name, teacher_pending, school_ref)
         VALUES ($1, $2, $3, 'teacher', $4, FALSE, $5)`,
        [p.name, email, await bcrypt.hash(password, 10), p.className || null, p.email || p.name])
      result.push({ name: p.name, email, password, subject: p.subject, status: 'created' })
    }
    await client.query('COMMIT')
    return NextResponse.json({ tab: preview.tab, result })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[teachers/school POST]', err)
    return NextResponse.json({ error: 'Не удалось создать аккаунты' }, { status: 500 })
  } finally {
    client.release()
  }
}
