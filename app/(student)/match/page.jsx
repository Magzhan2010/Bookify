'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { toast } from 'sonner'
import { Heart, X, Sparkles, Users, Star, RotateCcw, BookOpen, ArrowRight } from 'lucide-react'
import { useT } from '../../../lib/i18n'

/**
 * «Подбор книг» — листай карточки: вправо «хочу прочитать» (в избранное), влево «не моё».
 * Каждые 10 карточек — твой вкус по жанрам и лучшая находка.
 */
const SEEN_KEY = 'bookify:match-seen'
const ROUND = 10

function loadSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') } catch { return [] }
}
function saveSeen(ids) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-500))) } catch {}
}

export default function MatchPage() {
  const { t } = useT()
  const [deck, setDeck] = useState(null)
  const [round, setRound] = useState([]) // [{book, liked}]
  const [summary, setSummary] = useState(null)
  const [empty, setEmpty] = useState(false)

  const load = useCallback(async () => {
    try {
      const seen = loadSeen()
      const res = await fetch(`/api/books/match?seen=${seen.join(',')}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setDeck(d.books)
      setEmpty(d.books.length === 0)
    } catch (e) { toast.error(e.message); setDeck([]) }
  }, [])
  useEffect(() => { load() }, [load])

  const decide = useCallback(async (book, liked) => {
    saveSeen([...loadSeen(), book.id])
    setDeck(d => d.filter(x => x.id !== book.id))
    if (liked) {
      fetch('/api/favorites', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id })
      }).catch(() => {})
    }
    setRound(r => {
      const next = [...r, { book, liked }]
      if (next.length >= ROUND) { setSummary(next); return [] }
      return next
    })
  }, [])

  useEffect(() => {
    if (deck && deck.length < 3 && !empty && !summary) load()
  }, [deck, empty, summary, load])

  useEffect(() => {
    const onKey = e => {
      if (summary || !deck?.length) return
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'ArrowRight') decide(deck[0], true)
      if (e.key === 'ArrowLeft') decide(deck[0], false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck, summary, decide])

  const restart = () => { saveSeen([]); setEmpty(false); setDeck(null); load() }

  return (
    <main className="max-w-[560px] mx-auto px-4 pt-8 pb-28">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-[12px] font-semibold mb-3">
          <Sparkles size={13} /> {t('Подбор книг')}
        </div>
        <h1 className="text-[30px] sm:text-[36px] font-extrabold tracking-tight text-[var(--color-text-primary)]">{t('Что почитать дальше?')}</h1>
        <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">{t('Вправо — хочу прочитать, влево — не моё')}</p>
      </div>

      <div className="flex justify-center gap-1.5 mb-5" aria-label={`${round.length} из ${ROUND}`}>
        {Array.from({ length: ROUND }).map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i < round.length ? (round[i].liked ? 'w-6 bg-[var(--color-success)]' : 'w-6 bg-[var(--color-text-tertiary)]/50') : 'w-3 bg-[var(--color-border)]'}`} />
        ))}
      </div>

      {summary ? (
        <Summary items={summary} onNext={() => { setSummary(null) }} t={t} />
      ) : deck === null ? (
        <div className="mx-auto w-full max-w-[360px] aspect-[3/4.4] rounded-[28px] bg-[var(--color-bg-soft)] animate-pulse" />
      ) : empty || deck.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-[28px] border border-dashed border-[var(--color-border)]">
          <BookOpen size={32} className="mx-auto mb-3 text-[var(--color-text-tertiary)]" />
          <p className="font-semibold text-[var(--color-text-primary)]">{t('Ты пролистал весь каталог!')}</p>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1 mb-4">{t('Загляни в избранное — там всё, что тебе понравилось')}</p>
          <div className="flex justify-center gap-2">
            <Link href="/profile" className="px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white text-[14px] font-medium">{t('Избранное')}</Link>
            <button onClick={restart} className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-soft)] text-[14px] font-medium flex items-center gap-1.5"><RotateCcw size={14} /> {t('Начать заново')}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mx-auto w-full max-w-[360px] aspect-[3/4.4]">
            <AnimatePresence>
              {deck.slice(0, 3).reverse().map((b, i, arr) => (
                <Card key={b.id} book={b} top={i === arr.length - 1} depth={arr.length - 1 - i} onDecide={decide} t={t} />
              ))}
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-center gap-5 mt-6">
            <button onClick={() => decide(deck[0], false)} aria-label={t('Не моё')}
              className="w-16 h-16 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-[var(--shadow-soft)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] active:scale-90 transition-all">
              <X size={28} />
            </button>
            <Link href={`/books/${deck[0].id}`} aria-label={t('Подробнее о книге')}
              className="w-12 h-12 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-brand)]">
              <BookOpen size={18} />
            </Link>
            <button onClick={() => decide(deck[0], true)} aria-label={t('Хочу прочитать')}
              className="w-16 h-16 rounded-full bg-[#ff2d55] shadow-[0_10px_30px_rgba(255,45,85,0.35)] flex items-center justify-center text-white active:scale-90 transition-all">
              <Heart size={28} fill="currentColor" />
            </button>
          </div>
          <p className="text-center text-[12px] text-[var(--color-text-tertiary)] mt-4 hidden sm:block">{t('Можно стрелками ← →')}</p>
        </>
      )}
    </main>
  )
}

