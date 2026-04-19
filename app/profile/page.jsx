'use client'
import { useEffect, useState } from "react"
import { BookOpen, Heart, FileText, Trash2, ArrowLeft, Trophy, BookOpenText, CheckCircle, Clock, Plus, Star } from "lucide-react" 
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const getScoreStyle = (score) => {
  if (score >= 70) return 'text-sky-400 border-sky-400/20 bg-sky-400/5'
  if (score >= 40) return 'text-amber-400 border-amber-400/20 bg-amber-400/5'
  return "text-rose-400 border-rose-400/20 bg-rose-400/5"
}

const Profile = () => {
  const [user, setUser] = useState(null)
  const [activeBooks, setActiveBooks] = useState([])
  const [finishedBooks, setFinishedBooks] = useState([])
  const [favorites, setFavorites] = useState([])
  const [activeTab, setActiveTab] = useState('reading') 
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState([])
  const [trackerLogs, setTrackerLogs] = useState([])
  const [isAddingLog, setIsAddingLog] = useState(false)
  const today = new Date().toISOString().split('T')[0];
  const [isSubmitting,setIsSubmiting] = useState(false)
  const [formBook, setFormBook] = useState({ 
    title: '', 
    start_date: today, 
    end_date: today, 
    raiting: 5 
  });
  const [readingGoal, setReadingGoal] = useState(12);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0)

  const router = useRouter()
  const firstWord = user?.name?.charAt(0).toUpperCase() || "?"

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const [resProfile, resFav, resRep, resTracker] = await Promise.all([
        fetch("/api/profile", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/favorites", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch('/api/admin/reports', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/user/tracker', { headers : { "Authorization": `Bearer ${token}` } })
      ])

      if (resProfile.ok) {
        const data = await resProfile.json()
        setUser(data.user)
        setFinishedBooks(data.finished || [])
        setActiveBooks(data.active || [])
      }
      if (resFav.ok) setFavorites(await resFav.json() || [])
      if (resRep.ok) setReport(await resRep.json() || [])
      if (resTracker.ok) {
        const dataTracker = await resTracker.json()
        setTrackerLogs(dataTracker.bookTracker || [])
      }
    } catch (err) {
      console.error("Ошибка при загрузке данных:", err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async () => {
    if (!formBook.title || !formBook.start_date || !formBook.end_date) {
      toast.error("Пожалуйста, заполните название и обе даты");
      return;
    }
    setIsSubmiting(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/user/tracker", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(formBook)
      })
      if (res.ok) {
        setIsAddingLog(false)
        setFormBook({ title: '', start_date: '', end_date: '', raiting: 5 })
        toast.success("Запись успешно добавлена в трекер!", {
        style: { background: '#0d1a2e', color: '#fff', border: '1px solid #1a56db' }
        })
        await fetchData() 
      }
    } catch(err) {
      toast.error(err.message)
    } finally {
      setIsSubmiting(false)
    }
  }

  const handleInputChange = (e) => {
    setFormBook(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRemoveFav = async (bookId) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setFavorites(prev => prev.filter(b => b.id !== bookId))
    try {
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bookId })
      })
    } catch (err) { console.error(err) }
  }
  const handleGoalChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setReadingGoal(value);
  };

  const toggleGoalEdit = () => {
    setIsEditingGoal(!isEditingGoal);
    if (isEditingGoal) {
      toast.success(`Цель обновлена: ${readingGoal} книг`);
    }
  };
  return (
    <div className="min-h-screen bg-[#080c14] text-white pb-20">
      {user && (
        <div className="max-w-[1100px] mx-auto px-6">
          <button 
            onClick={() => window.history.back()} 
            className="text-[#4a6070] hover:text-white transition-colors pt-12 pb-10 flex items-center gap-2"
          >
            ← Назад к списку
          </button>

          {/* User Header */}
          <div className="pb-8 flex flex-row md:flex-row items-center gap-8 border-b border-white/5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#1a56db] to-[#60a5fa] rounded-full blur opacity-25 group-hover:opacity-50 transition"></div>
              <div className='relative w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#0d1a2e] border-2 border-[#1a56db] flex items-center justify-center font-bold text-4xl shadow-2xl'>
                {firstWord}
              </div>
            </div>
            <div className="text-center md:text-left space-y-2">
              <h1 className="text-xl md:text-5xl mb-4 font-black tracking-tight">{user.name}</h1>
              <span className="px-4 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] uppercase font-bold tracking-widest rounded-full">
                {user.role}
              </span>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="grid grid-cols-2 sm:flex gap-1 md:gap-4 mt-8 p-1 bg-[#0d1a2e]/50 border border-white/5 rounded-2xl w-fit overflow-x-auto">
            {[
              { id: 'shelf', label: 'Полка', icon: Trophy, count: finishedBooks?.length },
              { id: 'reading', label: 'Читаю', icon: BookOpenText, count: activeBooks?.length },
              { id: 'favorites', label: 'Избранное', icon: Heart, count: favorites?.length },
              { id: 'reports', label: 'Отчёты', icon: FileText, count: report?.length },
              { id: 'tracker', label: 'Трекер', icon: Clock, count: trackerLogs.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-2 py-2 sm:px-6 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-[#1a56db] text-white shadow-lg shadow-blue-500/20" 
                    : "text-[#4a6080] hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] sm:text-sm ${activeTab === tab.id ? 'bg-white/20' : 'bg-[#162236]'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-12">
            {/* READING TAB */}
            {activeTab === 'reading' && (
              <div className="space-y-4">
                {activeBooks.length === 0 ? (
                  <EmptyState message="Сейчас вы ничего не читаете" actionLabel="Выбрать книгу" />
                ) : (
                  activeBooks.map(book => (
                    <div key={book.borrow_id} className="group flex flex-row sm:flex-col items-center gap-6 p-5 bg-[#0d1a2e]/40 border border-white/5 rounded-[24px]">
                      <img src={book.cover_url} className="w-14 h-20 md:w-20 md:h-28 object-cover rounded-xl" alt="" />
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-xl font-bold mb-1">{book.title}</h3>
                        <p className="text-[#4a6080] mb-3">{book.author}</p>
                        <div className="text-orange-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full w-fit mx-auto sm:mx-0">
                          Срок: 14 дней
                        </div>
                      </div>
                      <button 
                        onClick={() => router.push(`/report/${book.borrow_id}`)}
                        className="w-full sm:w-auto px-8 py-3 bg-[#1a56db] hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                      >
                        Сдать отчет
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SHELF TAB */}
            
            {activeTab === 'shelf' && (
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                {finishedBooks.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-[#4a6080] border border-dashed border-white/5 rounded-3xl">
                    <EmptyState message="Вы еще не сдали ни одного отчета" actionLabel="Начать чтение" />
                  </div>
                ) : (
                  finishedBooks.map(book => (
                    <div key={book.borrow_id} className="group">
                      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-emerald-500/20 shadow-2xl">
                        <img src={book.cover_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                        <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-lg">ЗАЧТЕНО</div>
                      </div>
                      <h4 className="mt-3 font-bold text-md truncate">{book.title}</h4>
                      <p className="text-sm text-[#4a6080] truncate">{book.author}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* FAVORITES TAB */}
            {activeTab === 'favorites' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                {favorites.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-[#4a6080] border border-dashed border-white/5 rounded-3xl">Избранное пусто</div>
                ) : (
                  favorites.map(book => (
                    <div key={book.id} className="group relative">
                      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                        <img src={book.cover_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                           <button onClick={() => handleRemoveFav(book.id)} className="w-full py-2 bg-red-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                             <Trash2 size={14} /> Убрать
                           </button>
                        </div>
                      </div>
                      <h4 className="mt-3 font-bold text-sm truncate">{book.title}</h4>
                      <p className="text-xs text-[#4a6080] truncate">{book.author}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-6">
                {report.length === 0 ? (
                  <EmptyState message="Вы еще не сдали ни одного отчета" actionLabel="Начать чтение" />
                ) : (
                  report.map(rep => (
                    <div key={rep.id} className="bg-[#0d1a2e]/40 border border-white/5 rounded-[24px] p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-white">«{rep.book_title}»</h3>
                          <p className="text-sm text-[#4a6080] mt-1">{new Date(rep.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-5 py-2 rounded-full border text-sm font-black shadow-inner ${getScoreStyle(rep.ai_score)}`}>
                            ИИ: {rep.ai_score}%
                          </span>
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${rep.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {rep.status === 'approved' ? <CheckCircle size={18} /> : <Clock size={18} />}
                            {rep.status === 'approved' ? 'Зачтено' : 'На проверке'}
                          </div>
                        </div>
                      </div>
                      {rep.ai_feedback && (
                        <div className="bg-[#080c14] p-6 rounded-2xl border border-white/5">
                          <h4 className="text-xs uppercase tracking-widest text-sky-500 mb-5 font-bold">Разбор от AI</h4>
                          <div className="space-y-4 text-[#bdcadd]">
                            {rep.ai_feedback.split('Вопрос').map((text, index) => text && (
                              <div key={index} className="p-4 bg-[#0d1624] rounded-xl border border-white/5 text-sm">
                                <strong className="text-sky-400">Вопрос</strong>{text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'tracker' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="relative overflow-hidden bg-gradient-to-br from-[#1a56db]/20 to-transparent border border-blue-500/20 rounded-[32px] p-6 md:p-8">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-blue-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                        <Trophy size={14} /> Личная цель на 2026
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isEditingGoal ? (
                          <input
                            type="number"
                            autoFocus
                            value={readingGoal}
                            onChange={handleGoalChange}
                            onBlur={toggleGoalEdit}
                            onKeyDown={(e) => e.key === 'Enter' && toggleGoalEdit()}
                            className="bg-[#080c14] border border-blue-500 text-2xl font-black w-24 px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        ) : (
                          <h2 
                            onClick={toggleGoalEdit}
                            className="text-lg md:text-3xl font-black cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-2 group/text"
                          >
                            Прочитать {readingGoal} книг
                            <Plus size={16} className="text-[#4a6080] opacity-0 group-hover/text:opacity-100 transition-opacity" />
                          </h2>
                        )}
                      </div>

                      <p className="text-[#4a6080] text-sm">
                        Вы прочитали уже {finishedBooks.length}, осталось {Math.max(0, readingGoal - finishedBooks.length)}
                      </p>
                    </div>

                    {/* Прогресс-бар тоже нужно обновить под новый стейт */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-2xl font-black text-white">
                        {Math.round((finishedBooks.length / (readingGoal || 1)) * 100)}%
                      </div>
                      <div className="w-full md:w-64 h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min(100, (finishedBooks.length / (readingGoal || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Декоративный элемент фона */}
                  <div className="absolute -right-10 -bottom-10 text-blue-500/5 rotate-12">
                    <BookOpenText size={200} />
                  </div>
                </div>
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold">Трекер чтения</h2>
                    <p className="text-[#4a6080] text-xs md:text-sm">Ваша личная история прочитанных книг</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingLog(!isAddingLog)}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {isAddingLog ? "Отмена" : <><Plus size={18} /> Добавить запись</>}
                  </button>
                </div>

                {isAddingLog ? (
                  <div className="bg-[#0d1a2e]/60 border border-white/10 rounded-[24px] md:rounded-[32px] p-4 md:p-10  max-w-4xl mx-auto shadow-2xl backdrop-blur-sm">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[13px] uppercase tracking-widest text-sky-500 font-bold ml-1">Название книги</label>
                        <input 
                        name="title"
                        value={formBook.title}
                        onChange={handleInputChange}
                        className="w-full bg-[#080c14] border border-white/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all text-white placeholder:text-white/10 shadow-inner"
                        placeholder="Введите полное название книги..."
                      />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[13px] uppercase tracking-widest text-[#4a6080] font-bold ml-1">Дата начала</label>
                          <input 
                            type="date"
                            name="start_date"
                            value={formBook.start_date}
                            onChange={handleInputChange}
                            className="w-full bg-[#080c14] border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none text-white text-md"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-[#4a6080] font-bold ml-1">Дата завершения</label>
                          <input 
                            type="date"
                            name="end_date"
                            value={formBook.end_date}
                            onChange={handleInputChange}
                            className="w-full bg-[#080c14] border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none text-white text-md"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest text-[#4a6080] font-bold ml-1">Ваша оценка</label>
                        <div className="flex gap-3 justify-center sm:justify-start">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onMouseEnter={() => setHoveredStar(star)}
                              onMouseLeave={() => setHoveredStar(0)}
                              onClick={() => setFormBook(prev => ({ ...prev, raiting: star }))}
                              className="transition-transform active:scale-75 shadow-sm"
                            >
                              <Star 
                                className={`${
                                  star <= (hoveredStar || formBook.raiting) 
                                    ? "text-amber-400 fill-amber-400 w-24 md:w-32" 
                                    : "text-white/5 w-24 md:w-32" 
                                } transition-colors`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 text-sm ${
                          isSubmitting 
                            ? "bg-blue-900/50 text-white/50 cursor-not-allowed" 
                            : "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/10"
                        }`}
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : "Сохранить"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Logs List: Stacked on mobile, 2 columns on tablet+ */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {trackerLogs.length === 0 ? (
                      <div className="col-span-full">
                        <EmptyState message="История трекера пуста" actionLabel="Начать запись" />
                      </div>
                    ) : (
                      trackerLogs.map((log, idx) => (
                        <div key={idx} className="group p-5 bg-[#0d1a2e]/40 border border-white/5 rounded-[20px] active:bg-[#0d1a2e]/60 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400">
                              <BookOpen size={23} />
                            </div>
                            <div className="flex items-center gap-1 bg-[#080c14] px-2 py-1 rounded-full border border-white/5">
                              <Star size={18} className="text-amber-400 fill-amber-400" />
                              <span className="text-[10px] font-bold text-amber-400">{log.raiting}/5</span>
                            </div>
                          </div>
                          <h3 className="text-base font-bold mb-2 line-clamp-1">{log.title}</h3>
                          <div className="flex items-center gap-3 text-[11px] text-[#4a6080] font-medium">
                            <div className="flex items-center gap-1">
                              <Clock size={18} />
                              <span>{new Date(log.start_date).toLocaleDateString()}</span>
                            </div>
                            <span className="opacity-30">—</span>
                            <span>{new Date(log.end_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const EmptyState = ({ message, actionLabel }) => (
  <div className="py-20 flex flex-col items-center border border-dashed border-white/10 rounded-[40px] bg-[#0d1a2e]/20">
    <div className="w-16 h-16 bg-[#162236] rounded-full flex items-center justify-center mb-6 text-[#4a6080]"><BookOpen size={32} /></div>
    <p className="text-[#4a6080] text-lg mb-8">{message}</p>
    <button onClick={() => window.location.href = '/library'} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all">
      <ArrowLeft size={18} /> {actionLabel}
    </button>
  </div>
)

export default Profile;