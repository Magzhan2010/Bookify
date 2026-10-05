'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  PieChart, Pie, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area, Cell
} from 'recharts'
import {
  BookOpen, TrendingUp, Users, Award
} from 'lucide-react'

const COLORS = ['#1a56db', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6', '#ff2d55', '#5ac8fa']

const StatBlock = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-white border border-black/8 rounded-2xl p-5"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, color }}>
        <Icon size={18} />
      </div>
    </div>
    <div className="text-[32px] font-semibold tracking-tight text-[#1d1d1f] mb-1">{value}</div>
    <div className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">{label}</div>
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
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAnalytics() }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
      </div>
    )
  }

  const t = data?.totals || {}
  const topReaders = data?.top_readers || []
  const popularBooks = data?.popular_books || []
  const timeline = data?.timeline || []
  const genres = data?.genres || []

  return (
    <div className="max-w-[1300px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[#1d1d1f]">
          Аналитика
        </h1>
        <p className="text-[15px] text-[#6e6e73]">Что читают, кто читает, что популярно</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBlock icon={BookOpen} label="Книг в фонде" value={t.total_books || 0} color="#1a56db" delay={0} />
        <StatBlock icon={TrendingUp} label="Выдач всего" value={topReaders.reduce((s, r) => s + parseInt(r.total_borrows), 0)} color="#34c759" delay={0.05} />
        <StatBlock icon={Users} label="Учеников" value={t.total_students || 0} color="#ff9500" delay={0.1} />
        <StatBlock icon={Award} label="Топ читателей" value={topReaders.length} color="#ff3b30" delay={0.15} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-black/8 rounded-2xl p-6"
      >
        <h3 className="text-[16px] font-semibold mb-1 text-[#1d1d1f]">Активность за 30 дней</h3>
        <p className="text-[12px] text-[#86868b] mb-5">Выдачи (синий) и возвраты (зелёный)</p>
        <div className="h-72">
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="g-b" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a56db" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1a56db" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-r" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34c759" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#34c759" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f7" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#86868b', fontSize: 11 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#86868b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ paddingTop: 16 }} />
                <Area type="monotone" dataKey="borrows_count" stroke="#1a56db" strokeWidth={2} fill="url(#g-b)" name="Выдачи" />
                <Area type="monotone" dataKey="returns_count" stroke="#34c759" strokeWidth={2} fill="url(#g-r)" name="Возвраты" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-[#86868b] text-[13px]">Нет данных</div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-black/8 rounded-2xl p-6"
        >
          <h3 className="text-[16px] font-semibold mb-1 flex items-center gap-2 text-[#1d1d1f]">
            <Award size={16} className="text-[#1a56db]" /> Топ читатели
          </h3>
          <p className="text-[12px] text-[#86868b] mb-5">Кто больше всех читает</p>
          <div className="space-y-1.5">
            {topReaders.slice(0, 8).map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f5f5f7]">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-[12px] ${
                  i === 0 ? 'bg-[#1a56db] text-white' :
                  i === 1 ? 'bg-[#86868b] text-white' :
                  i === 2 ? 'bg-[#ff9500] text-white' :
                  'bg-[#f5f5f7] text-[#6e6e73]'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px] truncate text-[#1d1d1f]">{r.name}</div>
                  <div className="text-[11px] text-[#86868b]">{r.class_name || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[14px] text-[#1a56db]">{r.total_borrows}</div>
                  <div className="text-[10px] text-[#86868b]">{r.returned_count} возвр.</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-black/8 rounded-2xl p-6"
        >
          <h3 className="text-[16px] font-semibold mb-1 flex items-center gap-2 text-[#1d1d1f]">
            <BookOpen size={16} className="text-[#34c759]" /> Популярные книги
          </h3>
          <p className="text-[12px] text-[#86868b] mb-5">Что чаще всего берут</p>
          <div className="space-y-1.5">
            {popularBooks.slice(0, 8).map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#f5f5f7]">
                <div className="w-9 h-12 rounded-lg bg-[#f5f5f7] overflow-hidden shrink-0">
                  {b.cover_url && <img src={b.cover_url} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px] truncate text-[#1d1d1f]">{b.title}</div>
                  <div className="text-[11px] text-[#86868b] truncate">{b.author}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-[14px] text-[#34c759]">{b.borrow_count}</div>
                  <div className="text-[10px] text-[#86868b]">раз</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white border border-black/8 rounded-2xl p-6"
      >
        <h3 className="text-[16px] font-semibold mb-1 text-[#1d1d1f]">Распределение по жанрам</h3>
        <p className="text-[12px] text-[#86868b] mb-5">Что берут больше всего</p>
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
                    stroke="none"
                  >
                    {genres.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {genres.map((g, i) => (
              <div key={g.genre} className="flex items-center gap-3 p-2 rounded-xl">
                <div className="w-3 h-3 rounded" style={{ background: COLORS[i % COLORS.length] }} />
                <div className="flex-1 font-medium text-[13px] text-[#1d1d1f]">{g.genre}</div>
                <div className="text-[#86868b] font-mono text-[13px]">{g.count}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}