function Card({ book, top, depth, onDecide, t }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-14, 14])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const nopeOpacity = useTransform(x, [-120, -30], [1, 0])

  const onDragEnd = (_, info) => {
    const v = info.offset.x + info.velocity.x * 0.2
    if (v > 120) animate(x, 600, { duration: 0.25 }).then(() => onDecide(book, true))
    else if (v < -120) animate(x, -600, { duration: 0.25 }).then(() => onDecide(book, false))
    else animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
  }

  return (
    <motion.div
      className="absolute inset-0 rounded-[28px] overflow-hidden bg-[var(--color-bg-soft)] shadow-[0_20px_50px_rgba(15,23,42,0.18)] select-none touch-none"
      style={{ x: top ? x : 0, rotate: top ? rotate : 0, zIndex: 10 - depth }}
      initial={{ scale: 0.92, y: 18, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.04, y: depth * 14, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      drag={top ? 'x' : false}
      dragElastic={0.9}
      onDragEnd={top ? onDragEnd : undefined}
    >
      <img src={book.cover_url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
      {top && (
        <>
          <motion.div style={{ opacity: likeOpacity }} className="absolute top-6 left-5 px-3 py-1.5 rounded-xl border-[3px] border-[#34c759] text-[#34c759] text-[22px] font-black -rotate-12 bg-black/20">{t('ХОЧУ')}</motion.div>
          <motion.div style={{ opacity: nopeOpacity }} className="absolute top-6 right-5 px-3 py-1.5 rounded-xl border-[3px] border-white/80 text-white text-[22px] font-black rotate-12 bg-black/20">{t('НЕ МОЁ')}</motion.div>
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 p-5 text-white pointer-events-none">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {book.for_you && <span className="px-2 py-0.5 rounded-full bg-[#ffc93c] text-[#1f2a5c] text-[11px] font-bold">{t('Для тебя')}</span>}
          {book.genre && <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-[11px] font-semibold">{book.genre.split(' / ')[0]}</span>}
          {book.pages ? <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-[11px] font-semibold">{book.pages} {t('стр.')}</span> : null}
        </div>
        <div className="text-[24px] font-extrabold leading-tight line-clamp-2">{book.title}</div>
        <div className="text-[14px] text-white/80 mb-2">{book.author}</div>
        {book.description && <p className="text-[13px] text-white/75 line-clamp-3 leading-snug">{book.description}</p>}
        <div className="flex items-center gap-3 mt-3 text-[12px] text-white/80">
          {book.readers > 0 && <span className="flex items-center gap-1"><Users size={12} /> {t('прочитали {n}', { n: book.readers })}</span>}
          {book.rating > 0 && <span className="flex items-center gap-1"><Star size={12} fill="currentColor" /> {book.rating}</span>}
          <span>{book.available_copies > 0 ? t('есть в библиотеке') : t('сейчас все на руках')}</span>
        </div>
      </div>
    </motion.div>
  )
}

function Summary({ items, onNext, t }) {
  const liked = items.filter(i => i.liked).map(i => i.book)
  const genres = {}
  liked.forEach(b => { const g = (b.genre || '').split(' / ')[0]; if (g) genres[g] = (genres[g] || 0) + 1 })
  const top = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const best = liked.find(b => b.available_copies > 0) || liked[0]
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-[28px] bg-[#1f2a5c] text-white p-6 sm:p-8 text-center">
      <Sparkles size={28} className="mx-auto text-[#ffc93c] mb-2" />
      <div className="text-[13px] uppercase tracking-[0.15em] text-white/60 font-semibold">{t('Твой вкус')}</div>
      <div className="text-[30px] font-extrabold mt-1">{liked.length ? t('{n} из 10 — хочу!', { n: liked.length }) : t('Пока ничего не зацепило')}</div>
      {top.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {top.map(([g, n]) => <span key={g} className="px-3 py-1 rounded-full bg-white/12 text-[13px] font-semibold">{g} · {n}</span>)}
        </div>
      )}
      {best && (
        <Link href={`/books/${best.id}`} className="mt-6 flex items-center gap-3 p-3 rounded-2xl bg-white text-left text-[#1f2a5c] hover:opacity-95">
          {best.cover_url && <img src={best.cover_url} alt="" className="w-12 h-16 rounded-lg object-cover" />}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-[#c97a00] uppercase tracking-wider">{t('Лучшая находка')}</div>
            <div className="font-bold truncate">{best.title}</div>
            <div className="text-[12px] text-[#5b6478] truncate">{best.available_copies > 0 ? t('Можно забрать сегодня') : best.author}</div>
          </div>
          <ArrowRight size={18} />
        </Link>
      )}
      <div className="flex justify-center gap-2 mt-6">
        <button onClick={onNext} className="px-5 py-3 rounded-xl bg-[#ffc93c] text-[#1f2a5c] font-bold text-[14px]">{t('Ещё 10 книг')}</button>
        {liked.length > 0 && <Link href="/profile" className="px-5 py-3 rounded-xl bg-white/12 font-semibold text-[14px]">{t('Избранное')}</Link>}
      </div>
    </motion.div>
  )
}
