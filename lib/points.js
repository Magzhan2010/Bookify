/**
 * Правила программы «Read. Think. Speak. Create. Lead.»
 * Единый источник правды: используется и на сервере (начисление),
 * и в интерфейсе (правила, лендинг, профиль). Меняешь цифры — только здесь.
 */

// Баллы за объём прочитанной книги
export const PAGE_TIERS = [
  { code: 'pages_100_200', min: 100, max: 200, points: 5, label: '100 – 200 стр.' },
  { code: 'pages_201_300', min: 201, max: 300, points: 10, label: '201 – 300 стр.' },
  { code: 'pages_301_400', min: 301, max: 400, points: 15, label: '301 – 400 стр.' },
  { code: 'pages_401_500', min: 401, max: 500, points: 20, label: '401 – 500 стр.' },
  { code: 'pages_500_plus', min: 501, max: Infinity, points: 25, label: '500+ стр.' }
]

// Бонусы
export const BONUSES = {
  review: { code: 'review', points: 5, title: 'Написал отзыв о книге', short: 'Отзыв' },
  video: { code: 'video', points: 10, title: 'Снял видео с рассказом о книге', short: 'Видео' },
  tedx: { code: 'tedx', points: 15, title: 'Выступил на TEDx', short: 'TEDx' }
}

// Номиналы карточек-монет (картинки лежат в /public/coins/<n>.webp)
export const COIN_VALUES = [5, 10, 15, 20, 25]

// Уровни считаются по всем заработанным баллам (траты уровень не понижают)
export const LEVELS = [
  { min: 0, title: 'Новичок', emoji: '🌱' },
  { min: 25, title: 'Читатель', emoji: '📖' },
  { min: 75, title: 'Книголюб', emoji: '📚' },
  { min: 150, title: 'Эрудит', emoji: '🧠' },
  { min: 300, title: 'Мудрец', emoji: '🦉' },
  { min: 500, title: 'Легенда', emoji: '🏆' }
]

/**
 * Коэффициент страницы: в одних изданиях на странице мало слов, в других много.
 * Засчитанные страницы = страниц × коэффициент (таблица команды: «real page»).
 * Ориентир по числу слов на одной полной странице.
 */
export const PAGE_COEFS = [
  { value: 0.5, label: '0.5', hint: 'до 200 слов на странице' },
  { value: 0.75, label: '0.75', hint: '200–249 слов' },
  { value: 1, label: '1', hint: '250–299 слов' },
  { value: 1.25, label: '1.25', hint: '300 слов и больше' }
]

/** Коэффициент по числу слов на странице (null — если слов не знаем). */
export function coefForWords(words) {
  const w = parseFloat(words)
  if (!w || w <= 0) return null
  if (w < 200) return 0.5
  if (w < 250) return 0.75
  if (w < 300) return 1
  return 1.25
}

/** Допустимый коэффициент из ввода или null. */
export function cleanCoef(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return PAGE_COEFS.some(c => c.value === n) ? n : null
}

/** Засчитанные страницы: страниц × коэффициент (нет коэффициента — 1). */
export function scoredPages(pages, coef) {
  const n = parseInt(pages) || 0
  const k = parseFloat(coef) || 1
  return Math.round(n * k)
}

/** Ступень за книгу с учётом коэффициента страницы. */
export function tierForBook(pages, coef) {
  return tierForPages(scoredPages(pages, coef))
}

/** Ступень за страницы или null, если книга короче 100 страниц / объём неизвестен. */
export function tierForPages(pages) {
  const n = parseInt(pages)
  if (!n || n < PAGE_TIERS[0].min) return null
  return PAGE_TIERS.find(t => n >= t.min && n <= t.max) || null
}

/** Текущий уровень, следующий уровень и прогресс до него (0–100). */
export function levelFor(earned) {
  const total = Math.max(0, parseInt(earned) || 0)
  let index = 0
  LEVELS.forEach((l, i) => { if (total >= l.min) index = i })
  const level = LEVELS[index]
  const next = LEVELS[index + 1] || null
  const progress = next
    ? Math.round(((total - level.min) / (next.min - level.min)) * 100)
    : 100
  return { ...level, index: index + 1, next, progress, toNext: next ? next.min - total : 0 }
}

/** Картинка карточки для номинала (или null — тогда рисуем карточку кодом). */
export function coinImage(value) {
  return COIN_VALUES.includes(Number(value)) ? `/coins/${Number(value)}.webp` : null
}

// Витрина призов для публичных страниц (лендинг, правила).
// Цены в магазине берутся из БД (таблица prizes), здесь — те же стартовые значения.
export const PRIZES_PREVIEW = [
  { code: 'bookmark', title: 'Закладка', price: 20, image: '/prizes/bookmark.svg' },
  { code: 'highlighter', title: 'Текстовыделитель', price: 50, image: '/prizes/highlighter.svg' },
  { code: 'pen', title: 'Ручка', price: 120, image: '/prizes/pen.svg' },
  { code: 'notebook', title: 'Блокнот', price: 150, image: '/prizes/notebook.svg' },
  { code: 'mug', title: 'Термокружка', price: 200, image: '/prizes/mug.svg' },
  { code: 'wishbook', title: 'Книга из твоего Wish List', price: 250, image: '/prizes/wishbook.svg' }
]

// Мягкие фоны под мультяшные картинки призов
export const PRIZE_TINTS = {
  bookmark: '#e6edff',
  highlighter: '#fff6d6',
  pen: '#e9f3ff',
  notebook: '#e6edff',
  mug: '#e3f6ff',
  wishbook: '#fff1d6'
}

// Цвета текстовыделителя (STABILO BOSS pastel). Ученик выбирает цвет при обмене,
// цвет сохраняется в заказе как «Цвет: …».
export const HIGHLIGHTER_COLORS = [
  { key: 'yellow', label: 'Жёлтый', hex: '#f5dc7f' },
  { key: 'pink', label: 'Розовый', hex: '#f99ca9' },
  { key: 'coral', label: 'Коралловый', hex: '#fc9475' },
  { key: 'mint', label: 'Мятный', hex: '#7dc9a9' },
  { key: 'turquoise', label: 'Бирюзовый', hex: '#a9e0da' },
  { key: 'lilac', label: 'Лиловый', hex: '#d9bfdc' }
]

export const COLOR_NOTE_PREFIX = 'Цвет: '

/** Цвет из заметки заказа («Цвет: Мятный») → ключ варианта (mint) */
export function colorKeyFromNote(note) {
  if (!note || !String(note).startsWith(COLOR_NOTE_PREFIX)) return null
  const label = String(note).slice(COLOR_NOTE_PREFIX.length).trim()
  return HIGHLIGHTER_COLORS.find(c => c.label === label)?.key || null
}
