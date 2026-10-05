'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Bell, X, Check, Loader2, BookOpen, User, Calendar
} from 'lucide-react'

export default function RequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processing, setProcessing] = useState(null)

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/librarian/requests?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRequests(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [filter])

  const handleAction = async (requestId, action) => {
    setProcessing(requestId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/librarian/requests/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const data = await res.json()
      if (res.ok) {
        if (action === 'issue') toast.success('Книга выдана ученику')
        else if (action === 'approve') toast.success('Заявка одобрена')
        else toast.success('Заявка отклонена')
        fetchRequests()
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setProcessing(null)
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[#1d1d1f]">
            Заявки учеников
          </h1>
          <p className="text-[15px] text-[#6e6e73]">
            Кто хочет взять книгу
            {pendingCount > 0 && filter === 'pending' && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[#ff9500] text-white text-[12px] font-bold">
                {pendingCount}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-xl border border-black/8 mb-5 w-fit">
        {[
          { key: 'pending', label: 'Ожидают' },
          { key: 'approved', label: 'Одобренные' },
          { key: 'rejected', label: 'Отклонённые' },
          { key: 'all', label: 'Все' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
              filter === f.key ? 'bg-[#1a56db] text-white' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-white border border-dashed border-black/10 rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#34c759]/10 text-[#34c759] mx-auto mb-4 flex items-center justify-center">
            <Check size={32} />
          </div>
          <p className="text-[17px] font-semibold mb-1 text-[#1d1d1f]">
            {filter === 'pending' ? 'Никто не ждёт' : 'Здесь пусто'}
          </p>
          <p className="text-[13px] text-[#86868b]">
            {filter === 'pending' ? 'Ученики пока не оставили заявок' : 'Попробуй другой фильтр'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {requests.map((r, i) => {
              const isProcessing = processing === r.id
              const statusBadge = {
                pending: { label: 'Ожидает', bg: '#ff9500', color: '#fff' },
                approved: { label: 'Одобрено', bg: '#34c759', color: '#fff' },
                rejected: { label: 'Отклонено', bg: '#86868b', color: '#fff' },
                fulfilled: { label: 'Выдано', bg: '#1a56db', color: '#fff' }
              }
              const badge = statusBadge[r.status] || statusBadge.pending

              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-white border border-black/8 rounded-2xl"
                >
                  <div className="w-12 h-16 rounded-lg bg-[#f5f5f7] overflow-hidden shrink-0">
                    {r.book_cover && <img src={r.book_cover} className="w-full h-full object-cover" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen size={14} className="text-[#1a56db] shrink-0" />
                      <div className="font-semibold text-[14px] truncate text-[#1d1d1f]">{r.book_title}</div>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-[#6e6e73] mb-1">
                      <User size={12} />
                      <span className="truncate">{r.student_name}</span>
                      {r.student_class && <span className="text-[#86868b] text-[12px]">· {r.student_class}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span
                        className="px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wider"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[#86868b]">
                        <Calendar size={10} className="inline mr-1" />
                        {new Date(r.requested_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {r.status === 'pending' && (
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      <button
                        onClick={() => handleAction(r.id, 'issue')}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[13px] font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Выдать</>}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, 'reject')}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-white border border-black/10 text-[#6e6e73] hover:text-[#1d1d1f] text-[13px] font-medium transition-colors"
                      >
                        Отклонить
                      </button>
                    </div>
                  )}

                  {r.status === 'approved' && (
                    <button
                      onClick={() => handleAction(r.id, 'issue')}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[13px] font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Выдать</>}
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}