/**
 * Требования к отзыву (документ школы «Кітапқа пікір жазу талаптары»).
 * Используется и в форме ученика, и при проверке, и на сервере.
 */
export const REVIEW_MIN_WORDS = 150
export const REVIEW_MAX_WORDS = 300

export const REVIEW_CRITERIA = [
  { code: 'length', ru: 'Объём: от 150 до 300 слов', kk: 'Көлемі: 150–300 сөз' },
  { code: 'content', ru: 'Понимание содержания книги', kk: 'Кітаптың мазмұнын түсіну' },
  { code: 'idea', ru: 'Анализ главной идеи и смысла произведения', kk: 'Шығарманың басты идеясы мен мағынасын талдау' },
  { code: 'examples', ru: 'Своё мнение с примерами из книги', kk: 'Өз пікіріңді кітаптағы мысалдармен дәлелдеу' },
  { code: 'takeaway', ru: 'Личные выводы и польза от прочтения', kk: 'Жеке қорытынды және кітаптан алған пайда' }
]

/** Слова — последовательности букв/цифр (казахские и русские буквы считаются). */
export function countWords(text) {
  const m = String(text || '').match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)
  return m ? m.length : 0
}

export function reviewLengthError(text) {
  const n = countWords(text)
  if (n < REVIEW_MIN_WORDS) return `Отзыв короткий: ${n} слов, нужно от ${REVIEW_MIN_WORDS} до ${REVIEW_MAX_WORDS}`
  if (n > REVIEW_MAX_WORDS) return `Отзыв длинный: ${n} слов, нужно не больше ${REVIEW_MAX_WORDS}`
  return null
}
