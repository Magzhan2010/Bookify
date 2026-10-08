'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Search, BookOpen, User as UserIcon, Calendar, AlertTriangle } from 'lucide-react'

export default function LookupPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const url = filter === 'overdue'
          ? `/api/librarian/lookup?overdue=true`
          : `/api/librarian/lookup?q=${encodeURIComponent(query)}`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setResults(await res.json())
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    const t = setTimeout(fetchData, 250)
    return () => clearTimeout(t)
  }, [query, filter])

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[var(--color-text-primary)]">
          У кого книга?
        </h1>
        <p className="text-[15px] text-[var(--color-text-secondary)]">Поиск по названию или имени</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setFilter('all') }}
            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] pl-11 pr-4 py-3 rounded-xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand-soft)] transition-all text-[14px]"
          />
        </div>
        <button
          onClick={() => { setFilter('overdue'); setQuery('') }}
          className={`px-5 py-3 rounded-xl border font-medium text-[13px] flex items-center gap-2 transition-all ${
            filter === 'overdue'
              ? 'bg-[var(--color-danger)] text-white border-[#ff3b30]'
              : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <AlertTriangle size={14} /> Только просрочки
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[#1a56db] rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
          <p className="text-[var(--color-text-tertiary)] text-[14px]">Ничего не нашли</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((r, i) => {
            const overdue = new Date(r.due_date) < new Date()
            const overdueDays = overdue ? Math.floor((new Date() - new Date(r.due_date)) / (24 * 60 * 60 * 1000)) : 0
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className={`group relative flex gap-4 p-4 rounded-2xl border transition-all hover:shadow-[var(--shadow-soft)] hover:border-[var(--color-border-strong)] ${
                  overdue ? 'bg-[var(--color-danger)]/5 border-[var(--color-danger)]/30' : 'bg-[var(--color-bg-card)] border-[var(--color-border)]'
                }`}
              >
                {/* Book cover (с правильным aspect-ratio) */}
                <div className="w-20 shrink-0">
                  <div className="relative aspect-[2/3] rounded-lg bg-[var(--color-bg-soft)] overflow-hidden shadow-md ring-1 ring-[var(--color-border)]">
                    {r.cover_url ? (
                      <img
                        src={r.cover_url}
                        alt={r.book_title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-brand-soft)] to-[var(--color-bg-soft)]">
                        <BookOpen size={20} className="text-[var(--color-text-tertiary)]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {overdue && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                          −{overdueDays}д
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-[14px] leading-tight line-clamp-2 mb-1 text-[var(--color-text-primary)]">
                      {r.book_title}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-tertiary)] line-clamp-1 mb-2">{r.book_author}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[var(--color-brand)] flex items-center justify-center text-[10px] font-bold text-white">
                        {r.student_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-[13px] truncate text-[var(--color-text-primary)]">{r.student_name}</span>
                      {r.student_class && (
                        <span className="text-[11px] text-[var(--color-text-tertiary)]">· {r.student_class}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <Calendar size={11} className="text-[var(--color-text-tertiary)] shrink-0" />
                      <span className={overdue ? 'text-[var(--color-danger)] font-semibold' : 'text-[var(--color-text-tertiary)]'}>
                        Вернуть: {new Date(r.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
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