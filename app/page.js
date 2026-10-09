'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import {
  BookOpen, Search, Calendar, BarChart3, Users, Sparkles,
  ArrowRight, Library, ShieldCheck, Zap, Heart, Clock,
  ArrowDownToLine, BookMarked, Award, ChevronDown, Star
} from 'lucide-react'

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } }
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-card)] text-[var(--color-text-primary)] overflow-x-hidden">

      {/* === Animated mesh-gradient background === */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-brand), transparent 60%)', opacity: 0.06 }}
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-success), transparent 60%)', opacity: 0.05 }}
        />
      </div>

      {/* === NAV === */}
      <nav className="fixed top-0 w-full z-50 bg-[var(--color-bg-overlay)] backdrop-blur-2xl border-b border-[var(--color-border)]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--color-bg-card)] ring-1 ring-[var(--color-border)] shadow-sm"
            >
              <Image src="/lb_logo.png" width={40} height={40} alt="DLS" className="object-contain" />
            </motion.div>
            <div className="font-semibold text-[17px] tracking-tight text-[var(--color-text-primary)]">Bookify</div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block px-4 py-2 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              Войти
            </Link>
            <Link
              href="/register"
              className="px-4 py-3 text-[14px] font-medium rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] transition-colors shadow-sm hover:shadow-md"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </nav>

      {/* === HERO === */}
      <HeroSection />

      {/* === STATS BAND === */}
      <StatsBand />

      {/* === FEATURES === */}
      <FeaturesSection />

      {/* === FOR LIBRARIAN === */}
      <LibrarianSection />

      {/* === CTA === */}
      <CtaSection />

      {/* === FOOTER === */}
      <FooterSection />
    </main>
  )
}

const HeroSection = () => {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0])

  return (
    <section ref={ref} className="relative pt-32 md:pt-48 pb-20 md:pb-32 px-6">
      <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-[1100px] mx-auto text-center relative">

        {/* Floating badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-7 px-4 py-1.5 bg-[var(--color-brand)]/10 border border-[var(--color-brand)]/20 rounded-full text-[12px] font-medium text-[var(--color-brand)] backdrop-blur-sm"
        >
          <motion.span
            animate={{ rotate: [0, 15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles size={12} />
          </motion.span>
          Цифровая библиотека DLS
        </motion.div>

        {/* Title with gradient */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-7xl md:text-8xl font-semibold tracking-[-0.035em] leading-[0.95] mb-6 text-[var(--color-text-primary)]"
        >
          Возьми книгу.
          <br />
          <span className="bg-gradient-to-r from-[var(--color-brand)] via-[#3b82f6] to-[var(--color-brand)] bg-clip-text text-transparent">
            Онлайн.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[19px] md:text-[21px] text-[var(--color-text-secondary)] mb-10 max-w-2xl mx-auto leading-[1.5]"
        >
          Платформа библиотеки Divergents Leadership School.
          <span className="text-[var(--color-text-primary)] font-semibold"> 1000+ книг</span> в каталоге,
          <span className="text-[var(--color-text-primary)] font-semibold"> мгновенный поиск</span>,
          <span className="text-[var(--color-text-primary)] font-semibold"> статистика чтения</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-20"
        >
          <Link
            href="/register"
            className="group px-7 py-3 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[16px] font-medium flex items-center justify-center gap-2 transition-all shadow-[0_8px_24px_rgba(26,86,219,0.25)] hover:shadow-[0_12px_32px_rgba(26,86,219,0.35)] hover:-translate-y-0.5"
          >
            Начать бесплатно <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/library"
            className="px-7 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[16px] font-medium hover:bg-[var(--color-bg-soft)] transition-all flex items-center justify-center gap-2"
          >
            <Library size={16} /> Открыть каталог
          </Link>
        </motion.div>

        {/* Browser mockup */}
        <BrowserMockup />

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[var(--color-text-tertiary)]"
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>
    </section>
  )
}

