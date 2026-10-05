'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import {
  BookOpen, Search, Calendar, BarChart3, Users, Sparkles,
  ArrowRight, Library, ShieldCheck, Zap, Heart, Clock,
  ArrowDownToLine, BookMarked, Award, ChevronDown
} from 'lucide-react'

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } }
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
}

export default function LandingPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0])

  return (
    <main className="min-h-screen bg-[#06070d] text-white font-sans overflow-x-hidden relative">

      {/* === Decorative background === */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#e8b94e]/8 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#4ecdc4]/5 rounded-full blur-[120px]"
        />
      </div>

      {/* === NAV === */}
      <nav className="fixed top-0 w-full z-50 bg-[#06070d]/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1300px] mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-1 ring-[#e8b94e]/20 group-hover:ring-[#e8b94e]/50 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-[#e8b94e]/20 to-transparent" />
              <Image src="/lb_logo.png" width={44} height={44} alt="DLS" className="object-contain relative z-10"/>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-bold tracking-tight">
                Book<span className="text-gradient-gold">ify</span>
              </span>
              <span className="hidden sm:block text-[9px] uppercase tracking-[0.25em] text-[#5a6383] font-medium mt-0.5">
                DLS Library
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block px-4 py-2 text-sm font-medium text-[#94a3b8] hover:text-white transition-colors">
              Войти
            </Link>
            <Link
              href="/register"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold text-xs sm:text-sm hover:shadow-lg hover:shadow-[#e8b94e]/30 transition-all active:scale-95"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </nav>

      {/* === HERO === */}
      <section ref={heroRef} className="relative pt-32 md:pt-44 pb-20 md:pb-32 px-6 overflow-hidden">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-[1100px] mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 bg-[#e8b94e]/10 border border-[#e8b94e]/20 rounded-full text-xs font-bold text-[#e8b94e] uppercase tracking-widest"
          >
            <Sparkles size={12} className="animate-pulse" /> Цифровая библиотека DLS
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[0.95] mb-6"
          >
            Возьми книгу.<br />
            <span className="text-gradient-gold">Онлайн.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-[#94a3b8] mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Платформа библиотеки Divergents Leadership School.
            <span className="text-white"> 250+ книг</span> в каталоге,
            <span className="text-white"> мгновенный поиск</span>,
            <span className="text-white"> статистика чтения</span>.
            Всё, что нужно — заходи и бери.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-16"
          >
            <Link
              href="/register"
              className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold text-lg flex items-center justify-center gap-2 shadow-2xl shadow-[#e8b94e]/20 hover:shadow-[#e8b94e]/40 hover:scale-[1.02] transition-all"
            >
              Начать читать <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/library"
              className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Library size={18} /> Смотреть каталог
            </Link>
          </motion.div>

          {/* Floating books preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative h-[200px] md:h-[280px] max-w-[800px] mx-auto"
          >
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                animate={{ y: [-10, 10, -10], rotate: [0, 2, -2, 0] }}
                transition={{
                  duration: 4 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut'
                }}
                className="absolute left-1/2 top-1/2 w-32 md:w-44 h-44 md:h-60 -ml-16 md:-ml-8"
                style={{
                  transform: `translate(${(i - 2) * 60}px, ${i % 2 === 0 ? '-20px' : '20px'}) rotate(${(i - 2) * 4}deg)`,
                  zIndex: i
                }}
              >
                <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl shadow-black/50 bg-gradient-to-br from-[#1a1f30] to-[#0a0c17] border border-white/5 flex items-center justify-center">
                  <BookOpen size={48} className="text-[#e8b94e]/40" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#5a6383]"
        >
          <ChevronDown size={20} />
        </motion.div>
      </section>

      {/* === STATS BAND === */}
      <section className="py-12 px-6 border-y border-white/5 bg-[#0a0c17]/40 backdrop-blur-md">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
        >
          {[
            { num: '250+', label: 'Книг в каталоге' },
            { num: '24/7', label: 'Доступ из любой точки' },
            { num: '< 30 сек', label: 'Поиск книги' },
            { num: '1 клик', label: 'Чтобы взять' }
          ].map((s, i) => (
            <motion.div key={i} variants={fadeIn}>
              <div className="font-display text-3xl md:text-5xl font-black text-gradient-gold mb-1">{s.num}</div>
              <div className="text-xs md:text-sm text-[#5a6383] uppercase tracking-wider font-semibold">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* === КАК ЭТО РАБОТАЕТ (Для учеников) === */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-[#60a5fa]/10 border border-[#60a5fa]/20 rounded-full text-[10px] font-bold text-[#60a5fa] uppercase tracking-widest">
              <BookOpen size={10} /> Для учеников
            </motion.div>
            <motion.h2 variants={fadeIn} className="font-display text-4xl md:text-6xl font-black tracking-tighter mb-4">
              Три шага до книги
            </motion.h2>
            <motion.p variants={fadeIn} className="text-[#94a3b8] max-w-xl mx-auto">
              Больше никаких бумажных журналов и очередей. Всё в телефоне.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Search,
                title: '1. Найди',
                desc: 'Вбил название, автора или жанр — нашёл за пару секунд. Фильтры, превью, описания.',
                color: '#60a5fa'
              },
              {
                icon: BookMarked,
                title: '2. Возьми',
                desc: 'Бронируешь книгу онлайн. Приходишь в удобный час, библиотекарь выдаёт. Никакой бюрократии.',
                color: '#e8b94e'
              },
              {
                icon: BarChart3,
                title: '3. Читай',
                desc: 'В профиле виден твой прогресс: сколько прочитал, какие жанры, цель на год, рекомендации.',
                color: '#4ecdc4'
              }
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={i}
                  variants={fadeIn}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="group bg-[#11141f] border border-white/5 rounded-3xl p-8 hover:border-[#e8b94e]/30 transition-all relative overflow-hidden"
                >
                  <div
                    className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity"
                    style={{ background: step.color }}
                  />
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                    style={{ background: `${step.color}15`, color: step.color }}
                  >
                    <Icon size={28} />
                  </div>
                  <h3 className="font-display font-bold text-2xl mb-3">{step.title}</h3>
                  <p className="text-[#94a3b8] leading-relaxed">{step.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* === ДЛЯ БИБЛИОТЕКАРЯ === */}
      <section className="py-24 md:py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#e8b94e]/3 to-transparent pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-[#e8b94e]/10 border border-[#e8b94e]/20 rounded-full text-[10px] font-bold text-[#e8b94e] uppercase tracking-widest">
                <Library size={10} /> Для библиотекаря
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-[1.05]">
                Прощайте, <span className="text-[#ff5d8f]">тетрадки</span> и Google Sheets
              </h2>
              <p className="text-[#94a3b8] text-lg mb-8 leading-relaxed">
                Раньше нужно было записывать ручкой, кто какую книгу взял. Искать по журналу, считать на калькуляторе.
                <span className="text-white font-semibold"> Теперь всё в одном экране.</span>
              </p>

              <div className="space-y-4">
                {[
                  { icon: BookMarked, label: 'Выдать книгу — 30 секунд', color: '#e8b94e' },
                  { icon: ArrowDownToLine, label: 'Принять возврат — 1 клик', color: '#4ecdc4' },
                  { icon: Search, label: 'Найти "у кого книга" — мгновенно', color: '#60a5fa' },
                  { icon: BarChart3, label: 'Аналитика: топ читателей, графики, должники', color: '#ff5d8f' }
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${item.color}15`, color: item.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <span className="text-[#94a3b8] font-semibold">{item.label}</span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* Mockup dashboard */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-br from-[#e8b94e]/10 to-[#4ecdc4]/10 rounded-3xl blur-2xl" />
              <div className="relative bg-[#11141f] border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#ff5d8f]" />
                  <div className="w-3 h-3 rounded-full bg-[#e8b94e]" />
                  <div className="w-3 h-3 rounded-full bg-[#4ecdc4]" />
                  <div className="ml-2 text-xs text-[#5a6383] font-mono">bookify / dashboard</div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Книг', value: '254', color: '#e8b94e' },
                    { label: 'На руках', value: '38', color: '#4ecdc4' },
                    { label: 'Долги', value: '3', color: '#ff5d8f' }
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                      className="bg-[#0a0c17] border border-white/5 rounded-xl p-3"
                    >
                      <div className="text-xs text-[#5a6383] uppercase tracking-wider">{s.label}</div>
                      <div className="text-2xl font-display font-black" style={{ color: s.color }}>{s.value}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Mock activity */}
                <div className="space-y-2">
                  {[
                    { name: 'Айдана С.', book: 'Мастер и Маргарита', status: 'Выдана', color: '#e8b94e' },
                    { name: 'Тимур К.', book: '1984', status: 'Возвращена', color: '#4ecdc4' },
                    { name: 'Алия М.', book: 'Преступление и наказ.', status: 'Просрочка', color: '#ff5d8f' }
                  ].map((row, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                      className="flex items-center gap-2 p-2 rounded-xl bg-[#0a0c17] border border-white/5"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#60a5fa] to-[#1a56db] flex items-center justify-center text-xs font-bold">
                        {row.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{row.name}</div>
                        <div className="text-[10px] text-[#5a6383] truncate">{row.book}</div>
                      </div>
                      <div className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${row.color}20`, color: row.color }}>
                        {row.status}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* === ЧТО ВНУТРИ === */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tighter mb-3">
              Что внутри
            </h2>
            <p className="text-[#94a3b8] max-w-md mx-auto">Несколько фишек, которые мы сделали для удобства</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { icon: Zap, label: 'Мгновенный поиск', desc: 'Поиск по 250+ книгам за 300мс' },
              { icon: ShieldCheck, label: 'Безопасная выдача', desc: 'Каждая выдача регистрируется' },
              { icon: Calendar, label: 'Сроки возврата', desc: 'Автоматический расчёт просрочек' },
              { icon: Users, label: 'Управление учениками', desc: 'CRUD без захода в БД' },
              { icon: Award, label: 'Статистика чтения', desc: 'Топ читателей, жанры, графики' },
              { icon: Clock, label: 'История операций', desc: 'Полный audit log с фильтрами' }
            ].map((feat, i) => {
              const Icon = feat.icon
              return (
                <motion.div
                  key={i}
                  variants={fadeIn}
                  className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-[#e8b94e]/20 transition-all"
                >
                  <Icon className="text-[#e8b94e] mb-3" size={22} />
                  <div className="font-bold mb-1">{feat.label}</div>
                  <div className="text-sm text-[#5a6383]">{feat.desc}</div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section className="py-32 px-6 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-[800px] mx-auto bg-gradient-to-br from-[#11141f] to-[#0a0c17] p-12 md:p-20 rounded-[2rem] border border-white/10 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#e8b94e]/10 via-transparent to-[#4ecdc4]/10" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#e8b94e] to-transparent" />

          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="relative z-10 inline-block mb-6 text-6xl"
          >
            📚
          </motion.div>

          <h2 className="relative z-10 font-display text-3xl md:text-5xl font-black tracking-tighter mb-4">
            Готов начать читать?
          </h2>
          <p className="relative z-10 text-[#94a3b8] mb-10 max-w-md mx-auto">
            Регистрация занимает 30 секунд. Первая книга — бесплатно (ну, как и все остальные).
          </p>

          <Link
            href="/register"
            className="relative z-10 inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold text-lg rounded-2xl hover:shadow-2xl hover:shadow-[#e8b94e]/30 hover:scale-[1.02] transition-all"
          >
            Создать аккаунт <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* === FOOTER === */}
      <footer className="relative border-t border-white/5 bg-[#06070d] py-10">
        <div className="max-w-[1300px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/lb_logo.png" width={36} height={36} alt="DLS" className="opacity-60" />
            <div className="text-xs text-[#5a6383]">
              © 2026 <span className="text-[#94a3b8] font-semibold">Bookify</span> · Divergents Leadership School
            </div>
          </div>
          <div className="text-xs text-[#5a6383]">
            Сделано <Heart className="inline w-3 h-3 text-[#ff5d8f]" /> для настоящих читателей
          </div>
        </div>
      </footer>
    </main>
  )
}