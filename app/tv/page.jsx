'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Экран для холла (DLS TV): лидеры месяца, лучший класс, цитата дня, новые книги.
 * Открывается по ссылке /tv?key=… (ссылку видит библиотекарь в «Аналитике»).
 * Сцены сменяются сами, данные обновляются каждые 5 минут.
 */
const SCENE_MS = 14000

export default function TvPage() {
  return (
    <Suspense fallback={null}>
      <Tv />
    </Suspense>
  )
}

function Tv() {
  const key = useSearchParams().get('key') || ''
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [scene, setScene] = useState(0)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/tv?key=${encodeURIComponent(key)}`, { cache: 'no-store' })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || 'Ошибка')
        setData(d); setError('')
      } catch (e) { setError(e.message) }
    }
    load()
    const t = setInterval(load, 5 * 60000)
    return () => clearInterval(t)
  }, [key])

  const scenes = data ? ['leaders', ...(data.quote ? ['quote'] : []), 'books'] : []
  useEffect(() => {
    if (!scenes.length) return
    const t = setInterval(() => setScene(s => (s + 1) % scenes.length), SCENE_MS)
    return () => clearInterval(t)
  }, [scenes.length])
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])

  const month = new Date().toLocaleDateString('ru-RU', { month: 'long' }).replace(/^./, c => c.toUpperCase())
  const current = scenes[scene % (scenes.length || 1)]

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0b1430] text-white" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>
      <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(1200px 700px at 85% -10%, #2f5bea55, transparent), radial-gradient(900px 600px at -10% 110%, #c98a1233, transparent)' }} />

      <header className="relative flex items-center justify-between px-[4vw] pt-[3vh]">
        <div className="flex items-center gap-[1vw]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lb_logo.png" alt="" className="w-[4.5vw] h-[4.5vw] object-contain" />
          <div>
            <div className="text-[2.2vw] font-bold leading-none">Bookify</div>
            <div className="text-[1vw] tracking-[0.25em] uppercase text-[#9db4ff] mt-[0.4vw]">Read · Think · Speak · Create · Lead</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[2.6vw] font-semibold tabular-nums leading-none">{now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="text-[1.1vw] text-white/60 mt-[0.4vw]">{now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </header>

      <main className="relative h-[78vh] px-[4vw] pt-[3vh]">
        {error && <div className="h-full flex items-center justify-center text-[2vw] text-white/70">{error}</div>}
        <AnimatePresence mode="wait">
          {data && current === 'leaders' && (
            <motion.section key="leaders" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.8 }}
              className="h-full grid grid-cols-[1.4fr_1fr] gap-[3vw]">
              <div>
                <div className="text-[1.3vw] uppercase tracking-[0.2em] text-[#e6ae3a] font-semibold">Лидеры чтения · {month}</div>
                <div className="mt-[2vh] space-y-[1.2vh]">
                  {data.leaders.length === 0 && <div className="text-[2vw] text-white/60 mt-[6vh]">В этом месяце рейтинг только начинается — стань первым!</div>}
                  {data.leaders.slice(0, 7).map((l, i) => (
                    <motion.div key={l.id} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }}
                      className={`flex items-center gap-[1.4vw] px-[1.4vw] py-[1.2vh] rounded-[1.2vw] ${i === 0 ? 'bg-gradient-to-r from-[#e6ae3a] to-[#c98a12] text-[#1f2a5c]' : 'bg-white/[0.06]'}`}>
                      <div className={`w-[2.6vw] text-center text-[2vw] font-bold ${i === 0 ? '' : 'text-white/50'}`}>{i + 1}</div>
                      <Avatar l={l} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[1.8vw] font-bold truncate">{l.name}</div>
                        {(l.is_teacher || l.class_name) && <div className={`text-[1.1vw] ${i === 0 ? 'text-[#1f2a5c]/70' : 'text-white/50'}`}>{l.is_teacher ? 'Учитель' : `${l.class_name} класс`}</div>}
                      </div>
                      <div className="text-[2.2vw] font-extrabold tabular-nums">{l.points}<span className="text-[1.1vw] font-semibold ml-[0.4vw] opacity-70">монет</span></div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-[2vh]">
                {data.best_classes[0] && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
                    className="rounded-[2vw] p-[2vw] bg-gradient-to-br from-[#2f5bea] to-[#1f3a78]">
                    <div className="text-[1.1vw] uppercase tracking-[0.2em] text-white/70 font-semibold">Лучший класс месяца</div>
                    <div className="text-[6vw] font-extrabold leading-none mt-[1vh]">{data.best_classes[0].class_name}</div>
                    <div className="text-[1.5vw] mt-[1vh] text-white/80">{data.best_classes[0].points} монет · читают {data.best_classes[0].readers} учеников</div>
                    <div className="flex flex-wrap gap-[0.6vw] mt-[2vh]">
                      {data.best_classes.slice(1, 5).map((c, i) => (
                        <span key={c.class_name} className="px-[1vw] py-[0.5vh] rounded-full bg-white/15 text-[1.1vw] font-semibold">{i + 2}. {c.class_name} · {c.points}</span>
                      ))}
                    </div>
                  </motion.div>
                )}
                <div className="grid grid-cols-2 gap-[1vw]">
                  <Stat label="книг прочитано" value={data.stats.books_read} />
                  <Stat label="отзывов" value={data.stats.reviews} />
                  <Stat label="монет заработано" value={data.stats.coins} />
                  <Stat label="читают сейчас" value={data.stats.reading_now} />
                </div>
              </div>
            </motion.section>
          )}

          {data && current === 'quote' && (
            <motion.section key="quote" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.9 }}
              className="h-full flex items-center gap-[4vw]">
              <div className="w-[18vw] h-[18vw] rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-[#2f5bea] to-[#1f3a78] flex items-center justify-center text-[6vw] font-bold">
                {data.quote.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={data.quote.image_url} alt="" className="w-full h-full object-cover" />
                  : data.quote.author_name?.[0]}
              </div>
              <div>
                <div className="text-[1.3vw] uppercase tracking-[0.2em] text-[#e6ae3a] font-semibold">Цитата дня</div>
                <blockquote className="text-[3.6vw] font-semibold leading-[1.2] mt-[2vh]">«{data.quote.text}»</blockquote>
                <div className="text-[2vw] font-bold mt-[3vh]">{data.quote.author_name}</div>
                {data.quote.book_title && <div className="text-[1.4vw] text-white/60 mt-[0.5vh]">{data.quote.book_title}</div>}
              </div>
            </motion.section>
          )}

          {data && current === 'books' && (
            <motion.section key="books" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.8 }}
              className="h-full flex flex-col">
              <div className="text-[1.3vw] uppercase tracking-[0.2em] text-[#e6ae3a] font-semibold">Новые книги в библиотеке</div>
              <div className="grid grid-cols-4 gap-[2vw] mt-[3vh] flex-1">
                {data.new_books.slice(0, 4).map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 40, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.2 + i * 0.15 }}>
                    <div className="aspect-[2/3] rounded-[1vw] overflow-hidden bg-white/10 shadow-[0_2vw_4vw_rgba(0,0,0,0.4)]">
                      {b.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={b.cover_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-end p-[1vw] text-[1.6vw] font-bold bg-gradient-to-br from-[#2f5bea] to-[#1f3a78]">{b.title}</div>}
                    </div>
                    <div className="text-[1.4vw] font-bold mt-[1.2vh] line-clamp-1">{b.title}</div>
                    <div className="text-[1.1vw] text-white/60 line-clamp-1">{b.author}</div>
                  </motion.div>
                ))}
              </div>
              <div className="text-[1.6vw] text-white/80 mt-[2vh]">Возьми книгу на <b>bookify-dls.vercel.app</b> — читай, пиши отзыв и получай монеты 🪙</div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* полоска до следующей сцены */}
      {scenes.length > 1 && (
        <div className="absolute left-[4vw] right-[4vw] bottom-[3vh] flex gap-[0.6vw]">
          {scenes.map((s, i) => (
            <div key={s} className="flex-1 h-[0.5vh] rounded-full bg-white/15 overflow-hidden">
              {i === scene % scenes.length && (
                <motion.div key={`${s}-${scene}`} className="h-full bg-white/80" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: SCENE_MS / 1000, ease: 'linear' }} />
              )}
              {i < scene % scenes.length && <div className="h-full bg-white/80" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Avatar({ l }) {
  return (
    <div className="w-[3.6vw] h-[3.6vw] rounded-full overflow-hidden shrink-0 bg-white/20 flex items-center justify-center text-[1.6vw] font-bold">
      {l.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={l.avatar_url} alt="" className="w-full h-full object-cover" />
        : l.name?.[0]}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[1.4vw] p-[1.4vw] bg-white/[0.06]">
      <div className="text-[3vw] font-extrabold tabular-nums leading-none">{value ?? 0}</div>
      <div className="text-[1.1vw] text-white/60 mt-[0.8vh]">{label}</div>
    </div>
  )
}
