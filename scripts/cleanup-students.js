/**
 * Очистка: удалить AIdana и Timur + назначить классы 7-11
 * Запуск: node scripts/cleanup-students.js
 */

require('dotenv').config({ path: __dirname + '/../.env.local' })
const { Client } = require('pg')

const CLASS_NAMES = {
  'Adamov Musa': '7', 'Abdilbar Khalid': '7', 'Aitmukhanbetov Nariman': '7', 'Amanzhol Kudaibergen': '7',
  'Anarbai Azamat': '7', 'Duisenbai Shamshyrak': '7', 'Kabdolla Makhmud': '7', 'Kabidolda Amir': '7',
  'Kasymkan Bizhigit': '7', 'Nurlan Nurali': '7', 'Olzhabek Abilmansur': '7', 'Orynbai Madiyar': '7',
  'Rakhimgazinov Alizhan': '7', 'Sabyrov Sarkhan': '7', 'Saken Abdurakhman': '7', 'Serikov Sultan': '7',
  'Sidagulov Ikhsan': '7', 'Toktarov Azimkhan': '7', 'Tusupov Emir': '7', 'Zeinbek Abdurakhman': '7',
  'Zhomart Asanali': '7', 'Zhumakas Abylai': '7',

  'Abdilbar Ilshat': '8', 'Aitmukhanbetov Nur': '8', 'Akylbaev Makzhan': '8', 'Amangeldi Arnur': '8',
  'Bairamov Ali': '8', 'Baltas Nurzharyk': '8', 'Bakytzhan Abdurrakhim': '8', 'Daulet Aslan': '8',
  'Duman Abdurrakhim': '8', 'Zharbul Erulan': '8', 'Zhetpisov Nurali': '8', 'Kumarbekov Aisultan': '8',
  'Makhmudov Ibrahim': '8', 'Mukashev Danial': '8', 'Nurlan Ansar': '8', 'Osman Dinmukhammed': '8',
  'Talgat Abulkhair': '8', 'Temirbolat Nurali': '8', 'Turlybek Akhmad': '8', 'Daniyaruly Alan': '8', 'Aydyn Ilyas': '8',

  'Akan Muslim': '9', 'Amangeldi Khasan': '9', 'Bimukhanov Altair': '9', 'Bulatov Mukhammad': '9',
  'Baltas Nurtore': '9', 'Zhailaukhan Adilet': '9', 'Zholdabek Sulyaiman': '9', 'Kabdolla Mukhammed': '9',
  'Kairat Abulkhair-khan': '9', 'Kanaev Nurlan': '9', 'Kasym Arnur': '9', 'Kenei Adilkhan': '9',
  'Kombaturov Zhangir': '9', 'Konguev Alinur': '9', 'Nurgali Yusuf': '9', 'Raimanov Ersultan': '9',
  'Sagyngaliev Abdurrakhman': '9', 'Salavat Iskander': '9', 'Saurbekov Baizhigit': '9', 'Serikuly Damir': '9',
  'Farkhatuly Dinmukhammed': '9', 'Yusufali Ali': '9',

  'Abdikadir Olzhas': '10', 'Bagaev Ersultan': '10', 'Elusimov Dauren': '10', 'Ertai Ernar': '10',
  'Zheksenbai Dinmukhammed': '10', 'Zhenis Magzhan': '10', 'Kalabaev Beknur': '10', 'Kalelov Bekarys': '10',
  'Kulzhan Diyar': '10', 'Mamedali Margulan': '10', 'Naitik Dinmukhammed': '10', 'Orynbai Abylai': '10',
  'Romazan Elzhan': '10', 'Samet Nursayat': '10', 'Sandibek Sagadat': '10', 'Serik Ziyada': '10',
  'Sidagulov Akhmet': '10', 'Shaidenov Muslim': '10', 'Shaimurat Erasyl': '10', 'Shekerkhan Elnur': '10',

  'Azhdurliev Bakbergen': '11', 'Argymbaev Arys': '11', 'Elusimov Alan': '11', 'Zhailaukhan Alibek': '11',
  'Zhenis Alikhan': '11', 'Zhumamurat Tole': '11', 'Zhumasil Meirzhan': '11', 'Kadyrkhan Mansur': '11',
  'Mekebai Arkhat': '11', 'Mustafin Ikhsan': '11', 'Omirzak Bekasyl': '11', 'Sariev Aibek': '11',
  'Tursynov Nurly': '11', 'Ygzan Samalyk': '11'
}

const REMOVE_EMAILS = [
  'aidana@student.school.com',
  'timur@student.school.com'
]

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  console.log('✅ Подключено к БД')

  // 1. Удаляем AIdana и Timur
  const del = await c.query(
    `DELETE FROM users WHERE email = ANY($1) RETURNING email, name, role`,
    [REMOVE_EMAILS]
  )
  console.log(`\n🗑 Удалены:`)
  del.rows.forEach(r => console.log(`   ${r.email} (${r.name})`))
  if (del.rows.length === 0) console.log('   (ничего не удалено)')

  // 2. Назначаем классы всем ученикам через CASE WHEN
  const cases = Object.entries(CLASS_NAMES)
    .map(([name, cls], i) => `WHEN $${i * 2 + 1} THEN $${i * 2 + 2}`)
    .join(' ')

  const params = []
  for (const [name, cls] of Object.entries(CLASS_NAMES)) {
    params.push(name, cls)
  }

  const updated = await c.query(
    `UPDATE users
     SET class_name = CASE name ${cases} END
     WHERE role = 'student'
     RETURNING name, class_name`,
    params
  )
  console.log(`\n📚 Назначены классы:`)
  updated.rows.forEach(r => console.log(`   ${r.name.padEnd(30)} → ${r.class_name}`))

  // 3. Статистика по классам
  const stats = await c.query(
    `SELECT class_name, COUNT(*) AS count
     FROM users
     WHERE role = 'student' AND class_name IS NOT NULL
     GROUP BY class_name
     ORDER BY class_name`
  )
  console.log(`\n📊 Учеников по классам:`)
  stats.rows.forEach(r => console.log(`   Класс ${r.class_name}: ${r.count}`))

  const total = await c.query(`SELECT COUNT(*) FROM users WHERE role = 'student'`)
  console.log(`\n✅ Всего студентов в БД: ${total.rows[0].count}`)

  await c.end()
})().catch(e => { console.error('❌ Ошибка:', e.message); process.exit(1) })