/**
 * «Своя книга» — ученик или учитель читает книгу, которой нет в библиотеке.
 *
 * Защита от накрутки:
 * 1. Книгу подтверждает библиотекарь или команда, увидев её (или фото) — до этого отзыв не написать.
 * 2. Одновременно не больше MAX_OWN_ACTIVE заявок.
 * 3. Ту же книгу (по названию) дважды не засчитать; отзыв — 150–300 слов и обычная проверка.
 */
export const MAX_OWN_ACTIVE = 2
export const PAGES_MIN = 30
export const PAGES_MAX = 2000

/** Минимум дней чтения: ~60 страниц в день, но не меньше 3 дней. */
export function minReadDays(pages) {
  return Math.max(3, Math.ceil((parseInt(pages) || 0) / 60))
}

export function canFinishAt(startedAt, pages) {
  return new Date(new Date(startedAt).getTime() + minReadDays(pages) * 86400000)
}

/** Ключ названия для поиска повторов: без регистра, кавычек и знаков. */
export function titleKey(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"'“”„.,:;!?()\-–—]/g, ' ').replace(/\s+/g, ' ').trim()
}
