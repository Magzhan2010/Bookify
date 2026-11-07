const fs = require('fs')
const { PDFParse } = require('pdf-parse')

const run = async () => {
  const buffer = fs.readFileSync('C:\\Users\\User\\Documents\\Default Project\\Bookify\\_project.pdf')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  console.log('=== PAGES:', result.total, '===')
  console.log(result.text)
  await parser.destroy()
}

run().catch(err => console.error('ERR:', err.message))