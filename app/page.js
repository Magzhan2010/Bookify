'use client'

import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from '../components/ThemeContext'
import CoinCard from '../components/game/CoinCard'
import QuoteFeature from '../components/quotes/QuoteFeature'
import { PointsSystem, PrizesPreview, AiWarning } from '../components/game/RulesBlocks'
import {
  ArrowRight, ArrowUpRight, BookOpen, PenLine, Coins, Undo2,
  GraduationCap, Presentation, Library, Trophy, Video, Mic
} from 'lucide-react'

/* Фирменные цвета */
const NAVY = '#1f2a5c'
const GOLD = '#ffc93c'
const EASE = [0.22, 1, 0.36, 1]

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } }
}
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] overflow-x-hidden">
      <Nav />
      <Hero />
      <LiveStats />
      <HowItWorks />
      <ProgramSection />
      <QuotesSection />
      <AudienceSection />
      <FinalCta />
      <LandingFooter />
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Навигация                                                           */
/* ------------------------------------------------------------------ */
function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[var(--color-bg-overlay)] backdrop-blur-2xl border-b border-[var(--color-border)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/lb_logo.png" width={40} height={40} alt="" className="w-10 h-10 object-contain" priority />
          <span className="font-semibold text-[17px] tracking-tight">Bookify</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 text-[14px] font-medium text-[var(--color-text-secondary)]">
          <a href="#how" className="px-3 py-2 rounded-lg hover:text-[var(--color-text-primary)] transition-colors">Как это работает</a>
          <a href="#program" className="px-3 py-2 rounded-lg hover:text-[var(--color-text-primary)] transition-colors">Монеты и призы</a>
          <a href="#for-whom" className="px-3 py-2 rounded-lg hover:text-[var(--color-text-primary)] transition-colors">Для кого</a>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle size="md" />
          <Link href="/login" className="hidden sm:block px-3.5 py-2 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            Войти
          </Link>
          <Link
            href="/register"
            className="px-4 py-2.5 text-[14px] font-semibold rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] transition-colors"
          >
            Регистрация
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* Первый экран                                                        */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative pt-28 md:pt-36 pb-16 md:pb-24 px-5 sm:px-6">
      {/* мягкое синее свечение сверху — статичное, без анимации */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[620px] -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(700px 380px at 50% 0%, color-mix(in srgb, var(--color-brand) 12%, transparent), transparent 70%)' }}
      />

      <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center lg:text-left">
          <motion.div
            variants={reveal}
            className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[13px] font-medium text-[var(--color-text-secondary)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
            Библиотека Divergents Leadership School
          </motion.div>

          <motion.h1
            variants={reveal}
            className="text-[44px] sm:text-[64px] lg:text-[76px] font-semibold tracking-[-0.04em] leading-[0.98] mb-6"
          >
            Читай книги.
            <br />
            Копи{' '}
            <span className="relative inline-block">
              <span className="relative z-10">монеты.</span>
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
                className="absolute left-0 right-0 bottom-[0.08em] h-[0.32em] origin-left rounded-sm -z-0"
                style={{ background: GOLD, opacity: 0.85 }}
              />
            </span>
            <br />
            <span className="text-[var(--color-brand)]">Забирай призы.</span>
          </motion.h1>

          <motion.p
            variants={reveal}
            className="text-[18px] md:text-[20px] text-[var(--color-text-secondary)] leading-[1.5] max-w-[540px] mx-auto lg:mx-0 mb-9"
          >
            Bookify — школьная библиотека в телефоне: каталог, твои книги, отзывы и
            программа <span className="text-[var(--color-text-primary)] font-medium">Read. Think. Speak. Create. Lead.</span>
          </motion.p>

          <motion.div variants={reveal} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link
              href="/register"
              className="group px-7 py-3.5 rounded-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[16px] font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(26,86,219,0.28)] hover:-translate-y-0.5"
            >
              Создать аккаунт
              <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-7 py-3.5 rounded-full border border-[var(--color-border-strong)] text-[16px] font-semibold hover:bg-[var(--color-bg-soft)] transition-colors inline-flex items-center justify-center"
            >
              У меня есть логин
            </Link>
          </motion.div>
        </motion.div>

        <HeroVisual />
      </div>
    </section>
  )
}

/** Тёмно-синяя панель: плавающие монеты и книга, проходящая путь до «Прочитано». */
function HeroVisual() {
  const still = useReducedMotion()
  const float = (d, delay) =>
    still ? {} : { animate: { y: [0, -d, 0] }, transition: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay } }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
      className="relative mx-auto w-full max-w-[520px]"
    >
      <div
        className="relative rounded-[36px] overflow-hidden px-6 pt-8 pb-6 sm:px-8 sm:pt-10 shadow-[0_30px_80px_rgba(31,42,92,0.35)]"
        style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #17204a 100%)` }}
      >
        {/* тонкая сетка */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
        <div aria-hidden className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: GOLD }} />

        <div className="relative h-[200px] sm:h-[230px]">
          <motion.div className="absolute left-0 top-2 -rotate-6" {...float(10, 0)}>
            <CoinCard value={25} size="md" />
          </motion.div>
          <motion.div className="absolute right-0 top-14 rotate-[7deg]" {...float(12, 0.8)}>
            <CoinCard value={15} size="md" />
          </motion.div>
          <motion.div className="absolute left-[22%] bottom-0 -rotate-2" {...float(8, 1.6)}>
            <CoinCard value={10} size="sm" />
          </motion.div>
        </div>

        <BookJourney />
      </div>
    </motion.div>
  )
}

