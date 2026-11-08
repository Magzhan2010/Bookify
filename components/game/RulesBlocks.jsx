'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { BookOpen, MessageSquare, Video, Mic, ShieldAlert } from 'lucide-react'
import CoinCard from './CoinCard'
import PrizeVisual from './PrizeVisual'
import { PAGE_TIERS, BONUSES, PRIZES_PREVIEW, LEVELS, tierForPages } from '../../lib/points'

/**
 * Блоки правил программы — для страницы «Как это работает» и лендинга.
 * Стиль: минимализм (крупная типографика, воздух, мягкие тени, плавные
 * анимации). Все цифры — из lib/points.js.
 */

const EASE = [0.2, 0.8, 0.2, 1]
const BONUS_ICONS = { review: MessageSquare, video: Video, tedx: Mic }

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8, ease: EASE }
}

/* ------------------------------------------------------------------ */
export function PointsSystem() {
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3"><PagesLadder /></div>
        <div className="lg:col-span-2"><BonusCards /></div>
      </div>
      <PointsCalculator />
      <CoinDeck />
    </div>
  )
}

/** Объём книги: столбики плавно вырастают, монеты появляются над ними. */
export function PagesLadder() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div {...fadeUp} ref={ref} className="apple-card p-6 sm:p-8 h-full">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-brand)]">
        <BookOpen size={15} /> За прочитанные страницы
      </div>
      <h3 className="mt-2 text-[26px] sm:text-[30px] font-semibold tracking-tight leading-tight text-[var(--color-text-primary)]">
        Чем толще книга,<br className="hidden sm:block" /> тем ценнее карточка.
      </h3>

      <div className="mt-8 grid grid-cols-5 gap-2 sm:gap-4 items-end h-[250px] sm:h-[280px]">
        {PAGE_TIERS.map((t, i) => {
          const h = 28 + i * 17
          return (
            <div key={t.code} className="flex flex-col items-center justify-end h-full">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.7, ease: EASE }}
                className="mb-3 w-full max-w-[104px]"
              >
                <div className="coin-float" style={{ animationDelay: `${i * 0.5}s`, animationDuration: '5s' }}>
                  <CoinCard value={t.points} fluid />
                </div>
              </motion.div>
              <motion.div
                initial={{ height: 0 }}
                animate={inView ? { height: `${h}%` } : {}}
                transition={{ delay: i * 0.1, duration: 1, ease: EASE }}
                className="w-full rounded-t-[14px] flex flex-col items-center pt-2.5"
                style={{
                  background: `linear-gradient(180deg, rgba(47,91,234,${0.18 + i * 0.13}), rgba(47,91,234,${0.06 + i * 0.05}))`
                }}
              >
                <span className="text-[11px] sm:text-[13px] font-semibold text-[var(--color-text-primary)] text-center leading-tight tabular-nums">
                  {t.max === Infinity ? `${t.min - 1}+` : `${t.min}–${t.max}`}
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">стр.</span>
              </motion.div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/** Бонусы — тёмная карточка, как блок «Pro» на сайте Apple. */
export function BonusCards() {
  return (
    <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}
      className="rounded-[28px] p-6 sm:p-8 h-full text-white bg-[#1d1d1f] relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#2f5bea]/30 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="text-[13px] font-semibold text-[#ffc93c]">Бонусы</div>
        <h3 className="mt-2 text-[26px] sm:text-[30px] font-semibold tracking-tight leading-tight text-white">
          Понял. Рассказал.<br />Заработал больше.
        </h3>
        <div className="mt-7 divide-y divide-white/10">
          {Object.values(BONUSES).map((b, i) => {
            const Icon = BONUS_ICONS[b.code]
            return (
              <motion.div
                key={b.code}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: EASE }}
                className="group flex items-center gap-4 py-4"
              >
                <Icon size={22} strokeWidth={1.6} className="text-white/70 group-hover:text-white transition-colors shrink-0" />
                <span className="flex-1 text-[15px] text-white/90">
                  {b.code === 'tedx'
                    ? <>Выступил на <span className="font-bold text-[#ff4d3d]">TEDx</span></>
                    : b.title}
                </span>
                <span className="text-[22px] font-semibold tabular-nums text-[#ffc93c] group-hover:scale-110 transition-transform">
                  +{b.points}
                </span>
              </motion.div>
            )
          })}
        </div>
        <p className="mt-4 text-[12px] text-white/45 leading-relaxed">
          Монеты за книгу и отзыв начисляет библиотекарь, когда примет отзыв.
          Видео и TEDx — по договорённости с библиотекарем.
        </p>
      </div>
    </motion.div>
  )
}

