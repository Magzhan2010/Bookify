const fs = require('fs')
const path = require('path')

const p = path.join('C:\\Users\\User\\Documents\\Default Project\\Bookify', 'scripts', 'setup-db.js')
const lines = fs.readFileSync(p, 'utf8').split('\n')

const insert = [
  "",
  "  // === Правила начисления баллов (программа 'Читай книги. Копи баллы.') ===",
  "  const POINT_RULES = [",
  "    { code: 'pages_100_200', title: '100-200 страниц', points: 5, description: 'Прочитал книгу объёмом 100-200 страниц' },",
  "    { code: 'pages_201_300', title: '201-300 страниц', points: 10, description: 'Прочитал книгу объёмом 201-300 страниц' },",
  "    { code: 'pages_301_400', title: '301-400 страниц', points: 15, description: 'Прочитал книгу объёмом 301-400 страниц' },",
  "    { code: 'pages_500_plus', title: '500+ страниц', points: 20, description: 'Прочитал книгу объёмом 500+ страниц' },",
  "    { code: 'review', title: 'Написать отзыв', points: 5, description: 'Покажи, как ты понял книгу' },",
  "    { code: 'video', title: 'Сняться в видео', points: 10, description: 'Поделись книгой на камеру' },",
  "    { code: 'tedx', title: 'Выступить на TEDx', points: 20, description: 'Самый большой бонус' }",
  "  ]",
  "  for (const rule of POINT_RULES) {",
  "    await client.query(",
  "      `INSERT INTO point_rules (code, title, points, description)",
  "       VALUES ($1, $2, $3, $4)",
  "       ON CONFLICT (code) DO UPDATE SET title = $2, points = $3, description = $4`,",
  "      [rule.code, rule.title, rule.points, rule.description]",
  "    )",
  "  }",
  "  console.log(`   + Pravil nakisleniya: ${POINT_RULES.length}`)"
]

lines.splice(121, 0, ...insert)
fs.writeFileSync(p, lines.join('\n'))
console.log('✅ Inserted after line 121')