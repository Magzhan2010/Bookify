'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, BookMarked, ArrowDownToLine, AlertTriangle, Users,
  TrendingUp, Clock
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

const StatCard = ({ icon: Icon, label, value, accent, href, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Link
      href={href || '#'}
      className="group block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-border-strong)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}12`, color: accent }}
        >
          <Icon size={18} />
        </div>
      </div>
      <div className="text-[32px] font-semibold tracking-tight mb-1 text-[var(--color-text-primary)]">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">{label}</div>
    </Link>
  </motion.div>
)

export default function LibrarianDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setData(await res.json())
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
        <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[#1a56db] rounded-full animate-spin" />
      </div>
    )
  }

  const t = data?.totals || {}
  const debtors = data?.debtors || []
  const recent = data?.recent || []
  const timeline = data?.timeline || []

  return (
    <div className="max-w-[1300px] mx-auto space-y-6">

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[var(--color-text-primary)]">
            Добро пожаловать
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/librarian/issue" className="px-4 py-2.5 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-[13px] font-medium transition-colors flex items-center gap-2">
            <BookMarked size={14} /> Выдать книгу
          </Link>
          <Link href="/librarian/returns" className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[13px] font-medium hover:bg-[var(--color-bg-soft)] transition-colors flex items-center gap-2">
            <ArrowDownToLine size={14} /> Принять возврат
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Книг в фонде" value={t.total_books || 0} accent="#1a56db" href="/librarian/lookup" delay={0} />
        <StatCard icon={BookMarked} label="На руках" value={t.books_on_hands || 0} accent="#ff9500" href="/librarian/returns" delay={0.05} />
        <StatCard icon={Users} label="Активные читатели" value={t.active_readers_30d || 0} accent="#34c759" href="/librarian/students" delay={0.1} />
        <StatCard icon={AlertTriangle} label="Просрочки" value={t.overdue_loans || 0} accent={t.overdue_loans > 0 ? '#ff3b30' : '#86868b'} href="/librarian/lookup?overdue=true" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Активность за 30 дней</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">Выдачи и возвраты</p>
            </div>
            <TrendingUp size={16} className="text-[var(--color-brand)]" />
          </div>
          <div className="h-64">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="g-borrows" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1a56db" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1a56db" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-returns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34c759" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#34c759" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f7" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#86868b', fontSize: 11 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#86868b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="borrows_count" stroke="#1a56db" strokeWidth={2} fill="url(#g-borrows)" name="Выдачи" />
                  <Area type="monotone" dataKey="returns_count" stroke="#34c759" strokeWidth={2} fill="url(#g-returns)" name="Возвраты" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--color-text-tertiary)] text-[13px]">Нет активности</div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Должники</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">Просроченные</p>
            </div>
            <Clock size={16} className="text-[var(--color-danger)]" />
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {debtors.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-tertiary)] text-[13px]">Все вернули вовремя</div>
            ) : debtors.slice(0, 8).map(d => (
              <Link href="/librarian/returns" key={d.borrow_id} className="block p-3 rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[13px] truncate text-[var(--color-text-primary)]">{d.student_name}</div>
                    <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{d.book_title}</div>
                  </div>
                  <div className="text-[11px] font-semibold text-[var(--color-danger)] shrink-0">−{d.overdue_days}д</div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Последние выдачи</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">Что происходило</p>
            </div>
            <Link href="/librarian/history" className="text-[12px] text-[var(--color-brand)] hover:underline font-medium">Все →</Link>
          </div>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-text-tertiary)] text-[13px]">Выдач пока нет</div>
            ) : recent.map(r => (
              <div key={r.borrow_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors">
                <div className="w-9 h-12 rounded-lg bg-[var(--color-bg-soft)] overflow-hidden shrink-0">
                  {r.cover_url && <img src={r.cover_url} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px] truncate text-[var(--color-text-primary)]">{r.title}</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{r.student_name} · {r.class_name || '—'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">{new Date(r.borrowed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6"
        >
          <h3 className="text-[16px] font-semibold mb-1 text-[var(--color-text-primary)]">Топ жанров</h3>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mb-5">Что читают ученики</p>
          <div className="space-y-3">
            {data?.genres?.slice(0, 6).map((g, i) => {
              const max = data.genres[0]?.count || 1
              const pct = (g.count / max) * 100
              return (
                <div key={g.genre}>
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="font-medium text-[var(--color-text-primary)]">{g.genre}</span>
                    <span className="text-[var(--color-text-tertiary)]">{g.count}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--color-bg-soft)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                      className="h-full bg-[var(--color-brand)] rounded-full"
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