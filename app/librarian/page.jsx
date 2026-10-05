'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookMarked, ArrowDownToLine, AlertTriangle, Users, BookOpen,
  TrendingUp, Clock, ArrowRight
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

const StatCard = ({ icon: Icon, label, value, accent, href, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Link
      href={href || '#'}
      className="group block bg-[#11141f] border border-white/5 rounded-2xl p-5 hover:border-[#e8b94e]/30 hover:bg-[#11141f]/80 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}20`, color: accent }}
        >
          <Icon size={20} />
        </div>
        <ArrowRight size={16} className="text-[#5a6383] group-hover:text-[#e8b94e] group-hover:translate-x-1 transition-all" />
      </div>
      <div className="text-3xl font-black font-display mb-1">{value}</div>
      <div className="text-xs uppercase tracking-widest text-[#5a6383] font-semibold">{label}</div>
    </Link>
  </motion.div>
)

export default function LibrarianDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
      </div>
    )
  }

  const t = data?.totals || {}
  const debtors = data?.debtors || []
  const recent = data?.recent || []
  const timeline = data?.timeline || []

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight mb-1">
            Добро пожаловать, <span className="text-gradient-gold">Библиотекарь</span>
          </h1>
          <p className="text-[#94a3b8]">Сегодня {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/librarian/issue" className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold text-sm hover:shadow-lg hover:shadow-[#e8b94e]/30 transition-all flex items-center gap-2">
            <BookMarked size={16} /> Выдать книгу
          </Link>
          <Link href="/librarian/returns" className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all flex items-center gap-2">
            <ArrowDownToLine size={16} /> Принять возврат
          </Link>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Книг в фонде"
          value={t.total_books || 0}
          accent="#e8b94e"
          href="/librarian/lookup"
          delay={0}
        />
        <StatCard
          icon={BookMarked}
          label="На руках"
          value={t.books_on_hands || 0}
          accent="#4ecdc4"
          href="/librarian/returns"
          delay={0.05}
        />
        <StatCard
          icon={Users}
          label="Активные читатели"
          value={t.active_readers_30d || 0}
          accent="#60a5fa"
          href="/librarian/students"
          delay={0.1}
        />
        <StatCard
          icon={AlertTriangle}
          label="Просрочки"
          value={t.overdue_loans || 0}
          accent={t.overdue_loans > 0 ? '#ff5d8f' : '#5a6383'}
          href="/librarian/lookup?overdue=true"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-[#11141f] border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-bold text-lg">Активность за 30 дней</h3>
              <p className="text-xs text-[#5a6383] mt-0.5">Выдачи и возвраты</p>
            </div>
            <TrendingUp size={18} className="text-[#e8b94e]" />
          </div>
          <div className="h-64">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="g-borrows" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e8b94e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#e8b94e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-returns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ecdc4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#4ecdc4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1f30" />
                  <XAxis dataKey="day" tick={{ fill: '#5a6383', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fill: '#5a6383', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#0a0c17',
                      border: '1px solid #1a1f30',
                      borderRadius: 12,
                      fontSize: 12
                    }}
                  />
                  <Area type="monotone" dataKey="borrows_count" stroke="#e8b94e" strokeWidth={2} fill="url(#g-borrows)" name="Выдачи" />
                  <Area type="monotone" dataKey="returns_count" stroke="#4ecdc4" strokeWidth={2} fill="url(#g-returns)" name="Возвраты" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#5a6383] text-sm">
                Нет активности за последние 30 дней
              </div>
            )}
          </div>
        </motion.div>

        {/* Debtors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#11141f] border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg">Должники</h3>
              <p className="text-xs text-[#5a6383] mt-0.5">Просроченные книги</p>
            </div>
            <Clock size={18} className="text-[#ff5d8f]" />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {debtors.length === 0 ? (
              <div className="text-center py-8 text-[#5a6383] text-sm">
                🎉 Все вернули вовремя
              </div>
            ) : (
              debtors.slice(0, 8).map(d => (
                <Link
                  href="/librarian/returns"
                  key={d.borrow_id}
                  className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{d.student_name}</div>
                      <div className="text-xs text-[#5a6383] truncate">{d.book_title}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[#ff5d8f]">−{d.overdue_days}д</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent activity + Top genres */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-[#11141f] border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg">Последние выдачи</h3>
              <p className="text-xs text-[#5a6383] mt-0.5">Что происходило в библиотеке</p>
            </div>
            <Link href="/librarian/history" className="text-xs text-[#e8b94e] hover:underline">
              Все →
            </Link>
          </div>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <div className="text-center py-10 text-[#5a6383] text-sm">
                Выдач пока нет — выдайте первую книгу!
              </div>
            ) : recent.map(r => (
              <div key={r.borrow_id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-10 h-14 rounded bg-gradient-to-br from-[#1a1f30] to-[#0a0c17] overflow-hidden shrink-0">
                  {r.cover_url && <img src={r.cover_url} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.title}</div>
                  <div className="text-xs text-[#5a6383] truncate">
                    {r.student_name} · {r.class_name || '—'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-[#5a6383]">{new Date(r.borrowed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[#11141f] border border-white/5 rounded-2xl p-6"
        >
          <h3 className="font-display font-bold text-lg mb-1">Топ жанров</h3>
          <p className="text-xs text-[#5a6383] mb-5">Что читают ученики</p>
          <div className="space-y-3">
            {data?.genres?.slice(0, 6).map(g => {
              const max = data.genres[0]?.count || 1
              const pct = (g.count / max) * 100
              return (
                <div key={g.genre}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">{g.genre}</span>
                    <span className="text-[#5a6383]">{g.count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-[#e8b94e] to-[#9c6f25]"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}