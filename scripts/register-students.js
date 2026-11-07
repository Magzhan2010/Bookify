/**
 * Регистрация учеников из списка.
 *
 * Запуск: node scripts/register-students.js [путь-к-csv]
 * По умолчанию читает private/students.csv
 *
 * Формат CSV (разделитель ; или ,), первая строка — заголовок:
 *   Имя;Класс
 *   Serikov Arman;7
 *   Nurlanova Aru;8
 *
 * БЕЗОПАСНОСТЬ:
 * - Список учеников больше НЕ хранится в коде: репозиторий публичный,
 *   а имена детей — персональные данные. Папка private/ в .gitignore.
 * - Раньше всем ставился общий пароль student123. Зная имя ученика
 *   (оно было в коде) и правило построения email, в любой аккаунт мог
 *   войти кто угодно. Теперь каждому генерируется свой пароль, а логины
 *   с паролями сохраняются в private/credentials-<дата>.csv для раздачи.
 */

require('dotenv').config({ path: __dirname + '/../.env.local' })
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const { Client } = require('pg')
const { generatePassword, saveCredentials, PRIVATE_DIR } = require('./lib/passwords')

const csvPath = process.argv[2] || path.join(PRIVATE_DIR, 'students.csv')

function emailify(name) {
  return name.toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '.')
}

function readStudents(file) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Не найден файл со списком учеников: ${file}`)
    console.error('   Создай его по образцу (Имя;Класс) — см. комментарий в начале скрипта.')
    process.exit(1)
  }
  const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)
  return lines
    .slice(1)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const [name, cls] = l.split(/[;,]/).map(x => (x || '').trim().replace(/^"|"$/g, ''))
      return { name, class_name: cls || null }
    })
    .filter(s => s.name)
}

;(async () => {
  const students = readStudents(csvPath)
  console.log(`📄 В файле: ${students.length} учеников`)

  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  console.log('✅ Подключено к БД')

  const existing = await c.query(`SELECT LOWER(email) AS email FROM users`)
  const existingEmails = new Set(existing.rows.map(r => r.email))

  const created = []
  for (const s of students) {
    const parts = s.name.split(/\s+/)
    let email = `${emailify(parts[0])}.${emailify(parts[1] || '')}@dls.school`
    email = email.replace(/\.+$/, '').replace(/\.@/, '@')

    if (existingEmails.has(email.toLowerCase())) {
      console.log(`  ⏭  ${s.name} — уже есть (${email})`)
      continue
    }

    const password = generatePassword()
    const hash = await bcrypt.hash(password, 10)
    try {
      await c.query(
        `INSERT INTO users (name, email, password, role, class_name)
         VALUES ($1, $2, $3, 'student', $4)`,
        [s.name, email, hash, s.class_name]
      )
      existingEmails.add(email.toLowerCase())
      created.push({ ...s, email, password })
    } catch (err) {
      console.log(`  ❌ ${s.name}: ${err.message}`)
    }
  }

  await c.end()

  console.log(`\n✅ Создано: ${created.length}`)
  if (created.length > 0) {
    const file = saveCredentials(created, 'new-students')
    console.log(`🔑 Логины и пароли: ${file}`)
    console.log('   Раздай ученикам и удали файл после раздачи. В git он не попадёт.')
  }
})().catch(e => { console.error('❌ Ошибка:', e.message); process.exit(1) })
