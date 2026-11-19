'use client'

/**
 * Лендинг: «Больше, чем чтение» — бенто-сетка из четырёх шагов
 * (прочитать → написать → снять видео → выступить на TEDx)
 * и витрина «Как это выглядит» с видео учеников и лентой обложек.
 */

import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Video, Mic } from 'lucide-react'
import { VideoCard, Player } from '../VideoGallery'

const NAVY = '#1f2a5c'
const BLUE = '#1a56db'
const GOLD = '#ffc93c'
const RED = '#e62b1e'
const EASE = [0.22, 1, 0.36, 1]

const tile = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: EASE } }
}

function Pill({ children, dark, gold }) {
  return (
    <span className={`inline-flex items-center text-[13px] font-semibold px-3 py-1.5 rounded-full ${
      gold ? 'bg-[#ffc93c] text-[#1f2a5c] font-bold' : dark ? 'bg-white/12 text-white' : 'bg-[#1f2a5c] text-[#ffc93c] font-bold'}`}>
      {children}
    </span>
  )
}

const Kicker = ({ children, color }) => (
  <span className="text-[13px] font-bold tracking-[0.14em]" style={{ color }}>{children}</span>
)

export function BeyondReading() {
  return (
    <section id="beyond" className="py-24 md:py-32 px-5 sm:px-6 scroll-mt-16">
      <div className="max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}
          className="text-[13px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand)] mb-5">
          Больше, чем чтение
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
          className="text-[36px] sm:text-[48px] md:text-[60px] font-bold tracking-[-0.035em] leading-[1.04] max-w-[980px] mb-12 md:mb-14">
          Книгу здесь не прочитывают и забывают.{' '}
          <span className="text-[var(--color-text-tertiary)]">Её осмысливают, объясняют на камеру и защищают перед залом.</span>
        </motion.h2>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <ReadTile />
          <WriteTile />
          <FilmTile />
          <SpeakTile />
          <SumTile />
        </motion.div>
      </div>
    </section>
  )
}