const JOURNEY = [
  { label: 'Выдана', hint: 'Книга у тебя', color: '#5b8def' },
  { label: 'Ждёт отзыва', hint: 'Вернул в библиотеку', color: '#ff9f0a' },
  { label: 'Отзыв на проверке', hint: '186 слов · 5 критериев', color: '#bf8cff' },
  { label: 'Прочитано', hint: '+5 за отзыв · +20 за объём', color: '#32d74b', coins: 25 }
]

function BookJourney() {
  const still = useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (still) { setStep(JOURNEY.length - 1); return }
    const t = setInterval(() => setStep(s => (s + 1) % JOURNEY.length), 2200)
    return () => clearInterval(t)
  }, [still])
  const cur = JOURNEY[step]

  return (
    <div className="relative mt-6 rounded-[22px] bg-white/[0.08] border border-white/10 backdrop-blur-md p-4 sm:p-5 text-white">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-14 rounded-md shrink-0 flex items-center justify-center" style={{ background: GOLD, color: NAVY }}>
          <BookOpen size={20} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">Мастер и Маргарита</div>
          <div className="text-[12px] text-white/55">480 страниц</div>
        </div>
        <AnimatePresence mode="wait">
          {cur.coins ? (
            <motion.div
              key="coins"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="px-2.5 py-1 rounded-full text-[13px] font-bold tabular-nums"
              style={{ background: GOLD, color: NAVY }}
            >
              +{cur.coins}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex gap-1.5" aria-hidden>
        {JOURNEY.map((s, i) => (
          <div key={s.label} className="h-1 flex-1 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: s.color }}
              initial={false}
              animate={{ width: i <= step ? '100%' : '0%' }}
              transition={{ duration: 0.5, ease: EASE }}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 h-[22px] relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={cur.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between gap-2 text-[13px]"
          >
            <span className="font-semibold" style={{ color: cur.color }}>{cur.label}</span>
            <span className="text-white/55 truncate">{cur.hint}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Живые цифры                                                         */
/* ------------------------------------------------------------------ */
function LiveStats() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setStats(d && typeof d.books === 'number' ? d : null))
      .catch(() => {})
  }, [])

  const items = stats
    ? [
        { value: stats.books, label: 'книг в каталоге' },
        { value: stats.readers, label: 'читателей — ученики и учителя' },
        { value: stats.read, label: 'книг прочитано в игре' },
        { value: stats.coins, label: 'монет заработано' }
      ]
    : null

  return (
    <section className="px-5 sm:px-6">
      <div className="max-w-[1200px] mx-auto border-y border-[var(--color-border)] py-10 md:py-12 min-h-[140px]">
        {items && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6"
          >
            {items.map(s => (
              <motion.div key={s.label} variants={reveal} className="text-center md:text-left">
                <div className="text-[40px] md:text-[52px] font-semibold tracking-[-0.03em] leading-none tabular-nums">
                  <CountUp value={s.value} />
                </div>
                <div className="mt-2 text-[13px] md:text-[14px] text-[var(--color-text-tertiary)] font-medium">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}

function CountUp({ value }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const still = useReducedMotion()
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (still) { setShown(value); return }
    let raf
    const start = performance.now()
    const tick = now => {
      const t = Math.min(1, (now - start) / 1200)
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, still])
  return <span ref={ref}>{shown.toLocaleString('ru-RU')}</span>
}

/* ------------------------------------------------------------------ */
/* Как это работает                                                    */
/* ------------------------------------------------------------------ */
const STEPS = [
  { icon: BookOpen, title: 'Возьми книгу', text: 'В школьной библиотеке или забронируй в каталоге Bookify.' },
  { icon: Undo2, title: 'Прочитай и верни', text: 'Библиотекарь отмечает возврат — книга ждёт твоего отзыва.' },
  { icon: PenLine, title: 'Напиши отзыв', text: '150–300 слов: о чём книга, главная идея, твоё мнение с примерами и выводы.' },
  { icon: Coins, title: 'Получи монеты', text: '+5 за отзыв и от 5 до 25 за объём книги — после проверки.' }
]

function HowItWorks() {
  return (
    <section id="how" className="py-24 md:py-32 px-5 sm:px-6 scroll-mt-16">
      <div className="max-w-[1200px] mx-auto">
        <SectionHead
          kicker="Как это работает"
          title={<>Путь одной книги —<br className="hidden sm:block" /> четыре шага.</>}
        />

        <motion.ol
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* линия, которая прорисовывается между шагами */}
          <motion.div
            aria-hidden
            variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition: { duration: 1.2, ease: EASE } } }}
            className="hidden lg:block absolute top-[46px] left-[12%] right-[12%] h-px origin-left bg-[var(--color-border-strong)]"
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.li
                key={s.title}
                variants={reveal}
                className="relative apple-card card-lift p-6 pt-7"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: NAVY, color: GOLD }}>
                    <Icon size={21} strokeWidth={2.2} />
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--color-text-tertiary)] tabular-nums">0{i + 1}</span>
                </div>
                <h3 className="text-[20px] font-semibold tracking-tight mb-2">{s.title}</h3>
                <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.55]">{s.text}</p>
              </motion.li>
            )
          })}
        </motion.ol>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-4 rounded-[22px] border border-dashed border-[var(--color-border-strong)] p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
        >
          <div className="text-[15px] font-semibold">Хочешь больше?</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[15px] text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-2"><Video size={17} className="text-[var(--color-brand)]" /> Видео о книге <b className="text-[var(--color-text-primary)]">+10</b></span>
            <span className="inline-flex items-center gap-2"><Mic size={17} className="text-[var(--color-brand)]" /> Выступление на TEDx <b className="text-[var(--color-text-primary)]">+15</b></span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Программа, баллы, призы                                             */
