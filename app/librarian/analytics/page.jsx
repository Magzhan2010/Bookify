'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area
} from 'recharts'
import {
  TrendingUp, BookOpen, Users, Award, AlertTriangle, Calendar
} from 'lucide-react'

const COLORS = ['#e8b94e', '#4ecdc4', '#ff5d8f', '#60a5fa', '#a78bfa', '#fb923c', '#34d399', '#f472b6']

const StatBlock = ({ icon: Icon, label, value, hint, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-[#11141f] border border-white/5 rounded-2xl p-5"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, color }}>
        <Icon size={20} />
      </div>
    </div>
    <div className="text-3xl font-black font-display mb-1">{value}</div>
    <div className="text-xs uppercase tracking-widest text-[#5a6383] font-semibold mb-1">{label}</div>
    {hint && <div className="text-xs text-[#94a3b8]">{hint}</div>}
  </motion.div>
)

export default function AnalyticsPage() {
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
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
      </div>
    )
  }

  const t = data?.totals || {}
  const topReaders = data?.top_readers || []
  const popularBooks = data?.popular_books || []
  const timeline = data?.timeline || []
  const genres = data?.genres || []

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
          <span className="text-gradient-gold">Аналитика</span> библиотеки
        </h1>
        <p className="text-[#94a3b8]">Что читают, кто читает, что популярно</p>
      </div>

      {/* Stat blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBlock icon={BookOpen} label="Книг в фонде" value={t.total_books || 0} color="#e8b94e" delay={0} />
        <StatBlock icon={TrendingUp} label="Выдач всего" value={topReaders.reduce((s, r) => s + parseInt(r.total_borrows), 0)} color="#4ecdc4" delay={0.05} />
        <StatBlock icon={Users} label="Учеников" value={t.total_students || 0} color="#60a5fa" delay={0.1} />
        <StatBlock icon={AlertTriangle} label="Просрочки" value={t.overdue_loans || 0} color="#ff5d8f" delay={0.15} />
      </div>

      {/* Activity timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#11141f] border border-white/5 rounded-2xl p-6"
      >
        <h3 className="font-display font-bold text-xl mb-1">Активность за 30 дней</h3>
        <p className="text-sm text-[#5a6383] mb-5">Выдачи (золотой) и возвраты (бирюзовый)</p>
        <div className="h-72">
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="g-b" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8b94e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#e8b94e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-r" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ecdc4" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4ecdc4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1f30" />
                <XAxis dataKey="day" tick={{ fill: '#5a6383', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: '#5a6383', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0a0c17', border: '1px solid #1a1f30', borderRadius: 12 }}
                />
                <Legend wrapperStyle={{ paddingTop: 20 }} />
                <Area type="monotone" dataKey="borrows_count" stroke="#e8b94e" strokeWidth={2} fill="url(#g-b)" name="Выдачи" />
                <Area type="monotone" dataKey="returns_count" stroke="#4ecdc4" strokeWidth={2} fill="url(#g-r)" name="Возвраты" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-[#5a6383] text-sm">
              Нет данных
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top readers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#11141f] border border-white/5 rounded-2xl p-6"
        >
          <h3 className="font-display font-bold text-xl mb-1 flex items-center gap-2">
            <Award size={18} className="text-[#e8b94e]" /> Топ читатели
          </h3>
          <p className="text-sm text-[#5a6383] mb-5">Кто больше всех читает</p>
          <div className="space-y-2">
            {topReaders.slice(0, 8).map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  i === 0 ? 'bg-[#e8b94e] text-[#06070d]' :
                  i === 1 ? 'bg-[#94a3b8] text-[#06070d]' :
                  i === 2 ? 'bg-[#fb923c] text-[#06070d]' :
                  'bg-white/5 text-[#94a3b8]'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.name}</div>
                  <div className="text-xs text-[#5a6383]">{r.class_name || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#e8b94e]">{r.total_borrows}</div>
                  <div className="text-xs text-[#5a6383]">{r.returned_count} возвр.</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Popular books */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#11141f] border border-white/5 rounded-2xl p-6"
        >
          <h3 className="font-display font-bold text-xl mb-1 flex items-center gap-2">
            <BookOpen size={18} className="text-[#4ecdc4]" /> Популярные книги
          </h3>
          <p className="text-sm text-[#5a6383] mb-5">Что чаще всего берут</p>
          <div className="space-y-2">
            {popularBooks.slice(0, 8).map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                <div className="w-9 h-12 rounded bg-[#0a0c17] overflow-hidden shrink-0">
                  {b.cover_url && <img src={b.cover_url} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm">{b.title}</div>
                  <div className="text-xs text-[#5a6383] truncate">{b.author}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-[#4ecdc4]">{b.borrow_count}</div>
                  <div className="text-xs text-[#5a6383]">раз</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Genres pie */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-[#11141f] border border-white/5 rounded-2xl p-6"
      >
        <h3 className="font-display font-bold text-xl mb-1">Распределение по жанрам</h3>
        <p className="text-sm text-[#5a6383] mb-5">Что берут больше всего</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genres}
                    dataKey="count"
                    nameKey="genre"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {genres.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0a0c17', border: '1px solid #1a1f30', borderRadius: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {genres.map((g, i) => (
              <div key={g.genre} className="flex items-center gap-3 p-2 rounded-xl">
                <div className="w-3 h-3 rounded" style={{ background: COLORS[i % COLORS.length] }} />
                <div className="flex-1 font-semibold">{g.genre}</div>
                <div className="text-[#5a6383] font-mono text-sm">{g.count}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}