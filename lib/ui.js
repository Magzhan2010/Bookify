/**
 * Общие константы интерфейса.
 * Единый источник правды для сетки, чтобы скелетон и реальные
 * карточки всегда совпадали (иначе при загрузке всё «прыгает»).
 */

/** Сетка каталога. Используется и Books, и SkeletonGrid. */
export const GRID =
  'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5'

/** Сетка для более широких карточек (крупная обложка). */
export const GRID_WIDE =
  'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5'

/** Минимальная зона нажатия — 44px (WCAG / мобильные гайдлайны). */
export const TAP_MIN = 44

/** Сколько книг показывать за один запрос каталога. */
export const PAGE_SIZE = 12

/** Сколько жанров показывать до кнопки «ещё». */
export const GENRES_PER_PAGE = 6

/** Срок выдачи по умолчанию, дней. */
export const DEFAULT_LOAN_DAYS = 14

/** Формат даты для русской локали. */
export const dateRu = (value, opts) =>
  new Date(value).toLocaleDateString('ru-RU', opts || { day: 'numeric', month: 'long' })

/** Русское склонение: 1 книга / 2 книги / 5 книг */
export function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}