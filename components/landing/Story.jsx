'use client'

/**
 * Лендинг: «Больше, чем чтение» — история одной книги в четырёх живых сценах
 * (прочитать → написать → объяснить на видео → выступить на TEDx)
 * и витрина «Как это выглядит» с видео учеников.
 */

import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { BookOpen, PenLine, Video, Mic, Play, Flame, Check } from 'lucide-react'
import { VideoCard, Player } from '../VideoGallery'

const NAVY = '#1f2a5c'
const BLUE = '#1a56db'
const GOLD = '#ffc93c'
const RED = '#e62b1e'
const EASE = [0.22, 1, 0.36, 1]

/** Тикает, пока сцена на экране. */
function useTick(ms, active) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setN(x => x + 1), ms)
    return () => clearInterval(t)
  }, [ms, active])
  return n
}

function Coin({ size = 18 }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full font-black text-[#7a5200] shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]"
      style={{ width: size, height: size, fontSize: size * 0.5, background: `radial-gradient(circle at 35% 30%, #fff3c4, ${GOLD} 55%, #e0a800)` }}>B</span>
  )
}

/** Плашка «+N монет», которая выпрыгивает, когда шаг выполнен. */
function RewardPop({ show, text, className = '' }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className={`absolute z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#1f2a5c] text-[13px] font-bold shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${className}`}
        >
          <Coin /> {text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------ Сцены ------------------------------ */

/** 1. Объёмная книга с настоящими обложками из каталога; книги сменяют друг друга, страницы считаются. */
function ReadScene({ active, covers = [] }) {
  const tick = useTick(3600, active)
  const list = covers.length ? covers : [null]
  const idx = tick % list.length
  const cover = list[idx]?.cover_url
  const pages = useTick(450, active)
  const page = 40 + (pages % 40) * 5

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[32px]" style={{ background: `radial-gradient(120% 80% at 50% 0%, #2c3d8f, ${NAVY} 55%, #0e1433)` }}>
      <div className="absolute left-1/2 top-[18%] -translate-x-1/2 w-[60%] h-[50%] rounded-full blur-3xl opacity-30" style={{ background: GOLD }} />
      {[...Array(12)].map((_, i) => (
        <motion.span key={i} className="absolute w-1 h-1 rounded-full bg-white/40"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 85}%` }}
          animate={active ? { y: [0, -18, 0], opacity: [0.1, 0.6, 0.1] } : {}}
          transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: i * 0.3 }} />
      ))}

      <motion.div className="absolute top-[7%] right-[7%] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-white text-[12px] font-semibold border border-white/15"
        animate={active ? { y: [0, -5, 0] } : {}} transition={{ duration: 3, repeat: Infinity }}>
        <Flame size={13} className="text-[#ff7a3d]" /> Серия 5 дней
      </motion.div>

      {/* книга */}
      <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 h-[56%] aspect-[2/3]" style={{ perspective: 1400 }}>
        <motion.div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}
          animate={active ? { rotateY: [-24, -12, -24], rotateX: [4, 1, 4] } : { rotateY: -18 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
          {/* обрез страниц справа */}
          <div className="absolute top-[2%] bottom-[2%] -right-[5%] w-[8%] rounded-r-[4px]"
            style={{ background: 'repeating-linear-gradient(180deg,#fbf7ef 0 2px,#e6dfd0 2px 3px)', transform: 'translateZ(-6px)', boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.15)' }} />
          <AnimatePresence mode="popLayout">
            <motion.div key={idx} className="absolute inset-0 rounded-[6px] overflow-hidden shadow-[0_40px_70px_-20px_rgba(0,0,0,0.75)]"
              style={{ transformOrigin: 'left center', background: `linear-gradient(160deg, ${BLUE}, ${NAVY})` }}
              initial={{ rotateY: 70, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -70, opacity: 0 }}
              transition={{ duration: 0.8, ease: EASE }}>
              {cover
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={cover} alt="" className="w-full h-full object-cover" />
                : <BookOpen className="absolute inset-0 m-auto text-white/50" size={48} />}
              {/* корешок и блик */}
              <div className="absolute inset-y-0 left-0 w-[9%] bg-gradient-to-r from-black/35 via-white/15 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/20" />
            </motion.div>
          </AnimatePresence>
        </motion.div>
        <div className="absolute -bottom-[7%] left-[8%] right-[2%] h-[6%] rounded-[50%] bg-black/50 blur-md" />
      </div>

      <div className="absolute inset-x-[10%] bottom-[8%]">
        <div className="flex items-baseline justify-between text-white mb-2">
          <span className="text-[13px] text-white/60">Читаю сейчас</span>
          <span className="text-[22px] font-semibold tabular-nums">стр. {page} <span className="text-white/40 text-[15px]">/ 240</span></span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${BLUE}, ${GOLD})` }}
            animate={{ width: `${page / 240 * 100}%` }} transition={{ duration: 0.4, ease: EASE }} />
        </div>
      </div>
    </div>
  )
}

const REVIEW = 'Эта книга о том, что главное глазами не увидишь. Лис учит Принца: ты в ответе за тех, кого приручил. Я понял, что дружба — это время, которое ты отдаёшь другому человеку.'

/** 2. Отзыв печатается, счётчик слов растёт, потом — штамп «Одобрено». */
function WriteScene({ active }) {
  const [len, setLen] = useState(0)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!active) return
    let n = 0, t
    const step = () => {
      n += 1 + Math.floor(Math.random() * 2)
      if (n >= REVIEW.length) {
        setLen(REVIEW.length); setDone(true)
        t = setTimeout(() => { n = 0; setDone(false); setLen(0); t = setTimeout(step, 400) }, 3200)
        return
      }
      setLen(n)
      t = setTimeout(step, 28 + Math.random() * 40)
    }
    t = setTimeout(step, 500)
    return () => clearTimeout(t)
  }, [active])
  const words = Math.round(214 * len / REVIEW.length)

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[32px] bg-gradient-to-br from-[#eef3ff] to-[#dfe8ff] dark:from-[#18213f] dark:to-[#0f1630]">
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl opacity-50" style={{ background: BLUE }} />
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[82%] max-w-[380px] rounded-[24px] bg-white dark:bg-[#1c2647] shadow-[0_30px_60px_-20px_rgba(31,42,92,0.45)] p-5"
        animate={active ? { rotate: [-1, 1, -1] } : {}} transition={{ duration: 8, repeat: Infinity }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-14 rounded-md shadow-md flex items-end p-1" style={{ background: 'linear-gradient(160deg,#f6c453,#e0732f)' }}>
            <span className="text-[6px] font-bold text-white leading-none">Маленький принц</span>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#1a56db]">Мой отзыв</div>
            <div className="text-[15px] font-semibold text-[#1f2a5c] dark:text-white">«Маленький принц»</div>
          </div>
        </div>
        <p className="text-[14px] leading-[1.6] text-[#1f2a5c]/85 dark:text-white/85 min-h-[110px]">
          {REVIEW.slice(0, len)}
          {!done && <motion.span className="inline-block w-[2px] h-[16px] align-middle bg-[#1a56db] ml-0.5" animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} />}
        </p>
        <div className="mt-4">
          <div className="flex justify-between text-[12px] mb-1.5">
            <span className="text-[#1f2a5c]/60 dark:text-white/60">Слов</span>
            <span className={`font-semibold tabular-nums ${words >= 150 ? 'text-[#16a34a]' : 'text-[#1f2a5c] dark:text-white'}`}>{words} / 150–300</span>
          </div>
          <div className="relative h-2 rounded-full bg-[#1f2a5c]/8 dark:bg-white/10 overflow-hidden">
            <div className="absolute inset-y-0 bg-[#16a34a]/15" style={{ left: `${150 / 350 * 100}%`, width: `${150 / 350 * 100}%` }} />
            <motion.div className="relative h-full rounded-full" style={{ background: words >= 150 ? '#16a34a' : BLUE }} animate={{ width: `${words / 350 * 100}%` }} transition={{ duration: 0.2 }} />
          </div>
        </div>
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ scale: 2.4, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              className="absolute right-4 top-4 px-3 py-1.5 rounded-lg border-[3px] border-[#16a34a] text-[#16a34a] text-[13px] font-black uppercase tracking-wider bg-white/90 dark:bg-[#1c2647]/90 flex items-center gap-1"
            >
              <Check size={14} strokeWidth={3} /> Одобрено
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <RewardPop show={done} text="+5 за отзыв" className="left-1/2 -translate-x-1/2 bottom-[7%]" />
    </div>
  )
}