/* 01 · Прочитать — большая плитка */
function ReadTile() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [page, setPage] = useState(60)
  useEffect(() => {
    if (!inView) return
    const t = setInterval(() => setPage(p => (p >= 236 ? 60 : p + 2)), 260)
    return () => clearInterval(t)
  }, [inView])
  const spines = [
    { w: 46, h: 210, c: '#4f7df0', d: 0 },
    { w: 58, h: 250, c: GOLD, d: 0.4 },
    null,
    { w: 40, h: 190, c: '#e9eef8', d: 0.8 },
    { w: 52, h: 232, c: BLUE, d: 1.2 }
  ]
  return (
    <motion.div ref={ref} variants={tile}
      className="sm:col-span-2 lg:row-span-2 relative overflow-hidden rounded-[32px] p-7 sm:p-9 min-h-[520px] lg:min-h-[560px] flex flex-col text-white"
      style={{ background: NAVY }}>
      <div className="flex justify-between items-center">
        <Kicker color={GOLD}>01 · ПРОЧИТАТЬ</Kicker>
        <Pill dark>до +25 монет</Pill>
      </div>
      <div className="relative flex-1 flex items-center justify-center min-h-[280px]">
        <motion.div className="absolute w-[340px] h-[340px] rounded-full blur-[60px]" style={{ background: GOLD }}
          animate={{ opacity: [0.12, 0.22, 0.12] }} transition={{ duration: 5, repeat: Infinity }} />
        <div className="relative flex items-end gap-2.5 scale-[0.85] sm:scale-100">
          {spines.map((s, i) => s ? (
            <motion.div key={i} className="rounded-md" style={{ width: s.w, height: s.h, background: s.c }}
              initial={{ y: 40, opacity: 0 }} animate={inView ? { y: 0, opacity: 1 } : {}} transition={{ delay: 0.2 + i * 0.08, duration: 0.7, ease: EASE }} />
          ) : (
            <motion.div key={i}
              className="w-[150px] h-[224px] rounded-lg bg-[#fbf7ef] text-[#1f2a5c] p-[18px] box-border flex flex-col justify-between shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
              initial={{ y: 60, rotate: 0, opacity: 0 }}
              animate={inView ? { y: [0, -8, 0], rotate: -4, opacity: 1 } : {}}
              transition={{ y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }, rotate: { duration: 0.8, delay: 0.4 }, opacity: { duration: 0.5, delay: 0.4 } }}>
              <span className="text-[11px] font-bold tracking-[0.1em] text-[#1a56db]">ГЛАВА 7</span>
              <span className="text-[15px] font-bold leading-[1.25]">«Зорко одно лишь сердце»</span>
              <span className="text-[11px] text-[#5b6478] tabular-nums">стр. {page}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-[30px] sm:text-[34px] font-bold tracking-[-0.03em] mb-2.5">Сначала — книга.</h3>
        <p className="text-[16px] leading-[1.55] text-white/72 max-w-[420px] mb-5">Берёшь в школьной библиотеке и читаешь в своём темпе. Bookify напомнит о сроке и посчитает объём.</p>
        <div className="flex justify-between text-[13px] mb-2"><span className="text-white/70">Читаю сейчас</span><span className="font-bold tabular-nums">{page} / 240 стр.</span></div>
        <div className="h-2 rounded-full bg-white/12 overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: GOLD }} animate={{ width: `${page / 240 * 100}%` }} transition={{ duration: 0.25 }} />
        </div>
      </div>
    </motion.div>
  )
}

const REVIEW = 'Лис учит Принца: ты в ответе за тех, кого приручил. Я понял, что дружба — это время, которое ты отдаёшь другому человеку.'

/* 02 · Написать — отзыв печатается, потом штамп */
function WriteTile() {
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-80px' })
  const [len, setLen] = useState(0)
  const done = len >= REVIEW.length
  useEffect(() => {
    if (!inView) return
    let t
    if (done) t = setTimeout(() => setLen(0), 3500)
    else t = setTimeout(() => setLen(l => Math.min(REVIEW.length, l + 1 + Math.floor(Math.random() * 2))), 30 + Math.random() * 45)
    return () => clearTimeout(t)
  }, [inView, len, done])
  const words = Math.round(214 * len / REVIEW.length)

  return (
    <motion.div ref={ref} variants={tile}
      className="sm:col-span-2 relative overflow-hidden rounded-[32px] p-7 sm:p-9 min-h-[272px] flex flex-wrap gap-7 bg-[var(--color-brand-soft)]">
      <div className="flex-[1_1_220px] flex flex-col justify-between gap-4">
        <Kicker color={BLUE}>02 · НАПИСАТЬ</Kicker>
        <div>
          <h3 className="text-[28px] font-bold tracking-[-0.03em] mb-2">Потом — свои мысли.</h3>
          <p className="text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">Отзыв на 150–300 слов. Команда читает каждый сама.</p>
        </div>
        <span className="self-start"><Pill>+5 монет</Pill></span>
      </div>
      <div className="flex-[1_1_240px] relative rounded-[20px] p-[18px] bg-[var(--color-bg-card)] shadow-[0_20px_40px_-20px_rgba(31,42,92,0.35)]">
        <div className="text-[11px] font-bold tracking-[0.1em] text-[#1a56db] mb-2">МОЙ ОТЗЫВ</div>
        <p className="text-[14px] leading-[1.6] text-[var(--color-text-primary)]/85 min-h-[90px] mb-3.5">
          {REVIEW.slice(0, len)}
          {!done && <motion.span className="inline-block w-[2px] h-[15px] align-middle bg-[#1a56db] ml-0.5" animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} />}
        </p>
        <div className="flex justify-between text-[12px] mb-1.5">
          <span className="text-[var(--color-text-tertiary)]">Слов</span>
          <span className={`font-bold tabular-nums ${words >= 150 ? 'text-[#15803d]' : 'text-[var(--color-text-primary)]'}`}>{words} / 150–300</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${words / 350 * 100}%`, background: words >= 150 ? '#16a34a' : BLUE }} />
        </div>
        <motion.div
          initial={false}
          animate={done ? { scale: 1, opacity: 1, rotate: -9 } : { scale: 2.2, opacity: 0, rotate: -20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          className="absolute top-3.5 right-3.5 border-[3px] border-[#16a34a] text-[#15803d] rounded-lg px-2 py-0.5 text-[12px] font-extrabold tracking-[0.08em] bg-[var(--color-bg-card)]">
          ОДОБРЕНО
        </motion.div>
      </div>
    </motion.div>
  )
}

/* 03 · Снять — телефон с REC */
function FilmTile() {
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-80px' })
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!inView) return
    const t = setInterval(() => setSec(s => (s + 1) % 60), 1000)
    return () => clearInterval(t)
  }, [inView])
  return (
    <motion.div ref={ref} variants={tile}
      className="relative overflow-hidden rounded-[32px] p-7 min-h-[272px] flex flex-col justify-between text-white" style={{ background: BLUE }}>
      <div className="flex justify-between items-center"><Kicker color="#fff">03 · СНЯТЬ</Kicker><Pill gold>+10</Pill></div>
      <motion.div className="self-center w-[96px] h-[170px] rounded-[22px] bg-[#0e1433] p-[5px] box-border shadow-[0_24px_40px_-16px_rgba(0,0,0,0.6)] my-3"
        animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="relative w-full h-full rounded-[17px] bg-[#2c3d8f] overflow-hidden">
          <div className="absolute top-2.5 left-2 flex items-center gap-1 text-[9px] font-bold tabular-nums">
            <motion.span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30]" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            REC 00:{String(sec).padStart(2, '0')}
          </div>
          <motion.div className="absolute inset-x-0 bottom-0 h-[118px]" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.2, repeat: Infinity }}>
            <div className="absolute left-1/2 top-0 -ml-[17px] w-[34px] h-[34px] rounded-full bg-[#f1c7a0]" />
            <div className="absolute left-3.5 right-3.5 bottom-0 h-[58px] rounded-t-[40px] bg-[#e9eef8]" />
            <motion.div className="absolute left-[18px] bottom-[22px] w-[26px] h-[34px] rounded" style={{ background: GOLD }}
              animate={{ rotate: [-14, -4, -14] }} transition={{ duration: 2.6, repeat: Infinity }} />
          </motion.div>
          <div className="absolute inset-x-3 bottom-2 h-3 flex items-end justify-center gap-[2px]">
            {[...Array(10)].map((_, i) => (
              <motion.span key={i} className="w-[2px] rounded-full bg-white/80" animate={{ height: [2, 4 + (i * 5) % 9, 2] }}
                transition={{ duration: 0.5 + (i % 4) * 0.12, repeat: Infinity, delay: i * 0.05 }} />
            ))}
          </div>
        </div>
      </motion.div>
      <div className="text-[18px] font-bold tracking-[-0.02em] leading-snug">Расскажи так, чтобы захотели прочитать.</div>
    </motion.div>
  )
}

/* 04 · Выступить — сцена TEDx */
function SpeakTile() {
  return (
    <motion.div variants={tile}
      className="relative overflow-hidden rounded-[32px] p-7 min-h-[272px] flex flex-col justify-between text-white bg-[#07091a]">
      <div className="flex justify-between items-center"><Kicker color={GOLD}>04 · ВЫСТУПИТЬ</Kicker><Pill gold>+15</Pill></div>
      <div className="relative h-[120px] my-3">
        <motion.div className="absolute left-1/2 -top-10 w-[180px] h-[170px] -ml-[90px] origin-top"
          style={{ background: 'linear-gradient(180deg, rgba(255,240,200,0.38), rgba(255,240,200,0))', clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)' }}
          animate={{ rotate: [-8, 8, -8] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="absolute inset-x-0 top-0 text-center text-[44px] font-extrabold tracking-[-0.04em]" style={{ color: RED, textShadow: `0 0 30px ${RED}66` }}>TEDx</div>
        <div className="absolute left-1/2 bottom-1 w-[120px] h-[30px] -ml-[60px] rounded-[50%]" style={{ background: RED }} />
        <motion.div className="absolute left-1/2 bottom-[18px] w-4 h-10 -ml-2 rounded-t-lg bg-[#e9eef8] origin-bottom"
          animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 2.4, repeat: Infinity }} />
      </div>
      <div className="text-[18px] font-bold tracking-[-0.02em] leading-snug">Идея книги — своими словами, перед залом.</div>
    </motion.div>
  )
}

/* Итог */
function SumTile() {
  const steps = ['Прочитал', 'Написал', 'Снял', 'Выступил']
  return (
    <motion.div variants={tile}
      className="sm:col-span-2 lg:col-span-4 rounded-[32px] border border-[var(--color-border)] px-7 sm:px-9 py-7 flex flex-wrap items-center justify-between gap-5">
      <div className="flex flex-wrap items-center gap-3 text-[16px] font-semibold text-[var(--color-text-secondary)]">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-3">
            {i > 0 && <span className="text-[var(--color-text-tertiary)]">→</span>}
            <motion.span initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.15 }}>{s}</motion.span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <motion.span className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[15px] font-extrabold text-[#7a5200]"
          style={{ background: `radial-gradient(circle at 35% 30%, #fff3c4, ${GOLD} 55%, #e0a800)` }}
          animate={{ rotateY: [0, 360] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}>B</motion.span>
        <span className="text-[22px] font-bold tracking-[-0.02em]">до 55 монет с одной книги</span>
      </div>
    </motion.div>
  )
}

/* ------------------------------ Витрина ------------------------------ */

export function StudentShowcase() {
  const [data, setData] = useState(null)
  const [playing, setPlaying] = useState(null)
  useEffect(() => {
    fetch('/api/public/videos').then(r => r.json()).then(setData).catch(() => setData({ items: [], covers: [] }))
  }, [])
  const items = data?.items || []
  const sub = v => [v.class_name ? `Ученик ${v.class_name}` : null, v.book_title && v.title ? `«${v.book_title}»` : null].filter(Boolean).join(' · ') || 'Ученик DLS'

  return (
    <section id="showcase" className="relative py-24 md:py-32 scroll-mt-16 overflow-hidden" style={{ background: `linear-gradient(180deg, ${NAVY}, #0e1433)` }}>
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl opacity-25" style={{ background: BLUE }} />
      <div className="relative max-w-[1200px] mx-auto px-5 sm:px-6 text-white">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12 md:mb-16">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }}>
            <div className="text-[13px] font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: GOLD }}>Как это выглядит</div>
            <h2 className="text-[36px] sm:text-[48px] md:text-[60px] font-semibold tracking-[-0.03em] leading-[1.02]">Ученики рассказывают<br className="hidden sm:block" /> о книгах сами.</h2>
          </motion.div>
          {data && (data.videos > 0 || data.talks > 0) && (
            <div className="flex gap-3">
              <ShowcaseStat icon={Video} value={data.videos} label="видео о книгах" />
              <ShowcaseStat icon={Mic} value={data.talks} label="выступлений TEDx" />
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0 pb-2 no-scrollbar">
            {items.map((v, i) => (
              <div key={v.id} className="snap-start shrink-0 w-[68%] sm:w-[44%] md:w-auto"><VideoCard v={v} i={i} onPlay={() => setPlaying(v)} sub={sub(v)} /></div>
            ))}
          </div>
        )}
      </div>

      {data && items.length === 0 && <ShowcaseSoon covers={data.covers || []} />}
      <Player v={playing} onClose={() => setPlaying(null)} />
    </section>
  )
}

function ShowcaseStat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-2xl bg-white/8 border border-white/12 backdrop-blur px-4 py-3 min-w-[130px]">
      <div className="flex items-center gap-2 text-[26px] font-semibold tracking-tight tabular-nums"><Icon size={18} style={{ color: GOLD }} /> {value}</div>
      <div className="text-[12px] text-white/60">{label}</div>
    </div>
  )
}

/** Пока видео не отмечены «На главную»: живая лента настоящих обложек из каталога. */
function ShowcaseSoon({ covers }) {
  const list = covers.length ? covers : []
  const half = Math.ceil(list.length / 2)
  const rows = [list.slice(0, half), list.slice(half)]
  return (
    <div className="relative">
      {list.length > 0 && (
        <div className="space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          {rows.map((row, r) => (
            <div key={r} className="overflow-hidden">
              <div className={`flex w-max gap-4 ${r ? 'animate-[marquee_46s_linear_infinite_reverse]' : 'animate-[marquee_40s_linear_infinite]'} motion-reduce:animate-none`}>
                {[...row, ...row].map((b, i) => (
                  <div key={i} className="relative shrink-0 w-[120px] md:w-[150px] aspect-[2/3] rounded-xl overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.cover_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
