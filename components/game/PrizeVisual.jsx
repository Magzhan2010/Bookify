'use client'

import { Bookmark, Gift } from 'lucide-react'

/**
 * Изображение приза: фото товара на спокойном светлом фоне (как карточки в Apple Store).
 * variant — цвет для текстовыделителя (yellow, pink, …).
 * Чтобы поменять картинку приза на всём сайте, достаточно поменять PHOTOS.
 */
const PHOTOS = {
  pen: '/prizes/photo/pen.webp',
  notebook: '/prizes/photo/notebook.webp',
  mug: '/prizes/photo/mug.webp',
  wishbook: '/prizes/photo/wishbook.svg'
}

export function prizeImage(code, variant) {
  if (code === 'highlighter') return `/prizes/photo/highlighter-${variant || 'yellow'}.webp`
  return PHOTOS[code] || null
}

export default function PrizeVisual({ code, variant, size = 'md', className = '' }) {
  const src = prizeImage(code, variant)
  const dims = { sm: 'w-12 h-12 rounded-xl', md: 'w-full aspect-square rounded-[22px]', lg: 'w-20 h-20 rounded-2xl' }
  const pad = { sm: 'p-1', md: 'p-[8%]', lg: 'p-1.5' }[size] || 'p-[8%]'

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-[#f2f2f5] dark:bg-[#2a2a2e] ${dims[size] || dims.md} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          className={`prize-icon w-full h-full object-contain ${pad} transition-transform duration-500 animate-[prizeFade_.35s_ease]`}
        />
      ) : code === 'bookmark' ? (
        <Bookmark size={size === 'md' ? 56 : 22} strokeWidth={1.5} className="prize-icon text-[#1f3a78] dark:text-[#9db4ff] transition-transform duration-500" />
      ) : (
        <Gift size={size === 'md' ? 56 : 22} strokeWidth={1.5} className="text-[var(--color-text-tertiary)]" />
      )}
    </div>
  )
}

/** Кружочки выбора цвета (для текстовыделителя). */
export function ColorSwatches({ colors, value, onChange, size = 22, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="radiogroup" aria-label="Цвет">
      {colors.map(c => {
        const active = c.key === value
        return (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={c.label}
            title={c.label}
            onClick={e => { e.stopPropagation(); onChange(c.key) }}
            className={`rounded-full transition-transform apple-press ${active ? 'ring-2 ring-offset-2 ring-[var(--color-text-primary)] ring-offset-[var(--color-bg-card)] scale-105' : 'hover:scale-110'}`}
            style={{ width: size, height: size, background: c.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
          />
        )
      })}
    </div>
  )
}