/** Калькулятор монет. */
export function PointsCalculator() {
  const [pages, setPages] = useState(280)
  const [bonus, setBonus] = useState({ review: true, video: false, tedx: false })
  const tier = tierForPages(pages)

  const cards = [
    ...(tier ? [{ key: `p${tier.points}`, value: tier.points, label: 'за книгу' }] : []),
    ...Object.values(BONUSES).filter(b => bonus[b.code]).map(b => ({ key: b.code, value: b.points, label: b.short }))
  ]
  const total = cards.reduce((s, c) => s + c.value, 0)
  const nextPrize = PRIZES_PREVIEW.find(p => p.price > total) || null
  const pct = ((pages - 50) / (800 - 50)) * 100

  return (
    <motion.div {...fadeUp} className="apple-card p-6 sm:p-8">
      <div className="text-[13px] font-semibold text-[var(--color-brand)]">Калькулятор</div>
      <h3 className="mt-2 text-[26px] sm:text-[30px] font-semibold tracking-tight text-[var(--color-text-primary)]">
        Сколько монет ты получишь?
      </h3>

      <div className="mt-8 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[14px] text-[var(--color-text-secondary)]">Страниц в книге</span>
            <span className="text-[34px] font-semibold tracking-tight text-[var(--color-text-primary)] tabular-nums">{pages}</span>
          </div>
          <input
            type="range"
            min={50}
            max={800}
            step={10}
            value={pages}
            onChange={e => setPages(parseInt(e.target.value))}
            className="apple-range w-full"
            style={{ '--pct': `${pct}%` }}
            aria-label="Страниц в книге"
          />
          <div className="flex justify-between text-[11px] text-[var(--color-text-tertiary)] mt-2">
            <span>50</span><span>800</span>
          </div>
          <div className="h-5 mt-1">
            {!tier && <p className="text-[12px] text-[var(--color-text-tertiary)]">Книги короче 100 страниц монет за объём не дают</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.values(BONUSES).map(b => (
              <button
                key={b.code}
                onClick={() => setBonus(v => ({ ...v, [b.code]: !v[b.code] }))}
                className={`apple-press px-4 py-2 rounded-full text-[13px] font-medium ${
                  bonus[b.code]
                    ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-card)]'
                    : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {b.short} +{b.points}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] bg-[var(--color-bg-soft)] p-5 min-h-[200px] flex flex-col">
          <div className="flex flex-wrap gap-2.5 flex-1 content-start">
            <AnimatePresence mode="popLayout">
              {cards.map(c => (
                <motion.div
                  key={c.key}
                  layout
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="text-center"
                >
                  <CoinCard value={c.value} size="sm" />
                  <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">{c.label}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-end justify-between gap-3">
            <div>
              <div className="text-[12px] text-[var(--color-text-tertiary)]">За одну книгу</div>
              <div className="text-[44px] font-semibold tracking-tight leading-none text-[var(--color-text-primary)] tabular-nums">
                <AnimatedNumber value={total} />
              </div>
            </div>
            {nextPrize && total > 0 && (
              <div className="text-right text-[12px] text-[var(--color-text-secondary)] max-w-[160px] leading-snug">
                До приза «{nextPrize.title}» — ещё {Math.ceil((nextPrize.price - total) / Math.max(total, 1))} таких книг
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** Колода карточек-монет: при наведении раскладывается веером. */
export function CoinDeck() {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(600)
  const boxRef = useRef(null)
  const values = [5, 10, 15, 20, 25]

  useEffect(() => {
    if (!boxRef.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [])
  const cardW = width < 420 ? 110 : 160
  const spread = Math.max(16, Math.min(124, (width - cardW) / (values.length - 1)))

  return (
    <motion.div
      {...fadeUp}
      className="apple-card p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(v => !v)}
    >
      <div className="md:w-64 shrink-0">
        <div className="text-[13px] font-semibold text-[var(--color-brand)]">Коллекция</div>
        <h3 className="mt-2 text-[24px] font-semibold tracking-tight leading-tight text-[var(--color-text-primary)]">
          Баллы приходят карточками
        </h3>
        <p className="text-[14px] text-[var(--color-text-secondary)] mt-2">
          Все карточки собираются в твоём профиле.
        </p>
      </div>
      <div ref={boxRef} className="relative flex-1 h-[150px] sm:h-[170px] w-full flex items-center justify-center">
        {values.map((v, i) => {
          const offset = i - (values.length - 1) / 2
          return (
            <motion.div
              key={v}
              className="absolute"
              animate={open
                ? { x: offset * spread, rotate: offset * 2, y: 0 }
                : { x: offset * Math.min(18, spread / 4), rotate: offset * 6, y: Math.abs(offset) * 3 }}
              whileHover={{ y: -14, zIndex: 10 }}
              transition={{ duration: 0.6, ease: EASE }}
              style={{ zIndex: i }}
            >
              <div style={{ width: cardW }}><CoinCard value={v} fluid /></div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

function AnimatedNumber({ value }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf
    const tick = now => {
      const t = Math.min(1, (now - start) / 400)
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{shown}</>
}

/* ------------------------------------------------------------------ */
export function PrizesPreview() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
      {PRIZES_PREVIEW.map((p, i) => (
        <motion.div
          key={p.code}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ delay: i * 0.06, duration: 0.7, ease: EASE }}
          className="apple-card card-lift p-3 sm:p-4 flex flex-col"
        >
          <PrizeVisual code={p.code} />
          <div className="px-1 pt-4 pb-1 flex items-end justify-between gap-2">
            <div className="text-[14px] sm:text-[16px] font-semibold text-[var(--color-text-primary)] leading-tight">{p.title}</div>
            <div className="text-[13px] sm:text-[14px] font-semibold text-[var(--color-text-secondary)] tabular-nums whitespace-nowrap">{p.price}</div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function LevelsList({ current }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {LEVELS.map((l, i) => {
        const reached = current != null && current >= l.min
        return (
          <motion.div
            key={l.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.6, ease: EASE }}
            className={`apple-card card-lift p-4 text-center ${reached ? '' : 'opacity-60'}`}
          >
            <div className="text-[30px] leading-none mb-2">{l.emoji}</div>
            <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">{l.title}</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
              {i === 0 ? 'старт' : `от ${l.min} монет`}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export function AiWarning() {
  return (
    <motion.div {...fadeUp} className="apple-card p-6 sm:p-7 flex items-center gap-5">
      <div className="w-12 h-12 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center shrink-0">
        <ShieldAlert size={22} strokeWidth={1.6} className="text-[var(--color-text-primary)]" />
      </div>
      <div>
        <div className="text-[17px] font-semibold text-[var(--color-text-primary)]">Только свои мысли.</div>
        <p className="text-[14px] text-[var(--color-text-secondary)] mt-0.5">Если отзыв списан с ИИ, баллы не засчитываются.</p>
      </div>
    </motion.div>
  )
}

export const PagesTable = PagesLadder
export const BonusList = BonusCards
