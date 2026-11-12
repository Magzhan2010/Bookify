/**
 * «Своя книга» — ученик или учитель читает книгу, которой нет в библиотеке.
 *
 * Защита от накрутки:
 * 1. Старт подтверждает библиотекарь или команда, увидев книгу (или её фото) — до этого монет нет.
 * 2. Отсчёт чтения идёт с момента подтверждения — «прочитал раньше» задним числом не добавить.
 * 3. Нажать «Дочитал» можно не раньше, чем через minReadDays(pages) дней.
 * 4. Одновременно не больше MAX_OWN_ACTIVE своих книг (заявки + читаю сейчас).
 * 5. Ту же книгу (по названию) дважды не засчитать; отзыв — 150–300 слов и обычная проверка.
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
