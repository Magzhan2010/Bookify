'use client'

import { useState } from 'react'
import { Gift } from 'lucide-react'

/**
 * Изображение приза. У части призов несколько ракурсов: на большой карточке
 * по фото можно нажать (или на точку снизу) — откроется следующий ракурс.
 * variant — цвет для текстовыделителя (yellow, pink, …).
 * Чтобы поменять фото приза на всём сайте, достаточно поменять GALLERY.
 */
const P = '/prizes/photo/'
const GALLERY = {
  mug: { fit: 'cover', photos: ['mug-1', 'mug-2', 'mug-3', 'mug-4'].map(n => `${P}${n}.webp`) },
  notebook: { fit: 'cover', photos: ['notebook-1', 'notebook-2', 'notebook-3', 'notebook-4'].map(n => `${P}${n}.webp`) },
  bookmark: { fit: 'cover', photos: [`${P}bookmark-1.webp`] },
  wishbook: { fit: 'cover', photos: [`${P}wishbook-1.webp`] },
  pen: { fit: 'contain', photos: [`${P}pen.webp`] }
}

export function prizeImage(code, variant) {
  if (code === 'highlighter') return `${P}highlighter-${variant || 'yellow'}.webp`
  return GALLERY[code]?.photos[0] || null
}

export default function PrizeVisual({ code, variant, size = 'md', className = '' }) {
  const [idx, setIdx] = useState(0)
  const g = code === 'highlighter'
    ? { fit: 'contain', photos: [prizeImage(code, variant)] }
    : GALLERY[code]
  const photos = g?.photos || []
  const many = size === 'md' && photos.length > 1
  const src = photos[many ? idx % photos.length : 0]
  const cover = g?.fit === 'cover'

  const dims = { sm: 'w-12 h-12 rounded-xl', md: 'w-full aspect-square rounded-[22px]', lg: 'w-20 h-20 rounded-2xl' }
  const pad = cover ? '' : ({ sm: 'p-1', md: 'p-[8%]', lg: 'p-1.5' }[size] || 'p-[8%]')

  const next = e => {
    if (!many) return
    e.stopPropagation()
    setIdx(i => (i + 1) % photos.length)
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${cover ? 'bg-[#e3e3e1]' : 'bg-[#f2f2f5] dark:bg-[#2a2a2e]'} ${dims[size] || dims.md} ${many ? 'cursor-pointer' : ''} ${className}`}
      onClick={next}
      role={many ? 'button' : undefined}
      aria-label={many ? `Другой ракурс (${idx + 1} из ${photos.length})` : undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          className={`prize-icon w-full h-full ${cover ? 'object-cover' : 'object-contain'} ${pad} transition-transform duration-500 animate-[prizeFade_.35s_ease]`}
        />
      ) : (
        <Gift size={size === 'md' ? 56 : 22} strokeWidth={1.5} className="text-[var(--color-text-tertiary)]" />
      )}
      {many && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ракурс ${i + 1}`}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx % photos.length ? 'w-5 bg-[#1d1d1f]/70' : 'w-1.5 bg-[#1d1d1f]/25 hover:bg-[#1d1d1f]/45'}`}
            />
          ))}
        </div>
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