/* ------------------------------------------------------------------ */
function ProgramSection() {
  return (
    <section id="program" className="py-24 md:py-32 px-5 sm:px-6 bg-[var(--color-bg-soft)] border-y border-[var(--color-border)] scroll-mt-16">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-16 md:mb-20"
        >
          <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand)] mb-5">
            Программа чтения DLS
          </div>
          <h2 className="text-[40px] sm:text-[64px] md:text-[88px] font-extrabold leading-[0.92] tracking-[-0.03em] text-[#1f2a5c] dark:text-white">
            READ<Dot /> THINK<Dot /> SPEAK<Dot />
            <br />
            CREATE<Dot />{' '}
            <span className="inline-block px-4 md:px-5 py-0.5 rounded-[18px] bg-[#1f2a5c] text-[#ffc93c] dark:bg-[#ffc93c] dark:text-[#1f2a5c]">LEAD</span>
          </h2>
        </motion.div>

        <h3 className="text-[30px] md:text-[40px] font-semibold tracking-[-0.02em] mb-6">Система баллов</h3>
        <div className="mb-20">
          <PointsSystem />
        </div>

        <div className="flex items-end justify-between gap-4 mb-6">
          <h3 className="text-[30px] md:text-[40px] font-semibold tracking-[-0.02em]">Призы</h3>
          <span className="text-[14px] text-[var(--color-text-tertiary)] pb-2">Обмен — в магазине Bookify</span>
        </div>
        <div className="mb-8">
          <PrizesPreview />
        </div>

        <AiWarning />
      </div>
    </section>
  )
}

const Dot = () => <span className="text-[var(--color-brand)]">.</span>