const CAPTIONS = ['Сегодня расскажу про книгу,', 'которая поменяла моё мнение', 'о дружбе. Вот три мысли…']

/** 3. Телефон снимает видео: REC, таймер, звук, субтитры. */
function FilmScene({ active }) {
  const sec = useTick(1000, active)
  const s = sec % 60
  const cap = Math.floor(sec / 2) % CAPTIONS.length
  return (
    <div className="relative w-full h-full overflow-hidden rounded-[32px]" style={{ background: `linear-gradient(160deg, ${BLUE}, ${NAVY} 60%, #0e1433)` }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="absolute rounded-full blur-2xl"
          style={{ width: 160, height: 160, background: [GOLD, '#ff6bb5', '#4fd1c5'][i], opacity: 0.25, left: `${[10, 60, 30][i]}%`, top: `${[15, 30, 65][i]}%` }}
          animate={active ? { x: [0, 30, -20, 0], y: [0, -20, 20, 0] } : {}} transition={{ duration: 10 + i * 2, repeat: Infinity }} />
      ))}

      {/* телефон */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[84%] aspect-[9/17.5] rounded-[34px] bg-black p-[7px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]"
        animate={active ? { rotate: [-2, 2, -2], y: [0, -8, 0] } : {}} transition={{ duration: 6, repeat: Infinity }}
      >
        <div className="relative w-full h-full rounded-[28px] overflow-hidden" style={{ background: 'linear-gradient(180deg,#3a4a8c,#1b2450 70%)' }}>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-black z-10" />
          {/* «человек» в кадре с книгой */}
          <div className="absolute inset-x-0 bottom-0 h-[72%] flex justify-center">
            <motion.div className="relative w-[70%] h-full" animate={active ? { y: [0, -4, 0] } : {}} transition={{ duration: 2.2, repeat: Infinity }}>
              <div className="absolute left-1/2 top-[6%] -translate-x-1/2 w-[38%] aspect-square rounded-full bg-[#f1c7a0]" />
              <div className="absolute left-1/2 top-[3%] -translate-x-1/2 w-[42%] h-[18%] rounded-t-full bg-[#2b1d14]" />
              <div className="absolute inset-x-0 bottom-0 h-[58%] rounded-t-[48%] bg-[#e9eef8]" />
              <motion.div className="absolute left-[18%] bottom-[24%] w-[34%] aspect-[3/4] rounded-md shadow-xl"
                style={{ background: 'linear-gradient(160deg,#f6c453,#e0732f)' }}
                animate={active ? { rotate: [-12, -4, -12] } : {}} transition={{ duration: 2.6, repeat: Infinity }} />
            </motion.div>
          </div>
          {/* REC + таймер */}
          <div className="absolute top-8 left-3 right-3 flex items-center justify-between text-white text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur">
              <motion.span className="w-2 h-2 rounded-full bg-[#ff3b30]" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
              REC
            </span>
            <span className="px-2 py-1 rounded-full bg-black/40 backdrop-blur tabular-nums">00:{String(s).padStart(2, '0')}</span>
          </div>
          {/* субтитры */}
          <div className="absolute inset-x-3 bottom-14 text-center">
            <AnimatePresence mode="wait">
              <motion.span key={cap} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="inline-block px-2 py-1 rounded-md bg-black/55 text-white text-[11px] font-semibold leading-tight">
                {CAPTIONS[cap]}
              </motion.span>
            </AnimatePresence>
          </div>
          {/* звук */}
          <div className="absolute inset-x-6 bottom-5 h-6 flex items-center justify-center gap-[3px]">
            {[...Array(18)].map((_, i) => (
              <motion.span key={i} className="w-[3px] rounded-full bg-white/80"
                animate={active ? { height: [4, 6 + ((i * 7) % 16), 4] } : { height: 4 }}
                transition={{ duration: 0.5 + (i % 5) * 0.12, repeat: Infinity, delay: i * 0.04 }} />
            ))}
          </div>
        </div>
      </motion.div>
      <RewardPop show={active && s % 8 > 4} text="+10 за видео" className="right-[8%] top-[12%]" />
    </div>
  )
}

