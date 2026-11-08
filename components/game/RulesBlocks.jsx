'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { BookOpen, Star, MessageSquare, Video, Mic, Ban, Sparkles, Calculator } from 'lucide-react'
import CoinCard from './CoinCard'
import { PAGE_TIERS, BONUSES, PRIZES_PREVIEW, LEVELS, tierForPages } from '../../lib/points'

/**
 * Блоки с правилами программы — для страницы «Как это работает» и лендинга.
 * Все цифры берутся из lib/points.js, поэтому совпадают с реальным начислением.
 */

const BONUS_ICONS = { review: MessageSquare, video: Video, tedx: Mic }
const BAR_COLORS = ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#ffc93c']

/* ------------------------------------------------------------------ */
/* Система баллов целиком: лестница страниц + бонусы + калькулятор     */
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

/** «Лестница» страниц: столбики растут при появлении, монеты плавают. */
export function PagesLadder() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <div ref={ref} className="toon-card p-5 sm:p-6 h-full">
      <h3 className="flex items-center gap-2.5 text-[18px] font-extrabold text-[var(--color-text-primary)]">
        <BookOpen size={20} className="text-[var(--color-brand)]" /> За прочитанные страницы
      </h3>
      <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">Чем толще книга — тем дороже карточка</p>

      {/* Лестница (на телефоне — компактнее) */}
      <div className="mt-6 grid grid-cols-5 gap-2 sm:gap-3 items-end h-[260px] sm:h-[300px]">
        {PAGE_TIERS.map((t, i) => {
          const h = 34 + i * 16 // % высоты
          const top = i === PAGE_TIERS.length - 1
          return (
            <div key={t.code} className="flex flex-col items-center justify-end h-full">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ delay: 0.35 + i * 0.12, type: 'spring', stiffness: 260, damping: 18 }}
                className="mb-2 w-full flex justify-center"
              >
                <div className="coin-float w-full max-w-[110px]" style={{ animationDelay: `${i * 0.4}s`, '--tilt': `${i % 2 ? 4 : -4}deg` }}>
                  <div className="coin-sheen">
                    <CoinCard value={t.points} fluid />
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ height: 0 }}
                animate={inView ? { height: `${h}%` } : {}}
                transition={{ delay: i * 0.12, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                className={`w-full rounded-t-xl border-[3px] border-b-0 border-[var(--toon-ink)] flex flex-col items-center justify-start pt-2 px-1 relative ${top ? 'shadow-[0_0_30px_rgba(255,201,60,0.55)]' : ''}`}
                style={{ background: BAR_COLORS[i] }}
              >
                <span className="text-[11px] sm:text-[13px] font-extrabold text-[#1e293b] text-center leading-tight">
                  {t.max === Infinity ? `${t.min - 1}+` : `${t.min}–${t.max}`}
                </span>
                <span className="text-[10px] font-semibold text-[#1e293b]/70">стр.</span>
                {top && <Sparkles size={16} className="absolute -top-3 -right-2 text-[#f59e0b] sparkle" />}
              </motion.div>
            </div>
          )
        })}
      </div>
      <div className="h-[3px] rounded-full bg-[var(--toon-ink)]" />
    </div>
  )
}

