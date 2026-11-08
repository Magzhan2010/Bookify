'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const COLORS = ['#ffc93c', '#2f5bea', '#ff6b6b', '#20b486', '#c084fc', '#38bdf8']

/**
 * Короткий салют из конфетти. Рендерится, пока fire меняется (передавай счётчик).
 * Без библиотек: 60 цветных бумажек на CSS-анимации, сами удаляются через 2 с.
 */
export default function Confetti({ fire }) {
  const [pieces, setPieces] = useState([])

  useEffect(() => {
    if (!fire) return
    const batch = Array.from({ length: 60 }, (_, i) => ({
      id: `${fire}-${i}`,
      left: 50 + (Math.random() - 0.5) * 30,
      dx: `${(Math.random() - 0.5) * 70}vw`,
      rot: `${Math.random() * 720 - 360}deg`,
      delay: Math.random() * 0.15,
      dur: 1.2 + Math.random() * 0.8,
      color: COLORS[i % COLORS.length],
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8
    }))
    setPieces(batch)
    const t = setTimeout(() => setPieces([]), 2200)
    return () => clearTimeout(t)
  }, [fire])

  if (!pieces.length || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[80] overflow-hidden" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="absolute top-[-20px] rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            '--dx': p.dx,
            '--rot': p.rot,
            animation: `confettiFall ${p.dur}s cubic-bezier(.2,.6,.4,1) ${p.delay}s forwards`
          }}
        />
      ))}
    </div>,
    document.body
  )
}