/** 4. Сцена TEDx: прожектор, красный ковёр, зал аплодирует. */
function SpeakScene({ active }) {
  const claps = useTick(700, active)
  return (
    <div className="relative w-full h-full overflow-hidden rounded-[32px] bg-[#07091a]">
      {/* буквы на заднике */}
      <div className="absolute inset-x-0 top-[12%] text-center select-none">
        <span className="text-[56px] sm:text-[72px] font-black tracking-tight" style={{ color: RED, textShadow: `0 0 40px ${RED}88` }}>TEDx</span>
        <span className="text-[22px] sm:text-[28px] font-bold text-white/90 ml-2 align-top">DLS</span>
      </div>
      {/* прожектор */}
      <motion.div
        className="absolute left-1/2 -top-[10%] w-[70%] h-[95%] origin-top"
        style={{ x: '-50%', background: 'linear-gradient(180deg, rgba(255,240,200,0.45), rgba(255,240,200,0.06) 75%, transparent)', clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)' }}
        animate={active ? { rotate: [-6, 6, -6] } : {}} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* красный круглый ковёр */}
      <div className="absolute left-1/2 bottom-[24%] -translate-x-1/2 w-[46%] aspect-[3/0.9] rounded-[50%]"
        style={{ background: `radial-gradient(ellipse at 50% 40%, #ff5a4a, ${RED} 55%, #8f1209)`, boxShadow: `0 0 60px ${RED}66` }} />
      {/* спикер */}
      <motion.div className="absolute left-1/2 bottom-[30%] -translate-x-1/2 w-[12%] aspect-[1/2.6]"
        animate={active ? { rotate: [-3, 3, -3] } : {}} transition={{ duration: 2.4, repeat: Infinity }} style={{ transformOrigin: 'bottom center' }}>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[55%] aspect-square rounded-full bg-[#f1c7a0]" />
        <div className="absolute inset-x-0 top-[22%] bottom-0 rounded-t-[40%] bg-[#e9eef8]" />
        <motion.div className="absolute -right-[55%] top-[30%] w-[70%] h-[10%] rounded-full bg-[#e9eef8] origin-left"
          animate={active ? { rotate: [-30, -60, -30] } : {}} transition={{ duration: 1.6, repeat: Infinity }} />
      </motion.div>
      {/* зал */}
      <div className="absolute inset-x-0 bottom-0 h-[24%]">
        {[0, 1].map(row => (
          <div key={row} className="absolute inset-x-0 flex justify-center gap-[3%]" style={{ bottom: row ? '-8%' : '38%', opacity: row ? 1 : 0.7 }}>
            {[...Array(row ? 9 : 11)].map((_, i) => (
              <motion.span key={i} className="rounded-t-full bg-[#141a3a]" style={{ width: row ? '8%' : '6%', aspectRatio: '1/1.1' }}
                animate={active ? { y: [0, -(i % 3) - 2, 0] } : {}} transition={{ duration: 0.5, repeat: Infinity, delay: (i * 0.13) % 0.6 }} />
            ))}
          </div>
        ))}
      </div>
      {/* аплодисменты */}
      <AnimatePresence>
        {active && (
          <motion.span key={claps} className="absolute text-[22px]"
            style={{ left: `${15 + ((claps * 29) % 70)}%`, bottom: '18%' }}
            initial={{ opacity: 0, y: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 0], y: -120, scale: 1.1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.8 }}>
            👏
          </motion.span>
        )}
      </AnimatePresence>
      <RewardPop show={active && claps % 10 > 5} text="+15 за TEDx" className="left-[8%] top-[8%]" />
    </div>
  )
}

