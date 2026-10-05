'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Check, Search, X, LogOut, BarChart3
} from 'lucide-react'

export default function TeacherDashboard() {
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')
  const router = useRouter()

  useEffect(() => {
    const fetchReports = async () => {
      const token = localStorage.getItem('token')
      if (!token) return router.push('/login')

      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (!['teacher', 'admin', 'librarian'].includes(payload.role)) {
          router.push('/')
          return
        }

        const res = await fetch('/api/admin/reports', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setReports(await res.json())
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchReports()
  }, [])

  const processedReports = reports
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return 0
    })
    .filter(r => {
      if (filterStatus === 'pending') return r.status !== 'approved'
      if (filterStatus === 'approved') return r.status === 'approved'
      return true
    })
    .filter(r => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return r.student_name?.toLowerCase().includes(q) || r.book_title?.toLowerCase().includes(q)
    })

  const pendingCount = reports.filter(r => r.status !== 'approved').length
  const approvedCount = reports.filter(r => r.status === 'approved').length

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const handleApprove = async (reportItem) => {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await fetch(`/api/reports`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId: reportItem.id,
        bookId: reportItem.book_id,
        borrowId: reportItem.borrow_id,
        userId: reportItem.user_id
      })
    })

    if (res.ok) {
      setReports(prev => prev.map(r =>
        r.id === reportItem.id ? { ...r, status: 'approved' } : r
      ))
      toast.success(`${reportItem.student_name} — зачёт`)
      if (selectedReport?.id === reportItem.id) setSelectedReport(null)
    }
  }

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await fetch(`/api/admin/reports/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      setReports(prev => prev.filter(r => r.id !== id))
      if (selectedReport?.id === id) setSelectedReport(null)
      toast.success('Отчёт удалён')
    }
  }

  const answers = selectedReport ? [
    { num: 1, label: 'Две важные цитаты', text: selectedReport.quote1 },
    { num: 2, label: 'Что удивило', text: selectedReport.quote2 },
    { num: 3, label: 'Как в твоей жизни', text: selectedReport.life_example },
    { num: 4, label: 'Что применишь', text: selectedReport.apply_today },
    { num: 5, label: 'Новые факты', text: selectedReport.confusing },
  ] : []

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] pb-20">
      <div className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-7 bg-[#1a56db] rounded-full" />
            <h1 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] hidden sm:block">Проверка отчётов</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/library')}
              className="px-4 py-2 rounded-xl bg-[#f5f5f7] hover:bg-[#ececec] text-[#1d1d1f] text-[13px] font-medium transition-colors"
            >
              Каталог
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/15 text-[13px] font-medium transition-colors"
            >
              <LogOut size={13} /> Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 pt-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-7">
          <div className="bg-white border border-black/8 rounded-2xl p-4 sm:p-5">
            <p className="text-[10px] sm:text-[11px] text-[#86868b] uppercase tracking-wider font-medium mb-1">Всего работ</p>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">{reports.length}</p>
          </div>
          <div className="bg-[#ff9500]/8 border border-[#ff9500]/15 rounded-2xl p-4 sm:p-5">
            <p className="text-[10px] sm:text-[11px] text-[#ff9500] uppercase tracking-wider font-medium mb-1">Ожидают проверки</p>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#ff9500]">{pendingCount}</p>
          </div>
          <div className="bg-[#34c759]/8 border border-[#34c759]/15 rounded-2xl p-4 sm:p-5">
            <p className="text-[10px] sm:text-[11px] text-[#34c759] uppercase tracking-wider font-medium mb-1">Проверено</p>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#34c759]">{approvedCount}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-5 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              type="text"
              placeholder="Поиск по имени или книге"
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-black/10 pl-10 pr-4 py-2.5 rounded-xl text-[#1d1d1f] placeholder-[#86868b] outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/10 transition-all text-[14px]"
            />
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-black/8">
            {[
              { key: 'pending', label: 'Ожидают' },
              { key: 'approved', label: 'Проверено' },
              { key: 'all', label: 'Все' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                  filterStatus === f.key ? 'bg-[#1a56db] text-white' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#86868b] text-[14px]">Загрузка</div>
        ) : processedReports.length === 0 ? (
          <div className="py-20 text-center bg-white border border-dashed border-black/10 rounded-2xl">
            <p className="text-[#1d1d1f] text-[15px] font-medium mb-1">Пусто</p>
            <p className="text-[12px] text-[#86868b]">
              {searchQuery ? 'Попробуй изменить запрос' : 'Все отчёты проверены'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {processedReports.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedReport(item)}
                className={`flex flex-col md:flex-row md:items-center gap-3 md:gap-0 px-5 md:px-6 py-4 rounded-2xl transition-all cursor-pointer border ${
                  item.status === 'approved'
                    ? 'bg-white border-black/8 border-l-[3px] border-l-[#34c759]'
                    : 'bg-white border-black/8 hover:border-[#1a56db]/30 border-l-[3px] border-l-[#ff9500]'
                }`}
              >
                <div className="flex items-center gap-3 md:w-[200px]">
                  <div className="w-9 h-9 rounded-full bg-[#1a56db] flex items-center justify-center text-[12px] font-semibold text-white shrink-0">
                    {item.student_name?.charAt(0)}
                  </div>
                  <div className="font-semibold text-[14px] truncate text-[#1d1d1f]">{item.student_name}</div>
                </div>

                <div className="hidden md:block text-[#6e6e73] italic text-[13px] truncate md:flex-1 md:pr-6">
                  «{item.book_title}»
                </div>

                <div className="flex items-center justify-between md:justify-center md:w-24">
                  <span className="text-[#ff9500] text-[14px]">
                    {'★'.repeat(item.rating || 0)}{'☆'.repeat(5 - (item.rating || 0))}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 md:w-auto justify-end">
                  {item.status !== 'approved' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApprove(item) }}
                      className="p-2 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg transition-colors"
                      title="Одобрить"
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Удалить этот отчёт?')) handleDelete(item.id)
                    }}
                    className="p-2 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedReport(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-black/8 w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 sm:p-7 border-b border-black/5 flex justify-between items-start">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-medium text-[#1a56db] mb-1">Отчёт ученика</div>
                <h3 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">{selectedReport.student_name}</h3>
                <p className="text-[13px] text-[#6e6e73] mt-1">Книга: <span className="text-[#1d1d1f] italic">«{selectedReport.book_title}»</span></p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 bg-[#f5f5f7] hover:bg-[#ff3b30]/10 hover:text-[#ff3b30] rounded-full transition-colors text-[#86868b]">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 sm:p-7 overflow-y-auto space-y-4">
              <div className="flex items-center gap-5 p-4 bg-[#f5f5f7] rounded-xl">
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-[#86868b] mb-1 font-medium">Статус</h4>
                  <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium ${
                    selectedReport.status === 'approved'
                      ? 'bg-[#34c759]/15 text-[#34c759]'
                      : 'bg-[#ff9500]/15 text-[#ff9500]'
                  }`}>
                    {selectedReport.status === 'approved' ? 'Зачтено' : 'На проверке'}
                  </span>
                </div>
                <div className="w-px h-10 bg-black/8" />
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-[#86868b] mb-1 font-medium">Оценка</h4>
                  <span className="text-[#ff9500] text-[16px]">
                    {'★'.repeat(selectedReport.rating || 0)}{'☆'.repeat(5 - (selectedReport.rating || 0))}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {answers.map(a => (
                  <div key={a.num} className="p-4 bg-[#f5f5f7] rounded-xl">
                    <p className="text-[10px] text-[#1a56db] font-semibold mb-2">Вопрос {a.num}: {a.label}</p>
                    <p className="text-[14px] text-[#1d1d1f] leading-[1.5]">{a.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-[#f5f5f7] border-t border-black/5 flex gap-3">
              {selectedReport.status !== 'approved' && (
                <button
                  className="flex-1 bg-[#1a56db] hover:bg-[#1849b8] text-white py-3 rounded-xl font-medium text-[14px] transition-colors"
                  onClick={() => handleApprove(selectedReport)}
                >
                  Подтвердить и зачесть
                </button>
              )}
              <button onClick={() => setSelectedReport(null)} className="px-6 py-3 bg-white border border-black/10 rounded-xl hover:bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium transition-colors">
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}