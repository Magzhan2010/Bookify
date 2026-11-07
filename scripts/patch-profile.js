const fs = require('fs')
const path = require('path')

const p = path.join('C:\\Users\\User\\Documents\\Default Project\\Bookify', 'app', 'profile', 'page.jsx')
let content = fs.readFileSync(p, 'utf8')

// 1) buildMonthlyData(finished) -> buildMonthlyData(shelf)
content = content.replace('buildMonthlyData(finished)', 'buildMonthlyData(shelf)')
content = content.replace('const monthlyData = buildMonthlyData(finished)', 'const monthlyData = buildMonthlyData(shelf)')
content = content.replace('buildGenreData(finished)', 'buildGenreData(shelf)')
content = content.replace('const genreData = buildGenreData(finished)', 'const genreData = buildGenreData(shelf)')

// 2) Добавить PointsStat в конец файла
if (!content.includes('const PointsStat')) {
  content += `

const PointsStat = ({ label, value, highlight }) => (
  <div className={\`text-center px-3 py-2.5 rounded-xl \${highlight ? 'bg-white/20' : 'bg-white/10'}\`}>
    <div className="text-xl font-bold">{value || 0}</div>
    <div className="text-[10px] uppercase tracking-wider opacity-75 font-medium mt-0.5">{label}</div>
  </div>
)
`
  console.log('+ PointsStat added')
}

fs.writeFileSync(p, content)
console.log('✅ profile page updated')

// Проверка
const check = fs.readFileSync(p, 'utf8')
;['buildMonthlyData(shelf)', 'buildGenreData(shelf)', 'const PointsStat'].forEach(s => {
  console.log(`  ${s}: ${check.includes(s) ? 'OK' : 'MISSING'}`)
})