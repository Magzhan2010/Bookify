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
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } }
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
}

export default function LandingPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 160])
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0])

  return (
    <main className="min-h-screen bg-white text-[#1d1d1f] overflow-x-hidden">

      {/* === NAV === */}
      <nav className="fixed top-0 w-full z-50 bg-white/75 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-[1200px] mx-auto px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white ring-1 ring-black/5">
              <Image src="/lb_logo.png" width={36} height={36} alt="DLS" className="object-contain" />
            </div>
            <div className="font-semibold text-[17px] tracking-tight">Bookify</div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:block px-4 py-2 text-[14px] text-[#1d1d1f] hover:text-[#1a56db] transition-colors font-medium">
              Войти
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[14px] font-medium transition-colors"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </nav>

      {/* === HERO === */}
      <section ref={heroRef} className="relative pt-32 md:pt-44 pb-20 md:pb-28 px-6">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-[1100px] mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-7 px-3 py-1 bg-[#1a56db]/8 border border-[#1a56db]/15 rounded-full text-[12px] font-medium text-[#1a56db]"
          >
            <Sparkles size={12} /> Цифровая библиотека DLS
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-7xl md:text-8xl font-semibold tracking-[-0.035em] leading-[0.95] mb-6 text-[#1d1d1f]"
          >
            Возьми книгу.<br />
            <span className="text-[#1a56db]">Онлайн.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[19px] md:text-[21px] text-[#6e6e73] mb-10 max-w-2xl mx-auto leading-[1.45]"
          >
            Платформа библиотеки Divergents Leadership School.
            <span className="text-[#1d1d1f]"> 250+ книг</span> в каталоге,
            <span className="text-[#1d1d1f]"> мгновенный поиск</span>,
            <span className="text-[#1d1d1f]"> статистика чтения</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-16"
          >
            <Link
              href="/register"
              className="group px-7 py-3 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[16px] font-medium flex items-center justify-center gap-2 transition-all shadow-[0_8px_24px_rgba(26,86,219,0.25)]"
            >
              Начать читать <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/library"
              className="px-7 py-3 rounded-xl bg-white border border-black/10 text-[#1d1d1f] text-[16px] font-medium hover:bg-black/[0.03] transition-all flex items-center justify-center gap-2"
            >
              <Library size={16} /> Каталог
            </Link>
          </motion.div>

          {/* Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="relative max-w-[820px] mx-auto"
          >
            <div className="absolute -inset-x-12 -inset-y-6 bg-gradient-to-br from-[#1a56db]/8 to-transparent rounded-[40px] blur-2xl" />
            <div className="relative bg-white border border-black/8 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="flex items-center gap-1.5 px-5 py-3 border-b border-black/5 bg-[#fafafa]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <div className="ml-auto text-xs text-[#86868b] font-mono">bookify.dls/library</div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Книг', value: '254', color: '#1a56db' },
                    { label: 'На руках', value: '38', color: '#ff9500' },
                    { label: 'Читателей', value: '142', color: '#34c759' }
                  ].map((s, i) => (
                    <div key={i} className="bg-[#fafafa] rounded-2xl p-4 text-left">
                      <div className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium mb-1">{s.label}</div>
                      <div className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {[
                    { name: 'Айдана С.', book: 'Мастер и Маргарита', status: 'Выдана' },
                    { name: 'Тимур К.', book: '1984', status: 'Возвращена' },
                    { name: 'Алия М.', book: 'Преступление и наказ.', status: 'Просрочка' }
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[#fafafa] rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a56db] to-[#3b82f6] flex items-center justify-center text-xs font-semibold text-white">
                        {row.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{row.name}</div>
                        <div className="text-[11px] text-[#86868b] truncate">{row.book}</div>
                      </div>
                      <div className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        row.status === 'Выдана' ? 'bg-[#1a56db]/10 text-[#1a56db]' :
                        row.status === 'Возвращена' ? 'bg-[#34c759]/10 text-[#34c759]' :
                        'bg-[#ff3b30]/10 text-[#ff3b30]'
                      }`}>
                        {row.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#86868b]"
        >
          <ChevronDown size={20} />
        </motion.div>
      </section>

      {/* === STATS === */}
      <section className="py-14 px-6 border-y border-black/5 bg-[#fafafa]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {[
            { num: '250+', label: 'Книг в каталоге' },
            { num: '24/7', label: 'Доступ из любой точки' },
            { num: '< 30 сек', label: 'Поиск книги' },
            { num: '1 клик', label: 'Чтобы взять' }
          ].map((s, i) => (
            <motion.div key={i} variants={fadeIn}>
              <div className="text-4xl md:text-5xl font-semibold text-[#1d1d1f] mb-1 tracking-tight">{s.num}</div>
              <div className="text-[12px] md:text-[13px] text-[#86868b] font-medium">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* === КАК ЭТО РАБОТАЕТ === */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeIn} className="inline-block mb-4 text-[12px] font-medium text-[#1a56db] uppercase tracking-[0.15em]">
              Для учеников
            </motion.div>
            <motion.h2 variants={fadeIn} className="text-4xl md:text-6xl font-semibold tracking-[-0.025em] mb-4 text-[#1d1d1f]">
              Три шага до книги
            </motion.h2>
            <motion.p variants={fadeIn} className="text-[19px] text-[#6e6e73] max-w-xl mx-auto">
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
              { icon: Search, title: 'Найди', desc: 'Вбил название или жанр — нашёл за пару секунд. Фильтры, превью, описания.', color: '#1a56db' },
              { icon: BookMarked, title: 'Возьми', desc: 'Бронируешь онлайн. Приходишь в удобный час — библиотекарь выдаёт. Никакой бюрократии.', color: '#34c759' },
              { icon: BarChart3, title: 'Читай', desc: 'В профиле виден прогресс: сколько прочитал, какие жанры, цель на год.', color: '#ff9500' }
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={i}
                  variants={fadeIn}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white border border-black/8 rounded-[24px] p-8 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: `${step.color}12`, color: step.color }}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="text-[12px] text-[#86868b] font-medium mb-1">0{i + 1}</div>
                  <h3 className="text-[24px] font-semibold mb-2 text-[#1d1d1f] tracking-tight">{step.title}</h3>
                  <p className="text-[15px] text-[#6e6e73] leading-[1.5]">{step.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* === ДЛЯ БИБЛИОТЕКАРЯ === */}
      <section className="py-24 md:py-32 px-6 bg-[#fafafa] border-y border-black/5">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-block mb-4 text-[12px] font-medium text-[#1a56db] uppercase tracking-[0.15em]">
                Для библиотекаря
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.025em] mb-6 leading-[1.05] text-[#1d1d1f]">
                Прощайте, тетрадки и Google Sheets
              </h2>
              <p className="text-[19px] text-[#6e6e73] mb-10 leading-[1.5]">
                Раньше нужно было записывать ручкой, кто какую книгу взял. Искать по журналу, считать на калькуляторе.
                <span className="text-[#1d1d1f]"> Теперь всё в одном экране.</span>
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
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${item.color}12`, color: item.color }}
                      >
                        <Icon size={16} />
                      </div>
                      <span className="text-[16px] text-[#1d1d1f] font-medium">{item.label}</span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* Mockup dashboard */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="bg-white border border-black/8 rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="flex items-center gap-1.5 px-5 py-3 border-b border-black/5 bg-[#fafafa]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="font-semibold text-[15px]">Выдать книгу</div>
                    <div className="text-[11px] text-[#86868b]">шаг 2 из 3</div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { name: 'Айдана С.', cls: '10-А' },
                      { name: 'Тимур К.', cls: '11-Б' },
                      { name: 'Алия М.', cls: '9-А' }
                    ].map((s, i) => (
                      <div key={i} className={`p-3 rounded-xl flex items-center gap-3 ${
                        i === 0 ? 'bg-[#1a56db]/8 border border-[#1a56db]/20' : 'bg-[#fafafa]'
                      }`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[13px] ${
                          i === 0 ? 'bg-[#1a56db] text-white' : 'bg-white border border-black/10 text-[#1d1d1f]'
                        }`}>
                          {s.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-medium truncate">{s.name}</div>
                          <div className="text-[11px] text-[#86868b]">{s.cls}</div>
                        </div>
                        {i === 0 && <div className="text-[11px] text-[#1a56db] font-medium">Выбрано</div>}
                      </div>
                    ))}
                  </div>
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
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.025em] mb-3 text-[#1d1d1f]">
              Что внутри
            </h2>
            <p className="text-[18px] text-[#6e6e73] max-w-md mx-auto">Несколько фишек, которые мы сделали для удобства</p>
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
                  className="p-5 bg-white border border-black/8 rounded-2xl hover:border-[#1a56db]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
                >
                  <Icon className="text-[#1a56db] mb-3" size={20} />
                  <div className="font-semibold mb-1 text-[15px]">{feat.label}</div>
                  <div className="text-[13px] text-[#86868b] leading-relaxed">{feat.desc}</div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section className="py-24 md:py-32 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-[800px] mx-auto bg-[#1d1d1f] text-white p-12 md:p-20 rounded-[32px] text-center relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#1a56db]/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#3b82f6]/20 rounded-full blur-3xl" />

          <motion.div
            animate={{ rotate: [0, 4, -4, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="relative z-10 inline-block mb-6 text-6xl"
          >
            📚
          </motion.div>

          <h2 className="relative z-10 text-3xl md:text-5xl font-semibold tracking-[-0.025em] mb-4">
            Готов начать читать?
          </h2>
          <p className="relative z-10 text-[#86868b] mb-10 max-w-md mx-auto text-[17px]">
            Регистрация занимает 30 секунд. Первая книга — бесплатно.
          </p>

          <Link
            href="/register"
            className="relative z-10 inline-flex items-center gap-2 px-9 py-3.5 bg-white text-[#1d1d1f] text-[16px] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
          >
            Создать аккаунт <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-black/5 bg-[#fafafa] py-10">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/lb_logo.png" width={28} height={28} alt="DLS" className="opacity-70" />
            <div className="text-[13px] text-[#6e6e73]">
              © 2026 <span className="text-[#1d1d1f] font-medium">Bookify</span> · Divergents Leadership School
            </div>
          </div>
          <div className="text-[13px] text-[#86868b]">
            Сделано <Heart className="inline w-3.5 h-3.5 text-[#ff2d55]" /> для настоящих читателей
          </div>
        </div>
      </footer>
    </main>
  )
}