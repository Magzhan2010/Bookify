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
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[#1d1d1f]">
          У кого книга?
        </h1>
        <p className="text-[15px] text-[#6e6e73]">Поиск по названию или имени</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setFilter('all') }}
            className="w-full bg-white border border-black/10 pl-11 pr-4 py-3 rounded-xl text-[#1d1d1f] outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/10 transition-all text-[14px]"
          />
        </div>
        <button
          onClick={() => { setFilter('overdue'); setQuery('') }}
          className={`px-5 py-3 rounded-xl border font-medium text-[13px] flex items-center gap-2 transition-all ${
            filter === 'overdue'
              ? 'bg-[#ff3b30] text-white border-[#ff3b30]'
              : 'bg-white border-black/10 text-[#6e6e73] hover:text-[#1d1d1f]'
          }`}
        >
          <AlertTriangle size={14} /> Только просрочки
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-black/10 rounded-2xl">
          <p className="text-[#86868b] text-[14px]">Ничего не нашли</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((r, i) => {
            const overdue = new Date(r.due_date) < new Date()
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`p-4 rounded-2xl border ${
                  overdue ? 'bg-[#ff3b30]/5 border-[#ff3b30]/20' : 'bg-white border-black/8'
                }`}
              >
                <div className="flex gap-3 mb-3">
                  <div className="w-11 h-15 rounded-lg bg-[#f5f5f7] overflow-hidden shrink-0">
                    {r.book_cover && <img src={r.book_cover} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] line-clamp-2 text-[#1d1d1f]">{r.book_title}</div>
                    <div className="text-[11px] text-[#86868b]">{r.book_author}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[13px]">
                  <div className="flex items-center gap-2">
                    <UserIcon size={12} className="text-[#1a56db] shrink-0" />
                    <span className="font-medium truncate text-[#1d1d1f]">{r.student_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-[#86868b]">{r.student_class || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Calendar size={11} className="text-[#86868b] shrink-0" />
                    <span className={overdue ? 'text-[#ff3b30] font-semibold' : 'text-[#86868b]'}>
                      Вернуть: {new Date(r.due_date).toLocaleDateString('ru-RU')}
                    </span>
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