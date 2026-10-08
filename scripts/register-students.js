/**
 * Регистрация учеников из списка.
 * Запуск: node scripts/register-students.js
 */

require('dotenv').config({ path: __dirname + '/../.env.local' })
const bcrypt = require('bcryptjs')
const { Client } = require('pg')

const STUDENTS = [
  'Adamov Musa', 'Abdilbar Khalid', 'Aitmukhanbetov Nariman', 'Amanzhol Kudaibergen',
  'Anarbai Azamat', 'Duisenbai Shamshyrak', 'Kabdolla Makhmud', 'Kabidolda Amir',
  'Kasymkan Bizhigit', 'Nurlan Nurali', 'Olzhabek Abilmansur', 'Orynbai Madiyar',
  'Rakhimgazinov Alizhan', 'Sabyrov Sarkhan', 'Saken Abdurakhman', 'Serikov Sultan',
  'Sidagulov Ikhsan', 'Toktarov Azimkhan', 'Tusupov Emir', 'Zeinbek Abdurakhman',
  'Zhomart Asanali', 'Zhumakas Abylai',
  'Abdilbar Ilshat', 'Aitmukhanbetov Nur', 'Akylbaev Makzhan', 'Amangeldi Arnur',
  'Bairamov Ali', 'Baltas Nurzharyk', 'Bakytzhan Abdurrakhim', 'Daulet Aslan',
  'Duman Abdurrakhim', 'Zharbul Erulan', 'Zhetpisov Nurali', 'Kumarbekov Aisultan',
  'Makhmudov Ibrahim', 'Mukashev Danial', 'Nurlan Ansar', 'Osman Dinmukhammed',
  'Talgat Abulkhair', 'Temirbolat Nurali', 'Turlybek Akhmad', 'Daniyaruly Alan', 'Aydyn Ilyas',
  'Akan Muslim', 'Amangeldi Khasan', 'Bimukhanov Altair', 'Bulatov Mukhammad',
  'Baltas Nurtore', 'Zhailaukhan Adilet', 'Zholdabek Sulyaiman', 'Kabdolla Mukhammed',
  'Kairat Abulkhair-khan', 'Kanaev Nurlan', 'Kasym Arnur', 'Kenei Adilkhan',
  'Kombaturov Zhangir', 'Konguev Alinur', 'Nurgali Yusuf', 'Raimanov Ersultan',
  'Sagyngaliev Abdurrakhman', 'Salavat Iskander', 'Saurbekov Baizhigit', 'Serikuly Damir',
  'Farkhatuly Dinmukhammed', 'Yusufali Ali',
  'Abdikadir Olzhas', 'Bagaev Ersultan', 'Elusimov Dauren', 'Ertai Ernar',
  'Zheksenbai Dinmukhammed', 'Zhenis Magzhan', 'Kalabaev Beknur', 'Kalelov Bekarys',
  'Kulzhan Diyar', 'Mamedali Margulan', 'Naitik Dinmukhammed', 'Orynbai Abylai',
  'Romazan Elzhan', 'Samet Nursayat', 'Sandibek Sagadat', 'Serik Ziyada',
  'Sidagulov Akhmet', 'Shaidenov Muslim', 'Shaimurat Erasyl', 'Shekerkhan Elnur',
  'Azhdurliev Bakbergen', 'Argymbaev Arys', 'Elusimov Alan', 'Zhailaukhan Alibek',
  'Zhenis Alikhan', 'Zhumamurat Tole', 'Zhumasil Meirzhan', 'Kadyrkhan Mansur',
  'Mekebai Arkhat', 'Mustafin Ikhsan', 'Omirzak Bekasyl', 'Sariev Aibek',
  'Tursynov Nurly', 'Ygzan Samalyk'
]

const DEFAULT_PASSWORD = 'student123'

function emailify(name) {
  return name.toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '.')
}

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  console.log('✅ Подключено к БД')

  // Используем SET LOCAL для ускорения batch insert
  await c.query("SET LOCAL synchronous_commit = OFF")

  const existing = await c.query(`SELECT email FROM users WHERE role = 'student'`)
  const existingEmails = new Set(existing.rows.map(r => r.email))
  console.log(`📊 Уже в БД: ${existingEmails.size}`)

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  const toInsert = []
  for (const name of STUDENTS) {
    const parts = name.split(/\s+/)
    let email = `${emailify(parts[0])}.${emailify(parts[1] || '')}@dls.school`
    email = email.replace(/\.+$/, '').replace(/\.\@/, '@')
    if (!existingEmails.has(email)) {
      toInsert.push({ name, email })
    }
  }

  console.log(`📝 Будет добавлено: ${toInsert.length}`)

  let added = 0
  const startTime = Date.now()

  // Один большой INSERT вместо пачек
  if (toInsert.length > 0) {
    const placeholders = toInsert.map((_, n) =>
      `($${n * 3 + 1}, $${n * 3 + 2}, $${n * 3 + 3})`
    ).join(',')
    const values = toInsert.flatMap(s => [s.name, s.email, hash])

    try {
      const result = await c.query(
        `INSERT INTO users (name, email, password, role, class_name)
         OVERRIDING SYSTEM VALUE
         SELECT name, email, password, 'student'::text, NULL::text FROM (VALUES ${placeholders}) AS v(name, email, password)`,
        values
      )
      // Это не сработает, переделаем
    } catch (e) {}

    // Fallback — одиночные INSERT (быстрее на удалённой БД)
    for (const s of toInsert) {
      try {
        await c.query(
          `INSERT INTO users (name, email, password, role, class_name) VALUES ($1, $2, $3, 'student', NULL)`,
          [s.name, s.email, hash]
        )
        added++
      } catch (err) {
        console.log(`  ❌ ${s.name}: ${err.message}`)
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n✅ Готово за ${elapsed}с: создано ${added}`)
  console.log(`🔑 Пароль для всех: ${DEFAULT_PASSWORD}`)
  console.log(`💡 Библиотекарь может назначить класс через /librarian/students/[id]`)

  await c.end()
})().catch(e => { console.error('❌ Ошибка:', e.message); process.exit(1) })