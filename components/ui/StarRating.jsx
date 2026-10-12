'use client'

import { Star } from 'lucide-react'

/**
 * StarRating — оценка книги.
 *
 * readonly=true  — только показ (средний рейтинг и количество оценок)
 * readonly=false — кликабельные звёзды (1..5), для выставления оценки
 *
 * value    — текущее значение
 * onChange — обработчик выбора (работает только если не readonly)
 */

const SIZES = {
  sm: 14,
  md: 20,
  lg: 28
}

export default function StarRating({
  value = 0,
  count,
  size = 'md',
  readonly = true,
  onChange,
  className = ''
}) {
  const px = SIZES[size] || SIZES.md
  const rounded = Math.round(value * 2) / 2 // половина звезды

  const StarGlyph = ({ filled }) => (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M11.5 2.6l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3 8.8l5.9-.8z" />
    </svg>
  )

  return (
    <div
      className={`inline-flex items-center gap-1 ${
        readonly ? '' : 'cursor-pointer'
      } ${className}`}
      role={readonly ? 'img' : 'radiogroup'}
      aria-label={
        readonly
          ? `Рейтинг ${value.toFixed(1)} из 5${count ? `, оценок: ${count}` : ''}`
          : 'Оцени книгу'
      }
    >
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(value === n ? 0 : n)}
          className={`p-0.5 -m-0.5 rounded-[var(--radius-xs)] transition-colors ${
            readonly
              ? 'cursor-default'
              : 'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/60'
          }`}
          style={{
            color:
              n <= rounded
                ? 'var(--color-warning)'
                : 'var(--color-text-tertiary)',
            opacity: n <= rounded ? 1 : 0.45
          }}
          aria-label={readonly ? undefined : `${n} из 5`}
        >
          <StarGlyph filled={n <= rounded} />
        </button>
      ))}

      {count !== undefined && count > 0 && (
        <span className="ml-1 text-[12px] text-[var(--color-text-tertiary)]">
          {count}
        </span>
      )}
    </div>
  )
}