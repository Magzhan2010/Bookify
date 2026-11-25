'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from '../components/ThemeContext'
import { PagesLadder, BonusCards, PointsCalculator, PrizesPreview, AiWarning } from '../components/game/RulesBlocks'
import { BeyondReading } from '../components/landing/Story'
import { ArrowRight, ArrowUpRight, Trophy } from 'lucide-react'

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
    <>
    {/* меню вне <main>: у <main> анимация появления с transform, из-за неё fixed не держится */}
    <Nav />
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] overflow-x-hidden">
      <Hero />
      <LiveStats />
      <BeyondReading />
      <ProgramSection />
      <FinalCta />
      <LandingFooter />
    </main>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Навигация: прозрачная над тёмным первым экраном, обычная ниже       */
/* ------------------------------------------------------------------ */
function Nav() {
  const [onDark, setOnDark] = useState(true)
  useEffect(() => {
    const check = () => {
      const hero = document.getElementById('hero')
      setOnDark(!!hero && hero.getBoundingClientRect().bottom > 64)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [])

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
      onDark ? 'bg-[#04061a]/85 border-b border-white/5 text-white' : 'bg-[var(--color-bg-overlay)] backdrop-blur-2xl border-b border-[var(--color-border)]'}`}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/lb_logo.png" width={40} height={40} alt="" className="w-10 h-10 object-contain" priority />
          <span className="font-semibold text-[17px] tracking-tight">Bookify</span>
        </Link>

        <div className={`hidden md:flex items-center gap-1 text-[14px] font-medium ${onDark ? 'text-white/70' : 'text-[var(--color-text-secondary)]'}`}>
          <a href="#beyond" className={`px-3 py-2 rounded-full transition-colors ${onDark ? 'hover:text-white hover:bg-white/5' : 'hover:text-[var(--color-text-primary)]'}`}>Как это работает</a>
          <a href="#program" className={`px-3 py-2 rounded-full transition-colors ${onDark ? 'hover:text-white hover:bg-white/5' : 'hover:text-[var(--color-text-primary)]'}`}>Монеты и призы</a>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {!onDark && <ThemeToggle size="md" />}
          <Link href="/login" className={`hidden sm:block px-3.5 py-2 text-[14px] font-medium transition-colors ${onDark ? 'text-white/75 hover:text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
            Войти
          </Link>
          <Link href="/register"
            className="px-4 py-2.5 text-[14px] font-semibold rounded-full bg-[#1a56db] hover:bg-[#1e4fc4] text-white transition-colors shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(26,86,219,0.45)]">
            Регистрация
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* Первый экран: «синий свет» — светящийся горизонт и панель Bookify   */
/* ------------------------------------------------------------------ */
function Hero() {
  const still = useReducedMotion()

  return (
    <section id="hero" className="relative overflow-hidden bg-[#04061a] text-white pt-32 md:pt-40 px-5 sm:px-6">
      {/* ореол */}
      <motion.div aria-hidden className="absolute left-1/2 top-[260px] md:top-[340px] w-[1700px] h-[800px] -ml-[850px] pointer-events-none"
        style={{ background: 'radial-gradient(closest-side at 50% 60%, rgba(26,86,219,0.5), rgba(26,86,219,0.14) 50%, transparent)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6, delay: 0.3 }} />
      {/* горизонт */}
      <motion.div aria-hidden className="absolute left-1/2 top-[560px] md:top-[640px] w-[1760px] h-[1760px] -ml-[880px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 0%, #0d1a4d 0%, #060a24 30%, #04061a 60%)',
          boxShadow: 'inset 0 3px 0 rgba(200,222,255,0.95), inset 0 18px 40px rgba(79,125,240,0.55), 0 -6px 30px rgba(120,165,255,0.9), 0 -40px 140px rgba(26,86,219,0.75)'
        }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, ease: EASE }} />
      {/* блик на вершине дуги */}
      <motion.div aria-hidden className="absolute left-1/2 top-[505px] md:top-[585px] w-[640px] h-[120px] -ml-[320px] pointer-events-none"
        style={{ willChange: 'opacity', background: 'radial-gradient(closest-side, rgba(230,240,255,0.85), rgba(120,165,255,0.35) 45%, transparent)' }}
        animate={still ? {} : { opacity: [0.7, 1, 0.7] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />

      <motion.div initial="hidden" animate="visible" variants={stagger} className="relative max-w-[980px] mx-auto text-center">
        <motion.div variants={reveal}
          className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-xl text-[13px] text-white/80">
          <span className="px-2.5 py-1 rounded-full bg-[#1a56db] text-white font-semibold">DLS</span>
          Библиотека Divergents Leadership School
        </motion.div>
        <motion.h1 variants={reveal} className="mt-7 text-[42px] sm:text-[60px] lg:text-[76px] font-semibold tracking-[-0.045em] leading-[1.02] text-white" style={{ color: '#ffffff' }}>
          Библиотека, которая<br className="hidden sm:block" />{' '}превращает чтение в навык
        </motion.h1>
        <motion.p variants={reveal} className="mt-6 mx-auto max-w-[560px] text-[17px] md:text-[19px] leading-[1.55] text-white/65">
          Бери книги, пиши отзывы, снимай видео и выступай на TEDx. За каждый шаг — монеты и настоящие призы.
        </motion.p>
        <motion.div variants={reveal} className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register"
            className="group px-7 py-3.5 rounded-full bg-[#1a56db] hover:bg-[#1e4fc4] text-white text-[16px] font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_40px_rgba(26,86,219,0.7)] hover:-translate-y-0.5">
            Создать аккаунт <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link href="/login"
            className="px-7 py-3.5 rounded-full bg-white/[0.05] border border-white/12 backdrop-blur-xl text-[16px] font-semibold hover:bg-white/10 transition-colors inline-flex items-center justify-center">
            У меня есть логин
          </Link>
        </motion.div>
      </motion.div>

      <div className="relative max-w-[1180px] mx-auto mt-40 md:mt-56">
        <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.5, ease: EASE }}
          className="rounded-[28px] p-4 sm:p-[18px] bg-[#0b1233]/90 border border-white/10 shadow-[0_-20px_80px_rgba(26,86,219,0.25)]">
          <HeroPanel />
        </motion.div>
      </div>
      <div className="h-16 md:h-20" />
    </section>
  )
}

/** Стеклянная панель Bookify под горизонтом: как выглядит кабинет ученика. */
function HeroPanel() {
  return (
    <div aria-label="Пример кабинета ученика">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1 pb-4 border-b border-white/[0.08]">
        <div className="text-[17px] font-extrabold tracking-[-0.03em]">Bookify<span style={{ color: GOLD }}>.</span></div>
        <div className="hidden sm:flex flex-wrap gap-6 text-[13px] text-white/60">
          <span className="text-white font-semibold">Каталог</span><span>Мои книги</span><span>Магазин</span><span>Лидеры</span><span>Фокус</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold">
          <span className="w-[18px] h-[18px] rounded-full text-[9px] font-black flex items-center justify-center text-[#7a5200]" style={{ background: GOLD }}>B</span>72
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-[18px]">
        <PanelCard kicker="ЧИТАЮ СЕЙЧАС" title="Маленький принц" sub="Вернуть через 8 дней" accent>
          <Bar w="62%" c="#4f7df0" />
        </PanelCard>
        <PanelCard kicker="МОЯ ЦЕЛЬ" title="72 из 100 монет" sub="До приза — одна книга">
          <Bar w="72%" c={GOLD} />
        </PanelCard>
        <PanelCard kicker="ОТЗЫВ" title="«Атомные привычки»" sub="Одобрен · +5 монет" subBlue>
          <div className="flex gap-1 mt-[18px]">{[1, 1, 1, 0].map((on, i) => <span key={i} className="flex-1 h-1.5 rounded-full" style={{ background: on ? '#4f7df0' : 'rgba(255,255,255,0.12)' }} />)}</div>
        </PanelCard>
      </div>
    </div>
  )
}

function PanelCard({ kicker, title, sub, accent, subBlue, children }) {
  return (
    <div className="rounded-[20px] p-5 text-left border"
      style={accent
        ? { background: 'linear-gradient(160deg, rgba(26,86,219,0.35), rgba(26,86,219,0.08))', borderColor: 'rgba(120,165,255,0.25)' }
        : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className={`text-[12px] font-bold tracking-[0.12em] ${accent ? 'text-[#9ec1ff]' : 'text-white/60'}`}>{kicker}</div>
      <div className="text-[20px] font-bold mt-2">{title}</div>
      <div className={`text-[13px] mt-0.5 ${subBlue ? 'text-[#9ec1ff]' : 'text-white/65'}`}>{sub}</div>
      {children}
    </div>
  )
}

const Bar = ({ w, c }) => (
  <div className="h-1.5 rounded-full bg-white/10 mt-4"><div className="h-1.5 rounded-full" style={{ width: w, background: c }} /></div>
)

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
          <div className="space-y-5">
            <div className="grid lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3"><PagesLadder /></div>
              <div className="lg:col-span-2"><BonusCards /></div>
            </div>
            <PointsCalculator />
          </div>
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
          <PrizeStack />
        </div>
      </motion.div>
    </section>
  )
}

/** Три фото призов веером — вместо монет. */
const STACK = [
  { src: '/prizes/photo/notebook-1.webp', title: 'Блокнот', rot: -9, x: -70, y: 18 },
  { src: '/prizes/photo/mug-1.webp', title: 'Термокружка', rot: 7, x: 70, y: 26 },
  { src: '/prizes/photo/wishbook-1.webp', title: 'Книга из Wish List', rot: -1, x: 0, y: 0 }
]

function PrizeStack() {
  return (
    <div className="hidden md:block relative h-[300px]" aria-hidden>
      {STACK.map((p, i) => (
        <motion.div
          key={p.src}
          initial={{ opacity: 0, y: 30, rotate: 0 }}
          whileInView={{ opacity: 1, y: p.y, rotate: p.rot }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.12, duration: 0.8, ease: EASE }}
          whileHover={{ y: p.y - 10, rotate: 0, zIndex: 10 }}
          className="absolute left-1/2 top-4 w-[180px] -ml-[90px] rounded-[22px] bg-white p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
          style={{ x: p.x, zIndex: i }}
        >
          <img src={p.src} alt="" loading="lazy" className="w-full aspect-square object-cover rounded-[16px] bg-[#e3e3e1]" />
          <div className="px-1 pt-2 pb-0.5 text-[13px] font-semibold text-[#1f2a5c] truncate">{p.title}</div>
        </motion.div>
      ))}
    </div>
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
