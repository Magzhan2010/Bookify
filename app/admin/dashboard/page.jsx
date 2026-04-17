'use client'
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const TeacherDashboard = () => {
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
        if (payload.role !== 'teacher' && payload.role !== 'admin') {
          router.push('/')
          return
        }

        const res = await fetch('/api/admin/reports', {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })
        const data = await res.json()
        setReports(data)
      } catch (err) {
        console.error("Ошибка загрузки:", err)
      } finally {
        setLoading(false)
      }
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
      return r.student_name.toLowerCase().includes(q) || r.book_title.toLowerCase().includes(q)
    })

  const pendingCount = reports.filter(r => r.status !== 'approved').length
  const approvedCount = reports.filter(r => r.status === 'approved').length

  const getScoreStyle = (score) => {
    if (score >= 70) return 'text-sky-400 border-sky-400/20 bg-sky-400/5'
    if (score >= 40) return 'text-amber-400 border-amber-400/20 bg-amber-400/5'
    return "text-rose-400 border-rose-400/20 bg-rose-400/5"
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const handleApprove = async(reportItem) => {
    const token = localStorage.getItem('token')
    if (!token) return null
    
    const res = await fetch(`/api/reports`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: reportItem.id,
        bookId: reportItem.book_id,
        borrowId: reportItem.borrow_id,
        userId: reportItem.user_id
      })
    })
    
    if (res.ok) {
      // Обновляем список без перезагрузки страницы
      setReports(prev => prev.map(r => 
        r.id === reportItem.id ? { ...r, status: 'approved' } : r
      ))
      
      toast.success("Отчет одобрен!", {
        description: `${reportItem.student_name} получил зачет.`,
        style: { background: '#0d1a2e', border: '1px solid #10b981', color: '#fff' }
      })
      
      // Если модалка была открыта, закрываем её
      if (selectedReport?.id === reportItem.id) setSelectedReport(null)
    }
  }

  const handleDelete = async(id) => {
    const token = localStorage.getItem('token')
    if (!token) return null
    
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    })
    if (res.ok) {
      setReports(prev => prev.filter(r => r.id !== id))
      if (selectedReport?.id === id) setSelectedReport(null)
    }
  }
  
  return (
    <div className="min-h-screen bg-[#06090f] text-white font-montserrat pb-20">
      
      {/* HEADER */}
      <div className="border-b border-white/5 bg-[#0a121e]/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1300px] mx-auto py-4 px-6 md:px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-2 h-8 bg-sky-600 rounded-full shadow-[0_0_20px_rgba(56,189,248,0.4)]" />
            <h1 className="text-2xl font-black tracking-tighter hidden sm:block">
              Teacher <span className="text-sky-500">Console</span>
            </h1>
          </div>
          <div className="flex gap-8">
            <button className="bg-[#162236] hover:bg-sky-500/20 hover:text-sky-400 text-[#4a6080] transition-all py-2 px-5 rounded-xl border border-white/5 font-medium text-sm" 
              onClick={() => router.push('/library')}>Главная страница</button>
            <button onClick={handleLogout} className="bg-[#111c2e] hover:bg-rose-500/10 hover:text-rose-400 text-[#5c7294] transition-all py-2.5 px-6 rounded-xl border border-white/5 text-sm font-semibold">
              Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-6 md:px-8 pt-10">
        
        {/* СТАТИСТИКА (Быстрый взгляд) */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-[#0a121e]/60 border border-white/5 p-5 rounded-2xl">
            <p className="text-xs text-[#5c7294] uppercase tracking-widest font-bold mb-1">Всего работ</p>
            <p className="text-3xl font-black text-white">{reports.length}</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl">
            <p className="text-xs text-amber-400/80 uppercase tracking-widest font-bold mb-1">Ожидают проверки</p>
            <p className="text-3xl font-black text-amber-400">{pendingCount}</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl">
            <p className="text-xs text-emerald-400/80 uppercase tracking-widest font-bold mb-1">Проверено</p>
            <p className="text-3xl font-black text-emerald-400">{approvedCount}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <input 
              type="text"
              placeholder="Поиск по имени или книге..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a121e] border border-white/10 px-4 py-3 pl-11 rounded-xl text-sm text-white placeholder-[#5c7294] focus:outline-none focus:border-sky-500/50 transition"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c7294]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <div className="flex gap-2 bg-[#0a121e] p-1.5 rounded-xl border border-white/5">
            {[
              { key: 'pending', label: 'Ожидают' },
              { key: 'approved', label: 'Проверено' },
              { key: 'all', label: 'Все' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === f.key ? 'bg-white/10 text-white shadow' : 'text-[#5c7294] hover:text-white'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#5c7294]">Загрузка отчетов...</div>
        ) : processedReports.length === 0 ? (
          <div className="py-24 text-center bg-[#0a121e]/40 border border-dashed border-white/10 rounded-[32px]">
            <p className="text-[#5c7294] text-lg">В этой категории пусто</p>
            <p className="text-sm text-[#5c7294]/60 mt-2">{searchQuery ? "Попробуйте изменить запрос" : "Все отчеты проверены, отличная работа!"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {processedReports.map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedReport(item)}
                className={`flex flex-col md:flex-row md:items-center gap-4 md:gap-0 px-6 md:px-8 py-5 rounded-2xl transition-all duration-300 cursor-pointer group border border-white/5 hover:border-sky-500/30 hover:-translate-y-0.5 ${item.status === "approved" ? 'bg-[#0a121e]/40 border-l-4 border-l-emerald-500' : 'bg-[#0a121e]/60 border-l-4 border-l-amber-500 hover:bg-[#0a121e]'}`}
              >
                
                {/* Ученик */}
                <div className="flex items-center gap-3 md:w-[1.5fr]">
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sm font-bold text-sky-400 shrink-0">
                    {item.student_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-base group-hover:text-sky-400 transition-colors">{item.student_name}</div>
                    <div className="text-xs text-[#5c7294] md:hidden">«{item.book_title}»</div>
                  </div>
                </div>

                {/* Книга (скрывается на мобилках, показывается выше) */}
                <div className="hidden md:block text-[#7a8eb0] italic text-sm pr-8 truncate md:w-[2.5fr]">
                  «{item.book_title}»
                </div>

                {/* Оценка ИИ */}
                <div className="flex items-center justify-between md:justify-center md:w-24">
                  <span className={`px-4 py-1.5 rounded-full border text-xs font-black ${getScoreStyle(item.ai_score)}`}>
                    {item.ai_score}%
                  </span>
                </div>

                {/* КНОПКИ ДЕЙСТВИЙ (Самое важное!) */}
                <div className="flex items-center gap-2 md:w-auto justify-end">
                  
                  {/* БЫСТРАЯ КНОПКА ОДОБРИТЬ (без открытия модалки) */}
                  {item.status !== 'approved' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); 
                        handleApprove(item); // Передаем сам объект!
                      }}
                      className="p-2.5 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Быстро одобрить"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                  )}

                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); 
                      if(confirm('Удалить этот отчет?')) handleDelete(item.id);
                    }}
                    className="p-2.5 text-[#4a6080] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Удалить"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

     
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={() => setSelectedReport(null)}>
          <div className="bg-[#0a121e] border border-white/10 w-full max-w-3xl max-h-[85vh] rounded-[32px] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            
            <div className="p-8 border-b border-white/5 flex justify-between items-start bg-[#0d1624]">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-sky-500 font-bold mb-1">Детали отчета</div>
                <h3 className="text-3xl font-extrabold tracking-tighter">{selectedReport.student_name}</h3>
                <p className="text-[#7a8eb0] mt-1">Книга: <span className="text-white italic">«{selectedReport.book_title}»</span></p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-3 bg-[#162236] hover:bg-rose-500/10 hover:text-rose-400 rounded-full transition-colors text-[#5c7294]">✕</button>
            </div>
            
            <div className="p-9 overflow-y-auto space-y-8 bg-[#0a121e]">
              <div className="flex items-center gap-6 p-5 bg-[#0d1624] rounded-2xl border border-white/5">
                <div>
                    <h4 className="text-xs uppercase tracking-widest text-[#5c7294] mb-2 font-bold">Оценка ИИ</h4>
                    <span className={`px-6 py-2.5 rounded-full border text-base font-black ${getScoreStyle(selectedReport.ai_score)}`}>
                        {selectedReport.ai_score} / 100
                    </span>
                </div>
                <div className="w-px h-12 bg-white/5" />
                <div>
                    <h4 className="text-xs uppercase tracking-widest text-[#5c7294] mb-2 font-bold">Статус</h4>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${selectedReport.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {selectedReport.status === 'approved' ? '✅ Проверен' : '⏳ Ожидает'}
                    </span>
                </div>
              </div>
              
              <div className="p-7 bg-[#080c14] rounded-2xl border border-white/5">
                <h4 className="text-xs uppercase tracking-widest text-sky-500 mb-5 font-bold">Анализ Claude AI</h4>
                <div className="space-y-5 text-[#bdcadd] leading-relaxed">
                    {selectedReport.ai_feedback.split('Вопрос').map((text,index) => (
                      text && (
                        <div key={index} className="p-5 bg-[#0d1624] rounded-xl border border-white/5">
                          <p className="text-base"><strong className="text-sky-400">Вопрос</strong>{text}</p>
                        </div>
                      )
                    ))}
                </div>
              </div>
            </div>

            <div className="p-7 bg-[#0d1624] border-t border-white/5 flex gap-4">
                {selectedReport.status !== 'approved' && (
                    <button 
                      className="flex-1 bg-sky-600 hover:bg-sky-500 py-4 rounded-xl font-bold transition-all text-lg shadow-[0_5px_15px_rgba(56,189,248,0.2)]" 
                      onClick={() => handleApprove(selectedReport)} // ИСправлено!
                    >
                        Подтвердить и зачесть
                    </button>
                )}
                <button onClick={() => setSelectedReport(null)} className="px-10 py-4 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-[#7a8eb0] font-semibold">
                    Закрыть
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherDashboard