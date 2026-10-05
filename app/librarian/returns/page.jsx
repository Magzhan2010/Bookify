'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDownToLine, Search, Check, BookOpen, AlertTriangle, Clock, User
} from 'lucide-react'

export default function ReturnsPage() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | overdue | active
  const [submitting, setSubmitting] = useState(null)
  const [successId, setSuccessId] = useState(null)

  const fetchLoans = async () => {
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (filter === 'overdue') {
        const res = await fetch(`/api/librarian/lookup?overdue=true`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setLoans(await res.json())
        return
      }
      if (filter === 'active') params.set('status', 'active')

      const res = await fetch(`/api/librarian/lookup?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLoans(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoans()
  }, [filter])

  useEffect(() => {
    const t = setTimeout(fetchLoans, 300)
    return () => clearTimeout(t)
  }, [search])

  const handleReturn = async (borrowId) => {
    setSubmitting(borrowId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/return', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ borrowId })
      })
      const data = await res.json()
      if (data.success) {
        setSuccessId(borrowId)
        setLoans(prev => prev.filter(l => l.id !== borrowId))
        toast.success(`«${data.book_title}» возвращена`, {
          description: `${data.student_name} вернул книгу`
        })
        setTimeout(() => setSuccessId(null), 1500)
      } else {
        toast.error(data.error)
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setSubmitting(null)
    }
  }

  const filtered = loans.filter(l => {
    if (filter === 'overdue') return new Date(l.due_date) < new Date()
    if (filter === 'active') return l.status === 'active' || l.status === 'overdue'
    return true
  })

  const overdueCount = loans.filter(l => new Date(l.due_date) < new Date()).length

  return (
    <div className="max-w-[1200px] mx-auto">

      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
            Принять <span className="text-gradient-gold">возврат</span>
          </h1>
          <p className="text-[#94a3b8]">Все книги, которые сейчас на руках у учеников</p>
        </div>
        {overdueCount > 0 && (
          <div className="px-4 py-2.5 rounded-xl bg-[#ff5d8f]/10 border border-[#ff5d8f]/20 text-[#ff5d8f] text-sm font-bold flex items-center gap-2">
            <AlertTriangle size={16} /> {overdueCount} просрочено
          </div>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6383]" />
          <input
            type="text"
            placeholder="Поиск по названию или ученику..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#11141f] border border-white/10 pl-12 pr-4 py-3 rounded-xl text-white placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/40"
          />
        </div>
        <div className="flex bg-[#11141f] p-1.5 rounded-xl border border-white/5">
          {[
            { key: 'all', label: 'Все' },
            { key: 'active', label: 'Активные' },
            { key: 'overdue', label: 'Просрочки' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === f.key ? 'bg-white/10 text-white' : 'text-[#5a6383] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loans list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-[#11141f] border border-dashed border-white/10 rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#4ecdc4]/10 text-[#4ecdc4] mx-auto mb-4 flex items-center justify-center">
            <Check size={32} />
          </div>
          <p className="font-display font-bold text-xl mb-1">Пусто!</p>
          <p className="text-sm text-[#5a6383]">
            {filter === 'overdue' ? 'Никто ничего не просрочил 🎉' : 'Нет активных выдач'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map(loan => {
              const overdue = new Date(loan.due_date) < new Date()
              const overdueDays = overdue
                ? Math.floor((new Date() - new Date(loan.due_date)) / (24 * 60 * 60 * 1000))
                : 0
              const isSuccess = successId === loan.id
              const isSubmitting = submitting === loan.id

              return (
                <motion.div
                  key={loan.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isSuccess ? 0.5 : 1, y: 0, scale: isSuccess ? 0.98 : 1 }}
                  exit={{ opacity: 0, x: 100 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    overdue
                      ? 'bg-[#ff5d8f]/5 border-[#ff5d8f]/20'
                      : 'bg-[#11141f] border-white/5 hover:border-[#e8b94e]/30'
                  }`}
                >
                  <div className="w-12 h-16 rounded-lg bg-[#0a0c17] overflow-hidden shrink-0">
                    {loan.book_cover && (
                      <img src={loan.book_cover} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <BookOpen size={14} className="text-[#e8b94e] mt-0.5 shrink-0" />
                      <div className="font-bold truncate">{loan.book_title}</div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
                      <User size={12} />
                      <span className="truncate">{loan.student_name}</span>
                      {loan.student_class && (
                        <span className="text-xs text-[#5a6383]">· {loan.student_class}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="text-[#5a6383]">
                        Выдано: {new Date(loan.borrowed_at).toLocaleDateString('ru-RU')}
                      </span>
                      {overdue ? (
                        <span className="text-[#ff5d8f] font-bold flex items-center gap-1">
                          <Clock size={11} /> {overdueDays} д. просрочки
                        </span>
                      ) : (
                        <span className="text-[#5a6383]">
                          До: {new Date(loan.due_date).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleReturn(loan.id)}
                    disabled={isSubmitting}
                    className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                      isSubmitting
                        ? 'bg-white/5 text-[#5a6383]'
                        : overdue
                          ? 'bg-[#ff5d8f] text-white hover:bg-[#ff5d8f]/90'
                          : 'bg-[#4ecdc4] text-[#06070d] hover:bg-[#4ecdc4]/90'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <><Check size={16} /> Принять</>
                    )}
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}