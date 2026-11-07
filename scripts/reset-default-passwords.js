/**
 * Сброс общего пароля student123.
 *
 * Раньше всех учеников заводили с одним паролем student123, а их имена
 * лежали в публичном репозитории. Скрипт находит всех учеников, у кого
 * пароль до сих пор student123, ставит каждому свой случайный пароль
 * и сохраняет список в private/reset-<дата>.csv для раздачи.
 * Заодно все их старые сессии перестают работать (token_version + 1).
 *
 * Запуск:
 *   node scripts/reset-default-passwords.js           — только показать, кого затронет
 *   node scripts/reset-default-passwords.js --apply   — реально сменить пароли
 */

require('dotenv').config({ path: __dirname + '/../.env.local' })
const bcrypt = require('bcryptjs')
const { Client } = require('pg')
const { generatePassword, saveCredentials } = require('./lib/passwords')

const OLD_DEFAULT = 'student123'
const APPLY = process.argv.includes('--apply')

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  console.log('✅ Подключено к БД')

  await c.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0`)

  const res = await c.query(
    `SELECT id, name, email, class_name, password FROM users WHERE role = 'student' ORDER BY class_name, name`
  )

  const affected = []
  for (const u of res.rows) {
    if (await bcrypt.compare(OLD_DEFAULT, u.password)) affected.push(u)
  }

  console.log(`👥 Учеников всего: ${res.rows.length}`)
  console.log(`⚠️  С паролем ${OLD_DEFAULT}: ${affected.length}`)

  if (!APPLY) {
    affected.forEach(u => console.log(`   ${u.class_name || '—'}  ${u.name} <${u.email}>`))
    console.log('\nЭто пробный запуск. Чтобы сменить пароли: --apply')
    await c.end()
    return
  }

  const out = []
  for (const u of affected) {
    const password = generatePassword()
    const hash = await bcrypt.hash(password, 10)
    await c.query(
      `UPDATE users
          SET password = $1, token_version = token_version + 1, updated_at = NOW()
        WHERE id = $2`,
      [hash, u.id]
    )
    out.push({ name: u.name, class_name: u.class_name, email: u.email, password })
  }
  await c.end()

  if (out.length > 0) {
    const file = saveCredentials(out, 'reset')
    console.log(`\n✅ Пароли сменены: ${out.length}`)
    console.log(`🔑 Новые пароли: ${file}`)
    console.log('   Раздай ученикам и удали файл после раздачи. В git он не попадёт.')
  } else {
    console.log('\n✅ Никого менять не нужно')
  }
})().catch(e => { console.error('❌ Ошибка:', e.message); process.exit(1) })
