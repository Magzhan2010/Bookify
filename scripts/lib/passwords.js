/**
 * Общие хелперы для скриптов, которые раздают пароли ученикам.
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Без похожих символов (0/O, 1/l/I), чтобы пароль было легко переписать с листочка
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

function generatePassword(length = 8) {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[crypto.randomInt(ALPHABET.length)]
  }
  return out
}

const PRIVATE_DIR = path.join(__dirname, '..', '..', 'private')

/**
 * Сохраняет логины и пароли в private/credentials-<дата>.csv.
 * Папка private/ в .gitignore — в репозиторий файл не попадёт.
 */
function saveCredentials(rows, prefix = 'credentials') {
  fs.mkdirSync(PRIVATE_DIR, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const file = path.join(PRIVATE_DIR, `${prefix}-${stamp}.csv`)
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = ['Имя;Класс;Email;Пароль']
  for (const r of rows) {
    lines.push([r.name, r.class_name, r.email, r.password].map(escape).join(';'))
  }
  // BOM — чтобы Excel открыл кириллицу без кракозябр
  fs.writeFileSync(file, '﻿' + lines.join('\n'), 'utf8')
  return file
}

module.exports = { generatePassword, saveCredentials, PRIVATE_DIR }
