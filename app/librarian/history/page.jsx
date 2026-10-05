'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Filter, RefreshCw } from 'lucide-react'

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    from: '', to: '', student: '', book: '', status: ''
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
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchHistory() }, [])

  const statusBadge = (status) => {
    const map = {
      active: { label: 'Активна', bg: '#1a56db', color: '#fff' },
      returned: { label: 'Возвращена', bg: '#34c759', color: '#fff' }
    }
    return map[status] || { label: status, bg: '#e5e7eb', color: '#1d1d1f' }
  }

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[var(--color-text-primary)]">
          История операций
        </h1>
        <p className="text-[15px] text-[var(--color-text-secondary)]">Полный журнал выдач и возвратов</p>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FilterField label="От даты" type="date" value={filters.from} onChange={v => setFilters({...filters, from: v})} />
          <FilterField label="До даты" type="date" value={filters.to} onChange={v => setFilters({...filters, to: v})} />
          <FilterField label="Ученик" value={filters.student} onChange={v => setFilters({...filters, student: v})} />
          <FilterField label="Книга" value={filters.book} onChange={v => setFilters({...filters, book: v})} />
          <div>
            <label className="block text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-1.5">Статус</label>
            <select
              value={filters.status}
              onChange={e => setFilters({...filters, status: e.target.value})}
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3 py-2.5 rounded-xl text-[var(--color-text-primary)] text-[13px] outline-none cursor-pointer focus:border-[var(--color-brand)]/30 focus:bg-[var(--color-bg-card)]"
            >
              <option value="">Любой</option>
              <option value="active">Активна</option>
              <option value="returned">Возвращена</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={fetchHistory}
            className="px-4 py-2 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Filter size={13} /> Применить
          </button>
          <button
            onClick={() => { setFilters({ from: '', to: '', student: '', book: '', status: '' }); setTimeout(fetchHistory, 100) }}
            className="px-4 py-2 rounded-xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] text-[13px] font-medium transition-colors"
          >
            Сбросить
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[#1a56db] rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
          <p className="text-[var(--color-text-tertiary)] text-[14px]">Нет операций по фильтрам</p>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mb-3">Найдено: {history.length}</p>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-[var(--color-bg-soft)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
                  <tr>
                    <th className="text-left px-4 py-3">Дата</th>
                    <th className="text-left px-4 py-3">Ученик</th>
                    <th className="text-left px-4 py-3">Книга</th>
                    <th className="text-left px-4 py-3">Выдал</th>
                    <th className="text-center px-4 py-3">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {history.map((h, i) => {
                    const badge = statusBadge(h.status)
                    return (
                      <motion.tr
                        key={h.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.008 }}
                        className="hover:bg-[var(--color-bg-soft)]"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-[var(--color-text-primary)]">{new Date(h.borrowed_at).toLocaleDateString('ru-RU')}</div>
                          <div className="text-[10px] text-[var(--color-text-tertiary)]">{new Date(h.borrowed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--color-text-primary)]">{h.student_name}</div>
                          <div className="text-[11px] text-[var(--color-text-tertiary)]">{h.student_class || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--color-text-primary)]">{h.book_title}</div>
                          <div className="text-[11px] text-[var(--color-text-tertiary)]">{h.book_author}</div>
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-tertiary)] text-[12px]">{h.issued_by_name || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const FilterField = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3 py-2.5 rounded-xl text-[var(--color-text-primary)] text-[13px] outline-none focus:border-[var(--color-brand)]/30 focus:bg-[var(--color-bg-card)] transition-all"
    />
  </div>
)