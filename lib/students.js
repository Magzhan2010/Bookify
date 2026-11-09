import crypto from 'crypto'

/**
 * Помощники для создания учеников библиотекарем.
 * Логин строится из имени: «Серіков Арман» → serikov.arman@dls.school
 */

const TRANSLIT = {
  а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', і: 'i', к: 'k', қ: 'k', л: 'l', м: 'm', н: 'n', ң: 'n',
  о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u', ү: 'u', ф: 'f',
  х: 'kh', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya'
}

export const STUDENT_EMAIL_DOMAIN = 'dls.school'

function slug(word) {
  return String(word || '')
    .toLowerCase()
    .split('')
    .map(ch => (TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9-]/g, '')
}

/** Базовый логин из имени: первые два слова, через точку. */
export function emailBaseFromName(name) {
  const parts = String(name || '').trim().split(/\s+/).map(slug).filter(Boolean)
  const base = parts.slice(0, 2).join('.') || 'student'
  return base
}

// Без похожих символов (0/O, 1/l/I) — пароль легко переписать с листочка
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export function generatePassword(length = 8) {
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)]
  return out
}

/**
 * Подбирает свободный email: base@domain, base2@domain, base3@domain…
 * taken — Set занятых адресов в нижнем регистре (дополняется).
 */
export function pickFreeEmail(base, taken) {
  let n = 1
  let email = `${base}@${STUDENT_EMAIL_DOMAIN}`
  while (taken.has(email)) {
    n += 1
    email = `${base}${n}@${STUDENT_EMAIL_DOMAIN}`
  }
  taken.add(email)
  return email
}

/**
 * Ключ для поиска ученика по имени: без регистра, знаков и порядка слов,
 * казахские/русские буквы переводятся в латиницу.
 * «Адамов Муса», «Musa Adamov», «ADAMOV  musa» → одинаковый ключ.
 */
export function nameKey(name) {
  return String(name || '').trim().split(/\s+/).map(slug).filter(Boolean).sort().join(' ')
}
