const fs = require('fs')
const path = require('path')

const dir = 'C:\\Users\\User\\Downloads\\Telegram Desktop'
const files = fs.readdirSync(dir)
  .map(f => {
    const full = path.join(dir, f)
    try {
      const st = fs.statSync(full)
      return { name: f, full, size: st.size, mtime: st.mtime }
    } catch (e) { return null }
  })
  .filter(Boolean)
  .filter(f => f.name.toLowerCase().endsWith('.pdf'))
  .sort((a, b) => b.mtime - a.mtime)

console.log('PDF files (newest first):')
files.slice(0, 8).forEach(f => {
  console.log(`  ${f.mtime.toISOString().slice(0, 16)} | ${(f.size / 1024).toFixed(0)}KB | ${f.name}`)
  console.log(`     -> ${f.full}`)
})