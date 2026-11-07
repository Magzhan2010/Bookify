'use client'

import { coinImage } from '../../lib/points'

/**
 * Карточка-монета «School Rewards». Для номиналов 5/10/15/20/25 —
 * фирменная картинка, для остальных — карточка в том же стиле, нарисованная кодом.
 * size: xs (64px) | sm (96px) | md (160px) | lg (240px) — ширина карточки;
 * fluid — растянуть на ширину родителя.
 */
const WIDTHS = { xs: 64, sm: 96, md: 160, lg: 240 }

export default function CoinCard({ value, size = 'md', className = '', title, fluid = false }) {
  const width = WIDTHS[size] || WIDTHS.md
  const src = coinImage(value)
  const label = title || `${value} баллов`

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        title={label}
        width={width}
        height={Math.round(width * 0.456)}
        loading="lazy"
        decoding="async"
        className={`select-none drop-shadow-[0_4px_10px_rgba(31,59,143,0.18)] ${className}`}
        style={{ width: fluid ? '100%' : width, height: 'auto' }}
        draggable={false}
      />
    )
  }

  // Запасной вариант для «нестандартных» сумм
  return (
    <div
      title={label}
      className={`relative overflow-hidden rounded-[10px] bg-gradient-to-br from-[#eef3ff] via-[#dfe8ff] to-[#9db7f5] flex items-center justify-center ${className}`}
      style={fluid ? { width: '100%', aspectRatio: '2.19' } : { width, height: Math.round(width * 0.456) }}
    >
      <div className="text-center leading-none">
        <div className="font-extrabold text-[#173a8a]" style={{ fontSize: width * 0.2 }}>{value}</div>
        <div className="font-semibold tracking-[0.2em] text-[#2f5bea]" style={{ fontSize: width * 0.07 }}>COINS</div>
      </div>
    </div>
  )
}