/* ------------------------------------------------------------------ */
/* Цитаты — только если библиотекарь их добавил                        */
/* ------------------------------------------------------------------ */
function QuotesSection() {
  const [quotes, setQuotes] = useState([])
  useEffect(() => {
    fetch('/api/quotes?limit=12')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setQuotes(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])
  if (!quotes.length) return null
  return (
    <section className="py-24 md:py-32 px-5 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <SectionHead kicker="Цитаты из книг" title={<>Мысли, которые<br />стоит запомнить.</>} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <QuoteFeature quotes={quotes} />
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Для кого                                                            */
/* ------------------------------------------------------------------ */
const AUDIENCE = [
  {
    icon: GraduationCap,
    title: 'Ученикам',
    points: ['Каталог и бронь книг', 'Монеты, уровни и достижения', 'Рейтинг месяца и лучший класс', 'Своя полка прочитанного']
  },
  {
    icon: Presentation,
    title: 'Учителям',
    points: ['Читают и получают монеты наравне со всеми', 'Видят чтение своего класса', 'Советуют книги ученикам']
  },
  {
    icon: Library,
    title: 'Библиотеке и команде',
    points: ['Выдача и возврат в пару касаний', 'Проверка отзывов по критериям школы', 'Аналитика, призы, экран в холле']
  }
]

function AudienceSection() {
  return (
    <section id="for-whom" className="py-24 md:py-32 px-5 sm:px-6 scroll-mt-16">
      <div className="max-w-[1200px] mx-auto">
        <SectionHead kicker="Для кого" title={<>Одна платформа<br className="hidden sm:block" /> для всей школы.</>} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid md:grid-cols-3 gap-4"
        >
          {AUDIENCE.map(a => {
            const Icon = a.icon
            return (
              <motion.div key={a.title} variants={reveal} className="apple-card card-lift p-7">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center mb-6">
                  <Icon size={22} />
                </div>
                <h3 className="text-[22px] font-semibold tracking-tight mb-4">{a.title}</h3>
                <ul className="space-y-2.5">
                  {a.points.map(p => (
                    <li key={p} className="flex gap-2.5 text-[15px] text-[var(--color-text-secondary)] leading-[1.45]">
                      <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Финальный призыв                                                    */
/* ------------------------------------------------------------------ */
function FinalCta() {
  return (
    <section className="pb-24 md:pb-32 px-5 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative max-w-[1200px] mx-auto rounded-[36px] overflow-hidden px-7 py-14 md:px-16 md:py-20"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a56db 140%)` }}
      >
        <div aria-hidden className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full blur-3xl opacity-25" style={{ background: GOLD }} />
        <div className="relative grid md:grid-cols-[1.3fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-5 text-[13px] font-semibold text-white/70">
              <Trophy size={15} style={{ color: GOLD }} /> Рейтинг месяца и лучший класс
            </div>
            <h2 className="text-[36px] md:text-[56px] font-semibold tracking-[-0.03em] leading-[1.02] text-white mb-5">
              Следующая книга —<br />
              <span style={{ color: GOLD }}>твоя первая монета.</span>
            </h2>
            <p className="text-[17px] text-white/70 max-w-md mb-9 leading-[1.55]">
              Логин и пароль выдаёт школа. Если логина ещё нет — зарегистрируйся за минуту.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="px-7 py-3.5 rounded-full bg-white text-[#1f2a5c] text-[16px] font-semibold hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2"
              >
                Войти <ArrowRight size={17} />
              </Link>
              <Link
                href="/register"
                className="px-7 py-3.5 rounded-full border border-white/30 text-white text-[16px] font-semibold hover:bg-white/10 transition-colors inline-flex items-center justify-center"
              >
                Регистрация
              </Link>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-center gap-3 rotate-[-4deg]">
            <CoinCard value={20} size="lg" />
            <CoinCard value={5} size="md" className="ml-24" />
          </div>
        </div>
      </motion.div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Подвал главной (подпись разработчика — общий DevCredit ниже)         */
/* ------------------------------------------------------------------ */
function LandingFooter() {
  return (
    <div className="border-t border-[var(--color-border)]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-[13px] text-[var(--color-text-secondary)]">
          <Image src="/lb_logo.png" width={26} height={26} alt="" className="opacity-80" />
          © 2026 <span className="text-[var(--color-text-primary)] font-medium">Bookify</span> · Divergents Leadership School
        </div>
        <a
          href="https://dls.edu.kz"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] transition-colors"
        >
          Сайт школы <ArrowUpRight size={14} />
        </a>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
function SectionHead({ kicker, title }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className="mb-12 md:mb-16"
    >
      <motion.div variants={reveal} className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand)] mb-4">
        {kicker}
      </motion.div>
      <motion.h2 variants={reveal} className="text-[36px] sm:text-[48px] md:text-[60px] font-semibold tracking-[-0.03em] leading-[1.02]">
        {title}
      </motion.h2>
    </motion.div>
  )
}
