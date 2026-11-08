'use client'

import { Bookmark, Highlighter, PenLine, NotebookPen, Coffee, BookHeart, Gift } from 'lucide-react'

/**
 * Изображение приза. Пока — минималистичная иконка на мягком градиенте
 * (временный стиль, до финальных иллюстраций). Чтобы сменить стиль призов
 * на всём сайте, достаточно поменять этот компонент.
 */
const VISUALS = {
  bookmark: { icon: Bookmark, from: '#fde2e4', to: '#fbc4cc', ink: '#c2334d' },
  highlighter: { icon: Highlighter, from: '#f4f9d2', to: '#e3f1a6', ink: '#5d7a12' },
  pen: { icon: PenLine, from: '#e0efff', to: '#c4ddff', ink: '#1f5fbf' },
  notebook: { icon: NotebookPen, from: '#ede7ff', to: '#d9ccff', ink: '#5b3fc4' },
  mug: { icon: Coffee, from: '#dcf6f1', to: '#b8ece2', ink: '#0f7a68' },
  wishbook: { icon: BookHeart, from: '#fff1d6', to: '#ffe0a8', ink: '#b36b00' }
}

export default function PrizeVisual({ code, size = 'md', className = '' }) {
  const v = VISUALS[code] || { icon: Gift, from: '#f1f5f9', to: '#e2e8f0', ink: '#475569' }
  const Icon = v.icon
  const dims = { sm: 'w-12 h-12 rounded-xl', md: 'w-full aspect-square rounded-[22px]', lg: 'w-20 h-20 rounded-2xl' }
  const iconSize = { sm: 20, md: 56, lg: 32 }[size] || 56

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${dims[size] || dims.md} ${className}`}
      style={{ background: `linear-gradient(145deg, ${v.from}, ${v.to})` }}
    >
      <Icon size={iconSize} strokeWidth={1.5} style={{ color: v.ink }} className="prize-icon transition-transform duration-500" />
    </div>
  )
}