/** Бонусы — тёмные карточки, иконки покачиваются при наведении. */
export function BonusCards() {
  return (
    <div className="toon-card !bg-[#1f2a5c] p-5 sm:p-6 h-full text-white">
      <h3 className="flex items-center gap-2.5 text-[18px] font-extrabold text-white">
        <Star size={20} className="text-[#ffc93c]" fill="#ffc93c" /> Бонусы
      </h3>
      <p className="text-[13px] text-white/60 mt-1">Покажи, что понял и умеешь рассказать</p>

      <div className="mt-5 space-y-3">
        {Object.values(BONUSES).map((b, i) => {
          const Icon = BONUS_ICONS[b.code]
          return (
            <motion.div
              key={b.code}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.03 }}
              className="hover-wiggle flex items-center gap-3 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/10 p-3.5 cursor-default transition-colors"
            >
              <div className="wiggle-target w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Icon size={22} className="text-[#ffc93c]" />
              </div>
              <span className="flex-1 text-[15px] font-medium leading-snug">
                {b.code === 'tedx'
                  ? <>Выступил на <span className="px-1.5 py-0.5 rounded bg-[#e62b1e] font-extrabold">TEDx</span></>
                  : b.title}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-[#ffc93c] text-[#1f2a5c] text-[16px] font-extrabold border-2 border-[#1f2a5c] shadow-[2px_2px_0_0_#0b1230]">
                +{b.points}
              </span>
            </motion.div>
          )
        })}
      </div>
      <p className="mt-5 text-[12px] text-white/55 leading-relaxed">
        Монеты за книгу и отзыв начисляет библиотекарь, когда примет отзыв.
        Видео и TEDx — по договорённости с библиотекарем.
      </p>
    </div>
  )
}

