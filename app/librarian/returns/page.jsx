'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Search, Check, BookOpen, AlertTriangle, Clock, User as UserIcon } from 'lucide-react'

export default function ReturnsPage() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowId })
      })
      const data = await res.json()
      if (data.success) {
        setSuccessId(borrowId)
        setLoans(prev => prev.filter(l => l.id !== borrowId))
        toast.success(`«${data.book_title}» возвращена`)
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

  const overdueCount = loans.filter(l => new Date(l.due_date) < new Date()).length

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[var(--color-text-primary)]">
            Принять возврат
          </h1>
          <p className="text-[15px] text-[var(--color-text-secondary)]">Книги, которые сейчас на руках у учеников</p>
        </div>
        {overdueCount > 0 && (
          <div className="px-4 py-2 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-[13px] font-medium flex items-center gap-2">
            <AlertTriangle size={14} /> {overdueCount} просрочено
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] pl-11 pr-4 py-3 rounded-xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand-soft)] transition-all text-[14px]"
          />
        </div>
        <div className="flex bg-[var(--color-bg-card)] p-1 rounded-xl border border-[var(--color-border)]">
          {[
            { key: 'all', label: 'Все' },
            { key: 'active', label: 'Активные' },
            { key: 'overdue', label: 'Просрочки' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                filter === f.key ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[#1a56db] rounded-full animate-spin" />
        </div>
      ) : loans.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-success)]/10 text-[var(--color-success)] mx-auto mb-4 flex items-center justify-center">
            <Check size={32} />
          </div>
          <p className="text-[17px] font-semibold mb-1 text-[var(--color-text-primary)]">Пусто</p>
          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            {filter === 'overdue' ? 'Никто ничего не просрочил' : 'Нет активных выдач'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {loans.map(loan => {
              const overdue = new Date(loan.due_date) < new Date()
              const overdueDays = overdue ? Math.floor((new Date() - new Date(loan.due_date)) / (24 * 60 * 60 * 1000)) : 0
              const isSuccess = successId === loan.id
              const isSubmitting = submitting === loan.id

              return (
                <motion.div
                  key={loan.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: isSuccess ? 0.5 : 1, y: 0, scale: isSuccess ? 0.98 : 1 }}
                  exit={{ opacity: 0, x: 100 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    overdue
                      ? 'bg-[var(--color-danger)]/5 border-[var(--color-danger)]/30'
                      : 'bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <div className="w-12 shrink-0">
                    <div className="relative aspect-[2/3] rounded-lg bg-[var(--color-bg-soft)] overflow-hidden">
                      {loan.cover_url && <img src={loan.cover_url} alt={loan.book_title} className="w-full h-full object-cover" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen size={13} className="text-[var(--color-brand)] shrink-0" />
                      <div className="font-semibold text-[14px] truncate text-[var(--color-text-primary)]">{loan.book_title}</div>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
                      <UserIcon size={11} />
                      <span className="truncate">{loan.student_name}</span>
                      {loan.student_class && <span className="text-[var(--color-text-tertiary)] text-[12px]">· {loan.student_class}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                      <span className="text-[var(--color-text-tertiary)]">
                        Выдано: {new Date(loan.borrowed_at).toLocaleDateString('ru-RU')}
                      </span>
                      {overdue ? (
                        <span className="text-[var(--color-danger)] font-semibold flex items-center gap-1">
                          <Clock size={10} /> {overdueDays} д. просрочки
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-tertiary)]">
                          До: {new Date(loan.due_date).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleReturn(loan.id)}
                    disabled={isSubmitting}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors ${
                      isSubmitting
                        ? 'bg-[var(--color-bg-soft)] text-[var(--color-text-tertiary)]'
                        : overdue
                          ? 'bg-[var(--color-danger)] hover:bg-[#e0291f] text-white'
                          : 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <><Check size={14} /> Принять</>
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