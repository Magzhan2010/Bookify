'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

const EASE = [0.2, 0.8, 0.2, 1]
const INTERVAL = 8000

/**
 * Большая карточка цитаты: текст слева, чёрно-белый портрет справа,
 * растворяющийся в фоне. Если цитат несколько — листаются сами,
 * с полоской прогресса; стрелки и пауза для ручного управления.
 */
export default function QuoteFeature({ quotes = [], className = '' }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = quotes.length
  const q = quotes[index]

  const go = useCallback(step => setIndex(i => (i + step + count) % count), [count])

  useEffect(() => {
    if (count < 2 || paused) return
    const t = setTimeout(() => go(1), INTERVAL)
    return () => clearTimeout(t)
  }, [index, count, paused, go])

  if (!q) return null

  return (
    <div
      className={`relative overflow-hidden rounded-[32px] bg-[var(--color-bg-card)] border border-[var(--color-border)] min-h-[380px] sm:min-h-[420px] ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Портрет */}
      <AnimatePresence mode="wait">
        {q.image_url && (
          <motion.div
            key={`img-${q.id}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: EASE }}
            className="absolute inset-y-0 right-0 w-[55%] sm:w-[45%] pointer-events-none"
          >
            <img
              src={q.image_url}
              alt={q.author_name}
              className="w-full h-full object-cover object-top grayscale contrast-[1.05]"
              style={{
                WebkitMaskImage: 'linear-gradient(to left, black 45%, transparent 100%)',
                maskImage: 'linear-gradient(to left, black 45%, transparent 100%)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Текст */}
      <div className="relative z-10 p-7 sm:p-12 flex flex-col justify-between min-h-[380px] sm:min-h-[420px] max-w-full sm:max-w-[68%]">
        <div>
          <div className="text-[110px] sm:text-[140px] leading-[0.6] font-serif text-[var(--color-text-primary)] opacity-[0.08] select-none -ml-1 h-12 sm:h-16">“</div>
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={`t-${q.id}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.7, ease: EASE }}
              className={`font-semibold tracking-tight text-[var(--color-text-primary)] leading-[1.18] ${
                q.text.length > 180 ? 'text-[20px] sm:text-[28px]' : q.text.length > 90 ? 'text-[24px] sm:text-[34px]' : 'text-[28px] sm:text-[42px]'
              } ${q.image_url ? 'pr-[38%] sm:pr-0' : ''}`}
            >
              {q.text}
            </motion.blockquote>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`a-${q.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="mt-8"
          >
            <div className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-[var(--color-text-primary)]">{q.author_name}</div>
            {(q.author_info || q.book_title) && (
              <div className="text-[14px] sm:text-[16px] text-[var(--color-text-secondary)] mt-1">
                {[q.author_info, q.book_title && `«${q.book_title}»`].filter(Boolean).join(' · ')}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Управление */}
      {count > 1 && (
        <div className="absolute z-20 left-7 sm:left-12 right-7 sm:right-12 bottom-5 flex items-center gap-3">
          <div className="flex-1 flex gap-1.5">
            {quotes.slice(0, 12).map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setIndex(i)}
                aria-label={`Цитата ${i + 1}`}
                className="relative h-[3px] flex-1 max-w-[48px] rounded-full bg-[var(--color-text-primary)]/12 overflow-hidden"
              >
                {i === index && (
                  <motion.span
                    key={`${index}-${paused}`}
                    className="absolute inset-y-0 left-0 bg-[var(--color-text-primary)]/70 rounded-full"
                    initial={{ width: paused ? '100%' : '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: paused ? 0 : INTERVAL / 1000, ease: 'linear' }}
                  />
                )}
                {i < index && <span className="absolute inset-0 bg-[var(--color-text-primary)]/40 rounded-full" />}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <RoundBtn onClick={() => setPaused(p => !p)} label={paused ? 'Продолжить' : 'Пауза'}>
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </RoundBtn>
            <RoundBtn onClick={() => go(-1)} label="Назад"><ChevronLeft size={16} /></RoundBtn>
            <RoundBtn onClick={() => go(1)} label="Дальше"><ChevronRight size={16} /></RoundBtn>
          </div>
        </div>
      )}
    </div>
  )
}

function RoundBtn({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-full bg-[var(--color-bg-soft)]/90 backdrop-blur text-[var(--color-text-primary)] flex items-center justify-center hover:bg-[var(--color-border)] active:scale-95 transition"
    >
      {children}
    </button>
  )
}

/** Небольшая карточка цитаты для сетки. */
export function QuoteCard({ q, i = 0, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: (i % 6) * 0.05, ease: EASE }}
      className="group w-full text-left break-inside-avoid mb-5 apple-card card-lift p-6 overflow-hidden"
    >
      <div className="text-[56px] leading-[0.5] font-serif text-[var(--color-text-primary)] opacity-[0.08] h-6 select-none">“</div>
      <p className="text-[17px] leading-relaxed font-medium text-[var(--color-text-primary)]">{q.text}</p>
      <div className="mt-5 flex items-center gap-3">
        {q.image_url ? (
          <img src={q.image_url} alt="" loading="lazy" className="w-11 h-11 rounded-full object-cover object-top grayscale group-hover:grayscale-0 transition duration-700" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center text-[16px] font-semibold text-[var(--color-text-secondary)]">
            {q.author_name?.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">{q.author_name}</div>
          {(q.author_info || q.book_title) && (
            <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
              {[q.author_info, q.book_title && `«${q.book_title}»`].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  )
}