/* ------------------------------ История ------------------------------ */

const STEPS = [
  { icon: BookOpen, verb: 'Прочитать', title: 'Сначала — книга.', text: 'Берёшь в школьной библиотеке и читаешь в своём темпе. Bookify напомнит о сроке, а за объём книги начислит монеты.', reward: 'до +25 за объём', Scene: ReadScene },
  { icon: PenLine, verb: 'Написать', title: 'Потом — свои мысли.', text: 'Отзыв на 150–300 слов: главная идея, твоё мнение, примеры и выводы. Команда проверяет каждый отзыв сама.', reward: '+5 за отзыв', Scene: WriteScene },
  { icon: Video, verb: 'Объяснить', title: 'Расскажи так, чтобы захотели прочитать.', text: 'Короткое видео о книге на телефон. Команда добавляет его в твой профиль — а лучшие попадают на эту страницу.', reward: '+10 за видео', Scene: FilmScene },
  { icon: Mic, verb: 'Выступить', title: 'И наконец — сцена.', text: 'TEDx перед живым залом: идея книги своими словами. Самый смелый шаг — и тот, что запоминается надолго.', reward: '+15 за TEDx', Scene: SpeakScene }
]

const MANIFESTO = 'Здесь книгу не прочитывают и забывают. Её осмысливают в отзыве, объясняют на камеру и защищают перед залом.'

export function BeyondReading() {
  const words = MANIFESTO.split(' ')
  const text = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: text, offset: ['start 85%', 'end 45%'] })

  return (
    <section id="beyond" className="pt-24 md:pt-36 px-5 sm:px-6 scroll-mt-16">
      <div className="max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}
          className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand)] mb-6">
          Больше, чем чтение
        </motion.div>
        <p ref={text} className="text-[32px] sm:text-[46px] md:text-[60px] font-semibold tracking-[-0.03em] leading-[1.08] max-w-[1050px]">
          {words.map((w, i) => (
            <ScrollWord key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} still={reduce}
              accent={['отзыве,', 'камеру', 'залом.'].includes(w)}>{w}</ScrollWord>
          ))}
        </p>
      </div>
      <VerbMarquee />
      <Story />
    </section>
  )
}

