require('dotenv').config({ path: __dirname + '/../.env.local' })
const { Client } = require('pg')

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()

  const all = await c.query(`
    SELECT u.id, u.name, u.email, u.role, u.class_name,
      (SELECT COUNT(*) FROM borrows WHERE user_id = u.id) AS borrows,
      (SELECT COUNT(*) FROM book_requests WHERE user_id = u.id) AS reqs
    FROM users u ORDER BY u.id
  `)
  console.log('=== Все юзеры ===')
  all.rows.forEach(r => {
    console.log(`  ${r.id}. ${r.name} <${r.email}> (${r.role}${r.class_name ? ' / ' + r.class_name : ''}) borrows=${r.borrows}, reqs=${r.reqs}`)
  })

  // Удаляем лишних (оставляем только librarian и 2 студентов)
  // Malika + Aidana + Timur
  const del = await c.query(`
    DELETE FROM users
    WHERE email NOT IN (
      'teacher@dls.school',
      'aidana@student.school.com',
      'timur@student.school.com'
    )
    AND role IN ('student', 'librarian')
    RETURNING email, name, role
  `)
  console.log('\n=== Удалены ===')
  del.rows.forEach(r => console.log(`  ✗ ${r.name} <${r.email}> (${r.role})`))

  console.log('\n=== После очистки ===')
  const after = await c.query(`SELECT id, name, email, role FROM users ORDER BY id`)
  after.rows.forEach(r => console.log(`  ${r.id}. ${r.name} <${r.email}> (${r.role})`))

  await c.end()
})().catch(e => console.error(e))