/** Калькулятор: двигаешь страницы и включаешь бонусы — видишь, сколько монет получишь. */
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

  return (
    <div className="toon-card p-5 sm:p-6 overflow-hidden">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-xl bg-[#ffc93c] border-2 border-[var(--toon-ink)] flex items-center justify-center">
          <Calculator size={18} className="text-[#1e293b]" />
        </div>
        <h3 className="text-[18px] font-extrabold text-[var(--color-text-primary)]">Сколько монет ты получишь?</h3>
      </div>
      <p className="text-[13px] text-[var(--color-text-secondary)] mb-5">Подвигай ползунок и включи бонусы</p>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">Страниц в книге</span>
            <span className="text-[28px] font-extrabold text-[var(--color-brand)] tabular-nums">{pages}</span>
          </div>
          <input
            type="range"
            min={50}
            max={800}
            step={10}
            value={pages}
            onChange={e => setPages(parseInt(e.target.value))}
            className="w-full accent-[var(--color-brand)] h-2 cursor-pointer"
            aria-label="Страниц в книге"
          />
          <div className="flex justify-between text-[11px] text-[var(--color-text-tertiary)] mt-1">
            <span>50</span><span>800</span>
          </div>
          {!tier && (
            <p className="mt-2 text-[12px] text-[var(--color-warning)]">Книги короче 100 страниц монет за объём не дают</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {Object.values(BONUSES).map(b => (
              <button
                key={b.code}
                onClick={() => setBonus(v => ({ ...v, [b.code]: !v[b.code] }))}
                className={`toon-btn px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors ${
                  bonus[b.code] ? 'bg-[#ffc93c] text-[#1e293b]' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]'
                }`}
              >
                {bonus[b.code] ? '✓ ' : '+ '}{b.short} +{b.points}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-bg-soft)] p-4 min-h-[190px] flex flex-col">
          <div className="flex flex-wrap gap-2 flex-1 content-start">
            <AnimatePresence mode="popLayout">
              {cards.map((c, i) => (
                <motion.div
                  key={c.key}
                  layout
                  initial={{ opacity: 0, scale: 0.5, rotate: -12, y: 20 }}
                  animate={{ opacity: 1, scale: 1, rotate: i % 2 ? 3 : -3, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: -10 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  className="text-center"
                >
                  <CoinCard value={c.value} size="sm" />
                  <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{c.label}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-end justify-between gap-3">
            <div>
              <div className="text-[12px] text-[var(--color-text-tertiary)]">Итого за одну книгу</div>
              <div className="text-[36px] font-extrabold leading-none text-[var(--color-text-primary)] tabular-nums">
                <AnimatedNumber value={total} /> <span className="text-[14px] font-semibold text-[var(--color-text-tertiary)]">монет</span>
              </div>
            </div>
            {nextPrize && total > 0 && (
              <div className="text-right text-[12px] text-[var(--color-text-secondary)] max-w-[150px]">
                До «{nextPrize.title}» — ещё <b>{Math.ceil((nextPrize.price - total) / Math.max(total, 1))}</b> таких книг
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Веер карточек-монет: при наведении раскрывается. */
export function CoinDeck() {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(600)
  const boxRef = useRef(null)
  const values = [5, 10, 15, 20, 25]

  // Ширина веера подстраивается под контейнер, чтобы карточки не вылезали на телефоне
  useEffect(() => {
    if (!boxRef.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [])
  const cardW = width < 420 ? 110 : 160
  const spread = Math.max(16, Math.min(118, (width - cardW) / (values.length - 1)))
  return (
    <div
      className="toon-card p-5 sm:p-6 flex flex-col md:flex-row items-center gap-6"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(v => !v)}
    >
      <div className="md:w-64 shrink-0">
        <h3 className="text-[18px] font-extrabold text-[var(--color-text-primary)]">Баллы приходят карточками</h3>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
          Каждая карточка — в твоей коллекции в профиле. Наведи, чтобы разложить колоду.
        </p>
      </div>
      <div ref={boxRef} className="relative flex-1 h-[150px] sm:h-[170px] w-full flex items-center justify-center">
        {values.map((v, i) => {
          const mid = (values.length - 1) / 2
          const offset = i - mid
          return (
            <motion.div
              key={v}
              className="absolute"
              animate={open
                ? { x: offset * spread, rotate: offset * 4, y: Math.abs(offset) * 6 }
                : { x: offset * Math.min(22, spread / 3), rotate: offset * 8, y: Math.abs(offset) * 4 }}
              whileHover={{ y: -18, scale: 1.08, zIndex: 10 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              style={{ zIndex: i }}
            >
              <div className="coin-sheen" style={{ animationDelay: `${i * 0.5}s` }}>
                <div style={{ width: cardW }}><CoinCard value={v} fluid /></div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function AnimatedNumber({ value }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    const dur = 350
    let raf
    const tick = now => {
      const t = Math.min(1, (now - start) / dur)
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
/* Призы — в «мультяшном» стиле: толстая обводка, сплошная тень        */
/* ------------------------------------------------------------------ */
export function PrizesPreview() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
      {PRIZES_PREVIEW.map((p, i) => (
        <motion.div
          key={p.code}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ delay: i * 0.06 }}
          className="toon-card toon-card-hover hover-wiggle p-4 sm:p-5 flex flex-col items-center text-center"
        >
          <div className="w-full aspect-square max-w-[180px] flex items-center justify-center mb-3">
            <img src={p.image} alt={p.title} className="wiggle-target w-full h-full" loading="lazy" />
          </div>
          <div className="text-[14px] sm:text-[17px] font-bold text-[var(--color-text-primary)] leading-tight min-h-[2.4em] flex items-center">
            {p.title}
          </div>
          <div className="toon-btn mt-3 px-4 py-1.5 rounded-xl bg-[#ffc93c] text-[#1e293b] text-[14px] font-extrabold">
            {p.price} баллов
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
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
            className={`toon-card p-3 text-center ${reached ? '!bg-[#fff6d6] dark:!bg-[#3a3416]' : ''}`}
          >
            <div className="text-[30px] leading-none mb-1">{l.emoji}</div>
            <div className="text-[13px] font-extrabold text-[var(--color-text-primary)]">{l.title}</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)]">
              {i === 0 ? 'старт' : `от ${l.min} баллов`}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export function AiWarning() {
  return (
    <div className="toon-card !bg-[#1f2a5c] text-white p-5 sm:p-6 flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-[#ffc93c] border-[3px] border-[#0b1230] flex items-center justify-center shrink-0">
        <Ban size={28} className="text-[#1f2a5c]" />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md bg-[#ffc93c] text-[#1f2a5c] text-[12px] font-extrabold tracking-widest">ВАЖНО</span>
          <span className="text-[17px] font-bold text-white">Только свои мысли!</span>
        </div>
        <p className="text-[14px] text-white/80">Если отзыв списан с ИИ, баллы не засчитываются.</p>
      </div>
    </div>
  )
}

// Совместимость со старыми импортами
export const PagesTable = PagesLadder
export const BonusList = BonusCards
