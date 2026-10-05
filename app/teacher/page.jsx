'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Users, Trophy, BookOpen, Star } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

const Stat = ({ label, value, color, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-black/8 rounded-2xl p-5"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, color }}>
        <Icon size={18} />
      </div>
    </div>
    <div className="text-3xl font-semibold tracking-tight text-[#1d1d1f] mb-1">{value}</div>
    <div className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">{label}</div>
  </motion.div>
)

export default function TeacherDashboard() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/login')

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (!['teacher', 'admin', 'librarian'].includes(payload.role)) {
        router.push('/library')
        return
      }
    } catch (e) {
      router.push('/login')
    }

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
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
      </div>
    )
  }

  const t = data?.totals || {}
  const topReaders = data?.top_readers || []

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-7 bg-[#1a56db] rounded-full" />
            <h1 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f]">Учитель · Аналитика</h1>
          </div>
          <button
            onClick={() => router.push('/library')}
            className="px-4 py-2 rounded-xl bg-[#f5f5f7] hover:bg-[#ececec] text-[#1d1d1f] text-[13px] font-medium transition-colors"
          >
            Каталог
          </button>
        </div>
      </div>

      <main className="max-w-[1300px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Учеников всего" value={t.total_students || 0} color="#1a56db" icon={Users} />
          <Stat label="Прочитано книг" value={topReaders.reduce((s, r) => s + parseInt(r.total_borrows || 0), 0)} color="#34c759" icon={BookOpen} />
          <Stat label="Активных займов" value={t.active_loans || 0} color="#ff9500" icon={Trophy} />
          <Stat label="Просрочек" value={t.overdue_loans || 0} color="#ff3b30" icon={Star} />
        </div>

        <div className="bg-white border border-black/8 rounded-2xl p-6 mb-6">
          <h3 className="text-[16px] font-semibold mb-1 text-[#1d1d1f]">Топ читателей</h3>
          <p className="text-[12px] text-[#86868b] mb-5">Кто больше всех читает — для рейтинга</p>
          <div className="space-y-2">
            {topReaders.slice(0, 12).map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 p-2.5 hover:bg-[#f5f5f7] rounded-xl">
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
                  <div className="text-[10px] text-[#86868b]">книг</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-black/8 rounded-2xl p-6">
          <h3 className="text-[16px] font-semibold mb-1 text-[#1d1d1f]">Активность за 30 дней</h3>
          <p className="text-[12px] text-[#86868b] mb-5">Выдачи и возвраты</p>
          <div className="h-72">
            {data?.timeline?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f7" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#86868b', fontSize: 11 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#86868b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="borrows_count" fill="#1a56db" radius={[6, 6, 0, 0]} name="Выдачи" />
                  <Bar dataKey="returns_count" fill="#34c759" radius={[6, 6, 0, 0]} name="Возвраты" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#86868b] text-[13px]">Нет данных</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}