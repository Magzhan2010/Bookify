'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Search, BookOpen, User, Calendar, AlertTriangle } from 'lucide-react'

export default function LookupPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all | overdue | recent

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
        const data = await res.json()
        setResults(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    const t = setTimeout(fetchData, 250)
    return () => clearTimeout(t)
  }, [query, filter])

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
          У кого <span className="text-gradient-gold">книга</span>?
        </h1>
        <p className="text-[#94a3b8]">Поиск по названию книги или имени ученика</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6383]" />
          <input
            type="text"
            placeholder="Например: Мастер и Маргарита или Айдана"
            value={query}
            onChange={e => { setQuery(e.target.value); setFilter('all') }}
            className="w-full bg-[#11141f] border border-white/10 pl-12 pr-4 py-3 rounded-xl text-white placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/40"
          />
        </div>
        <button
          onClick={() => { setFilter('overdue'); setQuery('') }}
          className={`px-5 py-3 rounded-xl border font-bold text-sm flex items-center gap-2 transition-all ${
            filter === 'overdue'
              ? 'bg-[#ff5d8f] text-white border-[#ff5d8f]'
              : 'bg-[#11141f] border-white/10 text-[#94a3b8] hover:text-white'
          }`}
        >
          <AlertTriangle size={16} /> Только просрочки
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 bg-[#11141f] border border-dashed border-white/10 rounded-2xl">
          <p className="text-[#5a6383]">Ничего не нашли</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((r, i) => {
            const overdue = new Date(r.due_date) < new Date()
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`p-4 rounded-2xl border ${
                  overdue
                    ? 'bg-[#ff5d8f]/5 border-[#ff5d8f]/20'
                    : 'bg-[#11141f] border-white/5'
                }`}
              >
                <div className="flex gap-3 mb-3">
                  <div className="w-12 h-16 rounded-lg bg-[#0a0c17] overflow-hidden shrink-0">
                    {r.book_cover && <img src={r.book_cover} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm line-clamp-2">{r.book_title}</div>
                    <div className="text-xs text-[#5a6383]">{r.book_author}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-[#60a5fa] shrink-0" />
                    <span className="font-semibold truncate">{r.student_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#5a6383]">{r.student_class || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar size={12} className="text-[#5a6383] shrink-0" />
                    <span className={overdue ? 'text-[#ff5d8f] font-bold' : 'text-[#5a6383]'}>
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