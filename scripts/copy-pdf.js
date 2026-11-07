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

const target = files[0]
console.log('Copying:', target.name)
const dest = path.join('C:\\Users\\User\\Documents\\Default Project\\Bookify', '_project.pdf')
fs.copyFileSync(target.full, dest)
console.log('Saved to:', dest, (fs.statSync(dest).size / 1024).toFixed(0) + 'KB')