const BrowserMockup = () => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay: 0.45 }}
    className="relative max-w-[820px] mx-auto"
  >
    <div className="absolute -inset-x-12 -inset-y-6 bg-gradient-to-br from-[var(--color-brand)]/10 to-transparent rounded-[40px] blur-2xl" />
    <div className="relative bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden backdrop-blur-sm">
      {/* Traffic lights + URL */}
      <div className="flex items-center gap-1.5 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-auto text-[11px] text-[var(--color-text-tertiary)] font-mono">bookify.dls/library</div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Книг', value: '1000+', color: 'var(--color-brand)' },
            { label: 'На руках', value: '38', color: 'var(--color-warning)' },
            { label: 'Читателей', value: '142', color: 'var(--color-success)' }
          ].map((s, i) => (
            <div key={i} className="bg-[var(--color-bg-soft)] rounded-2xl p-4 text-left">
              <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mb-1">{s.label}</div>
              <div className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {[
            { name: 'Adamov M.', book: 'Преступление и наказ.', status: 'Выдана' },
            { name: 'Baimukhan A.', book: '1984', status: 'Возвращена' },
            { name: 'Kabdolla M.', book: 'Мастер и Маргарита', status: 'Просрочка' }
          ].map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-center gap-3 p-3 bg-[var(--color-bg-soft)] rounded-xl"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[#3b82f6] flex items-center justify-center text-xs font-semibold text-[var(--color-text-on-brand)]">
                {row.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{row.name}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{row.book}</div>
              </div>
              <div className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                row.status === 'Выдана' ? 'bg-[var(--color-brand)]/10 text-[var(--color-brand)]' :
                row.status === 'Возвращена' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
                'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
              }`}>
                {row.status}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
)

const StatsBand = () => (
  <section className="py-16 px-6 border-y border-[var(--color-border)] bg-[var(--color-bg-soft)]">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={stagger}
      className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
    >
      {[
        { num: '1000+', label: 'Книг в каталоге' },
        { num: '99', label: 'Учеников' },
        { num: '24/7', label: 'Доступ' },
        { num: '1 клик', label: 'Чтобы взять' }
      ].map((s, i) => (
        <motion.div key={i} variants={fadeIn} className="text-[var(--color-text-primary)]">
          <div className="text-4xl md:text-5xl font-semibold tracking-tight mb-1">{s.num}</div>
          <div className="text-[12px] md:text-[13px] text-[var(--color-text-tertiary)] font-medium">{s.label}</div>
        </motion.div>
      ))}
    </motion.div>
  </section>
)

const FeaturesSection = () => (
  <section className="py-24 md:py-32 px-6">
    <div className="max-w-[1100px] mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="text-center mb-16"
      >
        <motion.div variants={fadeIn} className="inline-block mb-4 text-[12px] font-medium text-[var(--color-brand)] uppercase tracking-[0.15em]">
          Для учеников
        </motion.div>
        <motion.h2 variants={fadeIn} className="text-4xl md:text-6xl font-semibold tracking-[-0.025em] mb-4 text-[var(--color-text-primary)]">
          Три шага до книги
        </motion.h2>
        <motion.p variants={fadeIn} className="text-[19px] text-[var(--color-text-secondary)] max-w-xl mx-auto">
          Больше никаких бумажных журналов. Всё в телефоне.
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="grid md:grid-cols-3 gap-5"
      >
        {[
          { icon: Search, title: 'Найди', desc: 'Вбил название или жанр — нашёл за пару секунд. Фильтры, превью, описания.', color: 'var(--color-brand)' },
          { icon: BookMarked, title: 'Возьми', desc: 'Бронируешь онлайн. Приходишь в удобный час — библиотекарь выдаёт. Никакой бюрократии.', color: 'var(--color-success)' },
          { icon: BarChart3, title: 'Читай', desc: 'В профиле виден прогресс: сколько прочитал, какие жанры, цель на год, рекомендации.', color: 'var(--color-warning)' }
        ].map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={i}
              variants={fadeIn}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] p-8 hover:border-[var(--color-brand)]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all relative overflow-hidden"
            >
              <div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: step.color }}
              />
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: step.color + '15', color: step.color }}
              >
                <Icon size={22} />
              </div>
              <div className="text-[12px] text-[var(--color-text-tertiary)] font-medium mb-1">0{i + 1}</div>
              <h3 className="text-[24px] font-semibold mb-2 tracking-tight text-[var(--color-text-primary)]">{step.title}</h3>
              <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.5]">{step.desc}</p>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  </section>
)

const LibrarianSection = () => (
  <section className="py-24 md:py-32 px-6 bg-[var(--color-bg-soft)] border-y border-[var(--color-border)]">
    <div className="max-w-[1200px] mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-block mb-4 text-[12px] font-medium text-[var(--color-brand)] uppercase tracking-[0.15em]">
            Для библиотекаря
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.025em] mb-6 leading-[1.05] text-[var(--color-text-primary)]">
            Прощайте, тетрадки<br />
            <span className="text-[var(--color-text-secondary)]">и Google Sheets</span>
          </h2>
          <p className="text-[19px] text-[var(--color-text-secondary)] mb-10 leading-[1.5]">
            Раньше нужно было записывать ручкой, кто какую книгу взял. Искать по журналу, считать на калькуляторе.
            <span className="text-[var(--color-text-primary)] font-medium"> Теперь всё в одном экране.</span>
          </p>

          <div className="space-y-4">
            {[
              { icon: BookMarked, label: 'Выдать книгу — 30 секунд', color: '#1a56db' },
              { icon: ArrowDownToLine, label: 'Принять возврат — 1 клик', color: '#34c759' },
              { icon: Search, label: 'Найти "у кого книга" — мгновенно', color: '#ff9500' },
              { icon: BarChart3, label: 'Аналитика: топ читатели, графики, должники', color: '#ff2d55' }
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 group"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: item.color + '15', color: item.color }}
                  >
                    <Icon size={17} />
                  </motion.div>
                  <span className="text-[16px] text-[var(--color-text-primary)] font-medium">{item.label}</span>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-br from-[var(--color-brand)]/10 to-transparent rounded-[40px] blur-2xl" />
          <div className="relative bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden backdrop-blur-sm">
            <div className="flex items-center gap-1.5 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="font-semibold text-[15px]">Выдать книгу</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)]">шаг 2 из 3</div>
              </div>

              <div className="space-y-2">
                {[
                  { name: 'Adamov M.', cls: '7' },
                  { name: 'Kabdolla M.', cls: '8' },
                  { name: 'Mamedali M.', cls: '10' }
                ].map((s, i) => (
                  <div key={i} className={`p-3 rounded-xl flex items-center gap-3 ${
                    i === 0 ? 'bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/30' : 'bg-[var(--color-bg-soft)]'
                  }`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[13px] ${
                      i === 0 ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)]' : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
                    }`}>
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium truncate">{s.name}</div>
                      <div className="text-[11px] text-[var(--color-text-tertiary)]">{s.cls} класс</div>
                    </div>
                    {i === 0 && <div className="text-[11px] text-[var(--color-brand)] font-medium">Выбрано</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
)

const CtaSection = () => (
  <section className="py-24 md:py-32 px-6">
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="max-w-[800px] mx-auto bg-[var(--color-text-primary)] p-12 md:p-20 rounded-[32px] text-center relative overflow-hidden"
    >
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[var(--color-brand)]/30 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[var(--color-success)]/20 blur-3xl" />

      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="relative z-10 inline-block mb-6 text-6xl"
      >
        📚
      </motion.div>

      <h2 className="relative z-10 text-3xl md:text-5xl font-semibold tracking-[-0.025em] mb-4 text-white">
        Готов начать читать?
      </h2>
      <p className="relative z-10 text-[var(--color-text-on-brand)]/70 mb-10 max-w-md mx-auto text-[17px]">
        Регистрация занимает 30 секунд. Первая книга — бесплатно.
      </p>

      <Link
        href="/register"
        className="relative z-10 inline-flex items-center gap-2 px-9 py-3.5 bg-[var(--color-bg-card)] text-[var(--color-text-primary)] text-[16px] font-medium hover:bg-[var(--color-bg-soft)] transition-colors rounded-xl"
      >
        Создать аккаунт <ArrowRight size={16} />
      </Link>
    </motion.div>
  </section>
)

const FooterSection = () => (
  <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] py-10">
    <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Image src="/lb_logo.png" width={28} height={28} alt="DLS" className="opacity-70" />
        <div className="text-[13px] text-[var(--color-text-secondary)]">
          © 2026 <span className="text-[var(--color-text-primary)] font-medium">Bookify</span> · Divergents Leadership School
        </div>
      </div>
      <div className="flex flex-col items-center sm:items-end gap-1">
        <div className="text-[12px] text-[var(--color-text-tertiary)]">
          Разработано: <span className="text-[var(--color-brand)] font-semibold">Zhenis Magzhan</span>
        </div>
        <div className="text-[13px] text-[var(--color-text-tertiary)]">
          Сделано <Heart className="inline w-3 h-3 text-[#ff2d55]" /> для настоящих читателей
        </div>
      </div>
    </div>
  </footer>
)