function ScrollWord({ children, progress, range, still, accent }) {
  const opacity = useTransform(progress, range, [0.15, 1])
  return (
    <motion.span style={still ? undefined : { opacity }} className={`inline-block mr-[0.25em] ${accent ? 'text-[var(--color-brand)]' : ''}`}>
      {children}
    </motion.span>
  )
}

/** Бегущая строка READ · WRITE · FILM · SPEAK. */
function VerbMarquee() {
  const row = ['READ', 'WRITE', 'FILM', 'SPEAK', 'LEAD']
  return (
    <div className="relative my-16 md:my-24 -mx-5 sm:-mx-6 overflow-hidden py-4 border-y border-[var(--color-border)] [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <div className="flex w-max animate-[marquee_28s_linear_infinite] motion-reduce:animate-none">
        {[0, 1].map(k => (
          <div key={k} className="flex shrink-0 items-center" aria-hidden={k === 1}>
            {[...row, ...row].map((w, i) => (
              <span key={i} className="flex items-center text-[44px] md:text-[72px] font-black tracking-[-0.04em] leading-none px-6">
                <span className={i % 2 ? 'text-transparent [-webkit-text-stroke:1.5px_var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'}>{w}</span>
                <span className="ml-12 w-3 h-3 rounded-full" style={{ background: i % 3 === 0 ? GOLD : BLUE }} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Story() {
  const [active, setActive] = useState(0)
  const [covers, setCovers] = useState([])
  useEffect(() => {
    fetch('/api/public/videos').then(r => r.json()).then(d => setCovers((d.covers || []).slice(0, 8))).catch(() => {})
  }, [])
  return (
    <div className="max-w-[1200px] mx-auto pb-24 md:pb-32">
      {/* Компьютер: текст слева, сцена справа «прилипает» и меняется */}
      <div className="hidden lg:grid grid-cols-2 gap-16">
        <div>
          {STEPS.map((s, i) => <StepText key={s.verb} s={s} i={i} onActive={() => setActive(i)} active={active === i} />)}
        </div>
        <div className="relative">
          <div className="sticky top-[12vh] h-[76vh]">
            <AnimatePresence mode="wait">
              <motion.div key={active} className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -20 }}
                transition={{ duration: 0.55, ease: EASE }}>
                {(() => { const S = STEPS[active].Scene; return <S active covers={covers} /> })()}
              </motion.div>
            </AnimatePresence>
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              {STEPS.map((_, i) => (
                <motion.span key={i} className="w-1.5 rounded-full" animate={{ height: active === i ? 28 : 8, background: active === i ? BLUE : 'var(--color-border-strong)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Телефон: у каждого шага своя сцена */}
      <div className="lg:hidden space-y-14">
        {STEPS.map((s, i) => <MobileStep key={s.verb} s={s} i={i} covers={covers} />)}
      </div>
    </div>
  )
}

function StepHead({ s, i, dim }) {
  const Icon = s.icon
  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: NAVY, color: GOLD }}><Icon size={21} strokeWidth={2.2} /></span>
        <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand)]">0{i + 1} · {s.verb}</span>
      </div>
      <h3 className={`text-[34px] md:text-[44px] font-semibold tracking-[-0.03em] leading-[1.05] mb-4 transition-colors ${dim ? 'text-[var(--color-text-tertiary)]' : ''}`}>{s.title}</h3>
      <p className="text-[17px] text-[var(--color-text-secondary)] leading-[1.6] max-w-[460px]">{s.text}</p>
      <span className="mt-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--color-bg-soft)] text-[14px] font-semibold"><Coin size={20} /> {s.reward}</span>
    </>
  )
}

function StepText({ s, i, onActive, active }) {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.6 })
  useEffect(() => { if (inView) onActive() }, [inView]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.div ref={ref} className="min-h-[80vh] flex flex-col justify-center" animate={{ opacity: active ? 1 : 0.35 }} transition={{ duration: 0.4 }}>
      <StepHead s={s} i={i} dim={!active} />
    </motion.div>
  )
}

function MobileStep({ s, i, covers }) {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.4 })
  const S = s.Scene
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: EASE }}>
      <StepHead s={s} i={i} />
      <div className="mt-6 h-[380px]"><S active={inView} covers={covers} /></div>
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
