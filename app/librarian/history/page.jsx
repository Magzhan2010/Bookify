'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Search, Filter, RotateCw, Calendar, ArrowDownToLine, ArrowUpFromLine, BookOpen, User, RefreshCw } from 'lucide-react'

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    from: '', to: '', student: '', book: '', status: ''
  })
  const [search, setSearch] = useState('')

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.student) params.set('student', filters.student)
      if (filters.book) params.set('book', filters.book)
      if (filters.status) params.set('status', filters.status)
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

  useEffect(() => { fetchHistory() }, [])

  const statusBadge = (status) => {
    const map = {
      active: { label: 'Активна', bg: '#1a56db', color: '#fff', icon: ArrowUpFromLine },
      returned: { label: 'Возвращена', bg: '#34c759', color: '#fff', icon: ArrowDownToLine }
    }
    return map[status] || { label: status, bg: '#86868b', color: '#fff', icon: RefreshCw }
  }

  const filtered = history.filter(h => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      h.student_name?.toLowerCase().includes(q) ||
      h.book_title?.toLowerCase().includes(q) ||
      h.student_class?.toLowerCase().includes(q)
    )
  })

  const activeCount = history.filter(h => h.status === 'active').length
  const returnedCount = history.filter(h => h.status === 'returned').length

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[var(--color-text-primary)]">
          История операций
        </h1>
        <p className="text-[15px] text-[var(--color-text-secondary)]">
          Полный журнал выдач и возвратов с фильтрами
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4">
          <div className="text-2xl font-semibold text-[var(--color-text-primary)]">{history.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mt-1">Всего</div>
        </div>
        <div className="bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/30 rounded-2xl p-4">
          <div className="text-2xl font-semibold text-[var(--color-brand)]">{activeCount}</div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-brand)] font-medium mt-1">Активных</div>
        </div>
        <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-2xl p-4">
          <div className="text-2xl font-semibold text-[var(--color-success)]">{returnedCount}</div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-success)] font-medium mt-1">Возвратов</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-5">
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
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3 py-2.5 rounded-xl text-[13px] text-[var(--color-text-primary)] outline-none cursor-pointer focus:border-[var(--color-brand)] focus:bg-[var(--color-bg-card)]"
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
            className="px-4 py-2 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[13px] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Filter size={13} /> Применить
          </button>
          <button
            onClick={() => { setFilters({ from: '', to: '', student: '', book: '', status: '' }); setSearch(''); setTimeout(fetchHistory, 100) }}
            className="px-4 py-2 rounded-xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] text-[13px] font-medium transition-colors"
          >
            Сбросить
          </button>
          <div className="flex-1 relative ml-auto max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="Быстрый поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[var(--color-bg-soft)] border border-transparent pl-9 pr-3 py-2 rounded-xl text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] focus:bg-[var(--color-bg-card)]"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[var(--color-brand)] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
          <p className="text-[var(--color-text-secondary)] text-[14px]">Нет операций по фильтрам</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h, i) => {
            const badge = statusBadge(h.status)
            const Icon = badge.icon
            const overdue = h.due_date && new Date(h.due_date) < new Date() && h.status === 'active'
            const daysHeld = h.days_held

            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Book cover */}
                  <div className="w-14 h-20 rounded-lg bg-[var(--color-bg-soft)] overflow-hidden shrink-0">
                    {h.book_cover ? (
                      <img src={h.book_cover} alt={h.book_title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={20} className="text-[var(--color-text-tertiary)]" />
                      </div>
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        <Icon size={10} />
                        {badge.label}
                      </span>
                      {overdue && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] text-[10px] font-bold uppercase tracking-wider">
                          Просрочка
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-[15px] text-[var(--color-text-primary)] truncate mb-0.5">
                      {h.book_title}
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[var(--color-brand)] flex items-center justify-center text-[9px] font-bold text-[var(--color-text-on-brand)]">
                          {h.student_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{h.student_name}</span>
                        {h.student_class && (
                          <span className="text-[var(--color-text-tertiary)]">· {h.student_class}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-4 text-[12px] md:text-right shrink-0">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Выдано</div>
                      <div className="font-semibold text-[var(--color-text-primary)]">
                        {new Date(h.borrowed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {h.due_date && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">Вернуть до</div>
                        <div className={`font-semibold ${overdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'}`}>
                          {new Date(h.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    )}
                    {h.returned_at && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--color-success)] font-medium">Возвращено</div>
                        <div className="font-semibold text-[var(--color-success)]">
                          {new Date(h.returned_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
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
      className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3 py-2.5 rounded-xl text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] focus:bg-[var(--color-bg-card)]"
    />
  </div>
)