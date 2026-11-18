'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

/**
 * Три вида таймера для «Фокуса».
 * Все получают: remaining и total (в секундах), phase ('focus' | 'short' | 'long'), running.
 */

/* Цвета этапов — фирменный синий сайта, зелёный и фиолетовый для перерывов */
export const PHASE_COLORS = {
  focus: { a: '#1a56db', b: '#4f7df0', soft: 'rgba(26,86,219,0.35)' },
  short: { a: '#16a34a', b: '#34c759', soft: 'rgba(22,163,74,0.32)' },
  long: { a: '#7c3aed', b: '#a78bfa', soft: 'rgba(124,58,237,0.32)' }
}

export const fmt = sec => {
  const s = Math.max(0, Math.round(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/* 1. Круг                                                             */
/* ------------------------------------------------------------------ */
export function RingTimer({ remaining, total, phase, label }) {
  const c = PHASE_COLORS[phase]
  const R = 140
  const L = 2 * Math.PI * R
  const p = total ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  const angle = p * 2 * Math.PI - Math.PI / 2
  const dot = { x: 160 + R * Math.cos(angle), y: 160 + R * Math.sin(angle) }
  const id = `ring-${phase}`

  return (
    <div className="relative w-[min(76vw,380px)] aspect-square">
      <svg viewBox="0 0 320 320" className="absolute inset-0 w-full h-full -rotate-0">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c.a} />
            <stop offset="100%" stopColor={c.b} />
          </linearGradient>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {/* 60 рисок по кругу */}
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * 2 * Math.PI - Math.PI / 2
          const big = i % 5 === 0
          const r1 = 156, r2 = big ? 149 : 152
          const passed = i / 60 < p
          return (
            <line key={i}
              x1={160 + r1 * Math.cos(a)} y1={160 + r1 * Math.sin(a)}
              x2={160 + r2 * Math.cos(a)} y2={160 + r2 * Math.sin(a)}
              stroke={passed ? c.a : 'var(--color-border-strong)'} strokeWidth={big ? 2 : 1} strokeLinecap="round"
              style={{ transition: 'stroke .4s' }}
            />
          )
        })}
        <circle cx="160" cy="160" r={R} fill="none" stroke="var(--color-bg-soft)" strokeWidth="12" />
        <circle
          cx="160" cy="160" r={R} fill="none" stroke={`url(#${id})`} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={L} strokeDashoffset={L * (1 - p)}
          transform="rotate(-90 160 160)"
          style={{ transition: 'stroke-dashoffset 0.4s linear' }}
        />
        {p > 0.002 && (
          <>
            <circle cx={dot.x} cy={dot.y} r="14" fill={c.a} opacity="0.35" filter={`url(#${id}-glow)`} />
            <circle cx={dot.x} cy={dot.y} r="8" fill="var(--color-bg-card)" stroke={c.a} strokeWidth="4" />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[13px] font-semibold uppercase tracking-[0.22em]" style={{ color: c.a }}>{label}</div>
        <div className="mt-1 text-[min(17vw,84px)] font-semibold tabular-nums tracking-[-0.04em] leading-none">{fmt(remaining)}</div>
        <div className="mt-3 text-[13px] text-[var(--color-text-tertiary)] tabular-nums">из {fmt(total)}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Обратный отсчёт — крупные цифры, каждая цифра выезжает            */
/* ------------------------------------------------------------------ */
export function DigitsTimer({ remaining, total, phase, label }) {
  const still = useReducedMotion()
  const c = PHASE_COLORS[phase]
  const p = total ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  const chars = fmt(remaining).split('')

  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-[13px] font-semibold uppercase tracking-[0.22em] mb-2" style={{ color: c.a }}>{label}</div>
      <div className="flex items-center font-light tracking-[-0.05em] leading-none text-[min(25vw,200px)] tabular-nums select-none">
        {chars.map((ch, i) =>
          ch === ':' ? (
            <span key="colon" className="px-[0.04em] -mt-[0.08em] opacity-60">:</span>
          ) : (
            <span key={i} className="relative inline-block w-[0.6em] h-[1em] overflow-hidden text-center">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={ch}
                  initial={still ? false : { y: '-100%', opacity: 0, filter: 'blur(6px)' }}
                  animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                  exit={still ? undefined : { y: '100%', opacity: 0, filter: 'blur(6px)' }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  {ch}
                </motion.span>
              </AnimatePresence>
            </span>
          )
        )}
      </div>
      <div className="mt-6 w-[min(80vw,520px)] h-[4px] rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: `linear-gradient(90deg, ${c.a}, ${c.b})`, transition: 'width .4s linear' }} />
      </div>
      <div className="mt-3 text-[13px] text-[var(--color-text-tertiary)] tabular-nums">из {fmt(total)}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Табло — перекидной счётчик, как на волейболе и баскетболе         */
/* ------------------------------------------------------------------ */
function FlipDigit({ d, still }) {
  const [s, setS] = useState({ cur: d, prev: d, k: 0 })
  useEffect(() => {
    setS(x => (x.cur === d ? x : { cur: d, prev: x.cur, k: x.k + 1 }))
  }, [d])
  const flipping = !still && s.k > 0
  return (
    <div className="flip-card">
      <div className="flip-half top"><span>{s.cur}</span></div>
      <div className="flip-half bottom"><span>{flipping ? s.prev : s.cur}</span></div>
      {flipping && (
        <>
          <div key={`t${s.k}`} className="flip-half top flip-flap"><span>{s.prev}</span></div>
          <div key={`b${s.k}`} className="flip-half bottom flip-flap"><span>{s.cur}</span></div>
        </>
      )}
    </div>
  )
}

function FlipPair({ value, caption, still }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex gap-[calc(var(--w)*0.08)] p-[calc(var(--w)*0.1)] pt-[calc(var(--w)*0.2)] rounded-[calc(var(--w)*0.18)] bg-[#0b0b0d] border border-white/10 shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_20px_40px_rgba(0,0,0,0.45)]">
        {/* кольца, как у перекидного табло */}
        <span className="flip-ring" style={{ left: '27%' }} />
        <span className="flip-ring" style={{ left: '73%' }} />
        <FlipDigit d={value[0]} still={still} />
        <FlipDigit d={value[1]} still={still} />
      </div>
      <div className="mt-3 text-[12px] font-bold tracking-[0.3em] text-[var(--color-text-tertiary)]">{caption}</div>
    </div>
  )
}

export function ScoreboardTimer({ remaining, phase, label }) {
  const still = useReducedMotion()
  const c = PHASE_COLORS[phase]
  const [mm, ss] = fmt(remaining).split(':')
  return (
    <div className="flex flex-col items-center" style={{ '--w': 'min(17vw, 104px)' }}>
      <div className="mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: c.a }} />
        <span className="text-[12px] font-bold uppercase tracking-[0.25em]" style={{ color: c.a }}>{label}</span>
      </div>
      <div className="flex items-start gap-[calc(var(--w)*0.22)]">
        <FlipPair value={mm} caption="МИН" still={still} />
        <div className="flex flex-col gap-[calc(var(--w)*0.32)] pt-[calc(var(--w)*0.62)]">
          <span className="w-[calc(var(--w)*0.13)] h-[calc(var(--w)*0.13)] rounded-full" style={{ background: c.a, boxShadow: `0 0 12px ${c.a}` }} />
          <span className="w-[calc(var(--w)*0.13)] h-[calc(var(--w)*0.13)] rounded-full" style={{ background: c.a, boxShadow: `0 0 12px ${c.a}` }} />
        </div>
        <FlipPair value={ss} caption="СЕК" still={still} />
      </div>
    </div>
  )
}
