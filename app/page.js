'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, FileCheck, TrendingUp, AlertTriangle, FolderOpen, Target, Users, Zap } from 'lucide-react'

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#020817] text-white font-sans overflow-x-hidden relative">

      {/* ДЕКОР ФОНА */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 1. NAV */}
      <nav className="fixed top-0 w-full z-50 bg-[#020817]/80 backdrop-blur-xl border-b border-[#162236]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative overflow-hidden rounded-lg bg-blue-500/10 p-0.5">
              <Image src="/lb_logo.png" width={50} height={50} alt="Bookify" className="object-contain" />
            </div>
            <h1 className="font-black text-xl tracking-tight">
              Book<span className="text-[#1a56db]">ify</span>
            </h1>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-[#4a6080] hover:text-white transition hidden sm:block">
              Войти
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 bg-[#1a56db] rounded-xl text-sm font-semibold hover:bg-blue-500 transition shadow-lg shadow-blue-500/20"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="pt-40 pb-24 px-6 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={container}
          className="max-w-[900px] mx-auto text-center"
        >
          <motion.div variants={fadeInUp}>
            <span className="inline-block mb-6 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-bold text-blue-400 uppercase tracking-widest">
              Проект Divergents School
            </span>
          </motion.div>

          <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-black mb-8 leading-tight">
            Перестань читать <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">'для галочки'.</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-[#94a3b8] text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            90% информации забывается через неделю. Bookify превращает пассивное чтение книг в осознанный навык через систему отчетов и обратной связи от ИИ.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1a56db] rounded-2xl font-bold hover:bg-blue-500 transition shadow-xl shadow-blue-500/25 active:scale-95"
            >
              Начать учиться глубже <ArrowRight size={18} />
            </Link>
            <Link
              href="/library"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[#162236] rounded-2xl font-semibold text-[#94a3b8] hover:bg-white/5 transition"
            >
              Смотреть каталог
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* 3. ПРОБЛЕМА */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-[#0d1a2e]/50 border border-red-500/10 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center"
          >
            <div className="shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="text-red-400" size={40} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3 text-white">Знакомая ситуация?</h3>
              <p className="text-[#94a3b8] leading-relaxed mb-4">
                Берешь список из множества книг, читаешь пару вечеров, закрываешь последнюю страницу... и через месяц не можешь вспомнить даже сюжет. Это пустая трата сил, когда в реальном деле тебе не на что опереться
              </p>
              <p className="text-red-400/80 font-medium text-sm">
                Проблема: мозг не запоминает то, что не используется на практике.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6 relative z-10">
        <div className="max-w-[1000px] mx-auto text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-black mb-4"
          >
            Система, которая <span className="text-[#1a56db]">работает</span>
          </motion.h2>
          <p className="text-[#4a6080] max-w-lg mx-auto">Железобетонный алгоритм из 3 шагов, который заставляет мозг структурировать информацию</p>
        </div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={container}
          className="max-w-[1000px] mx-auto grid md:grid-cols-3 gap-6"
        >
          <motion.div variants={fadeInUp} className="bg-[#0d1a2e] p-8 rounded-2xl border border-[#162236] hover:border-[#1a56db]/50 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5 group-hover:bg-blue-500/20 transition">
              <BookOpen className="text-[#60a5fa]" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">1. Взял книгу</h3>
            <p className="text-[#4a6080] text-sm leading-relaxed">
              Выбираешь книгу из каталога и нажимаешь "Начать чтение". Запускается таймер твоей ответственности перед собой.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="bg-[#0d1a2e] p-8 rounded-2xl border border-[#162236] hover:border-[#1a56db]/50 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition">
              <FileCheck className="text-green-400" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">2. Сдал отчет</h3>
            <p className="text-[#4a6080] text-sm leading-relaxed">
              Написал анализ, реферат или выделил главные мысли прямо в приложении. Формулирование мыслей на письме — лучший способ перевести в долговременную память.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="bg-[#0d1a2e] p-8 rounded-2xl border border-[#162236] hover:border-[#1a56db]/50 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-5 group-hover:bg-purple-500/20 transition">
              <TrendingUp className="text-purple-400" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">3. Получил зачет</h3>
            <p className="text-[#4a6080] text-sm leading-relaxed">
              ИИ проверяет твой отчет. Книга переходит в статус "Прочитано". Ты действительно усвоил материал, а не просто пролистал страницы.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-24 px-6 relative z-10">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Почему не просто <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600">'скинуть файлы'</span>?
            </h2>
            <p className="text-[#4a6080] max-w-xl mx-auto">Google Drive хорош для хранения. Bookify создан для усвоения.</p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={container}
            className="grid md:grid-cols-2 gap-6"
          >
            <motion.div variants={fadeInUp} className="flex gap-5 bg-[#0d1a2e]/50 p-6 rounded-2xl border border-[#162236]">
              <FolderOpen className="text-red-400/60 shrink-0 mt-1" size={28} />
              <div>
                <h4 className="font-bold text-lg mb-1 text-white/60">Обычная папка</h4>
                <p className="text-sm text-[#4a6080]">Скачал, закрыл, забыл. Никто не знает, читал ты ее или нет. Нулевая дисциплина.</p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex gap-5 bg-[#0d1a2e] p-6 rounded-2xl border border-[#1a56db]/30 shadow-lg shadow-blue-500/5">
              <Target className="text-[#60a5fa] shrink-0 mt-1" size={28} />
              <div>
                <h4 className="font-bold text-lg mb-1 text-white">Bookify</h4>
                <p className="text-sm text-[#94a3b8]">Взял книгу — она в твоем активе. Написал отчет — закрепил знания. Это геймификация учебного процесса.</p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex gap-5 bg-[#0d1a2e]/50 p-6 rounded-2xl border border-[#162236]">
              <Users className="text-red-400/60 shrink-0 mt-1" size={28} />
              <div>
                <h4 className="font-bold text-lg mb-1 text-white/60">Случайные отзывы</h4>
                <p className="text-sm text-[#4a6080]">Комментарии в чате или документе тонут в спаме. Нет структуры и нет оценки качества.</p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex gap-5 bg-[#0d1a2e] p-6 rounded-2xl border border-[#1a56db]/30 shadow-lg shadow-blue-500/5">
              <Zap className="text-[#60a5fa] shrink-0 mt-1" size={28} />
              <div>
                <h4 className="font-bold text-lg mb-1 text-white">Живая проверка</h4>
                <p className="text-sm text-[#94a3b8]">Твой отчет видит куратор. Ты получаешь не просто "зачет", а обратную связь от живого человека.</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 6. НОВАЯ СЕКЦИЯ: Инструменты (Факты) */}
      <section className="py-24 px-6 relative z-10 border-y border-[#162236]">
        <div className="max-w-[1000px] mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={container}
            className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center"
          >
            <motion.div variants={fadeInUp}>
              <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-2">1 клик</p>
              <p className="text-sm text-[#4a6080]">Чтобы взять книгу в работу</p>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-2">24/7</p>
              <p className="text-sm text-[#4a6080]">Доступ к каталогу и PDF с телефона</p>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-2">100%</p>
              <p className="text-sm text-[#4a6080]">Контроль за каждым прочитанным словом</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 7. ФИНАЛЬНЫЙ CTA */}
      <section className="py-32 px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-[800px] mx-auto bg-gradient-to-br from-[#0d1a2e] to-[#0f172a] p-12 md:p-20 rounded-[2rem] border border-[#162236] text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1a56db] to-transparent"></div>
          
          <h2 className="text-3xl md:text-4xl font-black mb-6">
            Готов перестать тратить время впустую?
          </h2>
          <p className="text-[#94a3b8] mb-10 max-w-md mx-auto">
            Присоединяйся к тем, кто выбирает качество знаний, а не количество прочитанных страниц.
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 bg-[#1a56db] rounded-xl font-bold hover:bg-blue-500 transition shadow-xl shadow-blue-500/25 active:scale-95 text-lg"
          >
            Создать аккаунт
          </Link>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-[#162236] bg-[#0b111b]/20 py-8 backdrop-blur-sm">
        <div className="container mx-auto px-4 flex flex-col items-center gap-6">
                      
          <div className="group relative">
            <div className="absolute -inset-2 rounded-full bg-[#4a6080]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img 
                src="/lb_logo.png" 
                alt="dls-library logo" 
                className="relative opacity-80 hover:scale-110 transition-all duration-300"
                width={55} 
                height={55}
              />
            </div>

            <div className="text-center space-y-2">
              <p className="text-[#4a6080] text-sm tracking-tight">
                © 2026 <span className="text-[#6b85a8] font-semibold">Bookify</span>. 
                <span className="opacity-70 ml-1">Divergents Leadership School.</span>
              </p>
                        
              <p className="text-[14px] text-[#25334a] font-bold">
                Designed & Developed by 
                <span className="ml-2 text-white hover:text-blue-400 transition-colors cursor-pointer border-b border-transparent hover:border-blue-400/30 pb-0.5">
                  Magzhan,Yersultan(added books)
                </span>
              </p>
          </div>
                      
        </div>
      </footer>

    </main>
  )
}