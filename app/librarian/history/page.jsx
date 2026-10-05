'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Search, Filter, Calendar, User, BookOpen, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    student: '',
    book: '',
    status: ''
  })

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })

      const res = await fetch(`/api/librarian/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setHistory(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const statusBadge = (status) => {
    const map = {
      active: { label: 'Активна', color: 'bg-[#4ecdc4]/15 text-[#4ecdc4] border-[#4ecdc4]/30' },
      overdue: { label: 'Просрочка', color: 'bg-[#ff5d8f]/15 text-[#ff5d8f] border-[#ff5d8f]/30' },
      submitted: { label: 'Отчёт сдан', color: 'bg-[#e8b94e]/15 text-[#e8b94e] border-[#e8b94e]/30' },
      returned: { label: 'Возвращена', color: 'bg-white/5 text-[#94a3b8] border-white/10' },
      approved: { label: 'Зачтено', color: 'bg-[#60a5fa]/15 text-[#60a5fa] border-[#60a5fa]/30' }
    }
    return map[status] || { label: status, color: 'bg-white/5 text-[#94a3b8] border-white/10' }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
          История <span className="text-gradient-gold">операций</span>
        </h1>
        <p className="text-[#94a3b8]">Полный журнал выдач и возвратов с фильтрами</p>
      </div>

      {/* Filters */}
      <div className="bg-[#11141f] border border-white/5 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FilterField label="От даты" type="date" value={filters.from} onChange={v => setFilters({...filters, from: v})} />
          <FilterField label="До даты" type="date" value={filters.to} onChange={v => setFilters({...filters, to: v})} />
          <FilterField label="Ученик (имя/ID)" value={filters.student} onChange={v => setFilters({...filters, student: v})} placeholder="Айдана" />
          <FilterField label="Книга (название/ID)" value={filters.book} onChange={v => setFilters({...filters, book: v})} placeholder="Мастер..." />
          <div>
            <label className="block text-xs text-[#5a6383] uppercase tracking-wider font-bold mb-1.5">Статус</label>
            <select
              value={filters.status}
              onChange={e => setFilters({...filters, status: e.target.value})}
              className="w-full bg-[#0a0c17] border border-white/10 px-3 py-2.5 rounded-xl text-white text-sm outline-none cursor-pointer"
            >
              <option value="">Любой</option>
              <option value="active">Активна</option>
              <option value="returned">Возвращена</option>
              <option value="overdue">Просрочка</option>
              <option value="submitted">Отчёт сдан</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={fetchHistory}
            className="px-4 py-2 rounded-xl bg-[#e8b94e] text-[#06070d] font-bold text-sm hover:bg-[#e8b94e]/90"
          >
            <Filter size={14} className="inline mr-1" /> Применить
          </button>
          <button
            onClick={() => { setFilters({ from: '', to: '', student: '', book: '', status: '' }); setTimeout(fetchHistory, 100) }}
            className="px-4 py-2 rounded-xl bg-white/5 text-[#94a3b8] hover:text-white text-sm"
          >
            Сбросить
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-[#11141f] border border-dashed border-white/10 rounded-2xl">
          <p className="text-[#5a6383]">Нет операций по выбранным фильтрам</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[#5a6383] mb-3">Найдено: {history.length}</p>
          <div className="bg-[#11141f] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-[#5a6383]">
                <tr>
                  <th className="text-left px-4 py-3">Дата</th>
                  <th className="text-left px-4 py-3">Ученик</th>
                  <th className="text-left px-4 py-3">Книга</th>
                  <th className="text-left px-4 py-3">Выдал</th>
                  <th className="text-center px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((h, i) => {
                  const badge = statusBadge(h.status)
                  return (
                    <motion.tr
                      key={h.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className="hover:bg-white/5"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-[#94a3b8]">
                          {new Date(h.borrowed_at).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="text-[10px] text-[#5a6383]">
                          {new Date(h.borrowed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{h.student_name}</div>
                        <div className="text-xs text-[#5a6383]">{h.student_class || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{h.book_title}</div>
                        <div className="text-xs text-[#5a6383]">{h.book_author}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5a6383]">{h.issued_by_name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

const FilterField = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div>
    <label className="block text-xs text-[#5a6383] uppercase tracking-wider font-bold mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0a0c17] border border-white/10 px-3 py-2.5 rounded-xl text-white text-sm placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/40"
    />
  </div>
)