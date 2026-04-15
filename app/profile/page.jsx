'use client'
import { useEffect, useState } from "react"
import { BookOpen, Heart, FileText, Trash2, ArrowLeft, Trophy, BookOpenText, CheckCircle, Clock } from "lucide-react" 
import { useRouter } from "next/navigation"

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

  const router = useRouter()
  const firstWord = user?.name?.charAt(0).toUpperCase() || "?"

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const res = await fetch("/api/profile", {
          headers: { "Authorization": `Bearer ${token}` }
        })
        const data = await res.json()
        setUser(data.user)
        setFinishedBooks(data.finished || [])
        setActiveBooks(data.active || [])

        const favRes = await fetch("/api/favorites", {
          headers: { "Authorization": `Bearer ${token}` }
        })
        if (favRes.ok) {
          const favData = await favRes.json()
          setFavorites(favData || [])
        }
        
        const RepRes = await fetch('/api/admin/reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (RepRes.ok) {
          const dataRep = await RepRes.json() 
          setReport(dataRep || [])
        }
        
      } catch (err) {
        console.error("Ошибка при загрузке данных:", err)
      }
    }
    fetchData()
  }, [])

  const handleRemoveFav = async (bookId) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setFavorites(prev => prev.filter(b => b.id !== bookId))
    try {
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bookId })
      })
    } catch (err) { console.error(err) }
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-white pb-20">
      {user && (
        <div className="max-w-[1100px] mx-auto px-6">
          
          <div className="pt-12 pb-8 flex flex-col md:flex-row items-center gap-8 border-b border-white/5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#1a56db] to-[#60a5fa] rounded-full blur opacity-25 group-hover:opacity-50 transition"></div>
              <div className='relative w-24 h-24 rounded-full bg-[#0d1a2e] border-2 border-[#1a56db] flex items-center justify-center font-bold text-4xl shadow-2xl'>
                {firstWord}
              </div>
            </div>
            
            <div className="text-center md:text-left space-y-2">
              <h1 className="text-3xl md:text-5xl mb-4 font-black tracking-tight">{user.name}</h1>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <span className="px-4 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] uppercase font-bold tracking-widest rounded-full">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-1 md:gap-4 mt-8 p-1 bg-[#0d1a2e]/50 border border-white/5 rounded-2xl w-fit overflow-x-auto">
            {[
              { id: 'shelf', label: 'Полка', icon: Trophy, count: finishedBooks?.length || 0 },
              { id: 'reading', label: 'Читаю', icon: BookOpenText, count: activeBooks?.length || 0},
              { id: 'favorites', label: 'Избранное', icon: Heart, count: favorites?.length || 0 },
              { id: 'reports', label: 'Отчёты', icon: FileText, count: report?.length || 0 }, // Считаем реальные отчеты
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-[#1a56db] text-white shadow-lg shadow-blue-500/20" 
                    : "text-[#4a6080] hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-[#162236]'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-12">
            
            {activeTab === 'reading' && (
              <div className="space-y-4">
                {activeBooks.length === 0 ? (
                  <EmptyState message="Сейчас вы ничего не читаете" actionLabel="Выбрать книгу" />
                ) : (
                 activeBooks.map(book => (
                    <div key={book.borrow_id} className="group flex flex-col sm:flex-row items-center gap-6 p-5 bg-[#0d1a2e]/40 border border-white/5 rounded-[24px]">
                      <img src={book.cover_url} className="w-20 h-28 object-cover rounded-xl" alt="" />
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-xl font-bold mb-1">{book.title}</h3>
                        <p className="text-[#4a6080] mb-3">{book.author}</p>
                        <div className="text-orange-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full w-fit mx-auto sm:mx-0">
                          Срок: 14 дней
                        </div>
                      </div>
                      <button 
                        onClick={() => router.push(`/report/${book.borrow_id}`)}
                        className="w-full sm:w-auto px-8 py-3 bg-[#1a56db] hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                      >
                        Сдать отчет
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'shelf' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                {finishedBooks.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-[#4a6080] border border-dashed border-white/5 rounded-3xl">
                    На полке пока пусто. Сдайте свой первый отчет!
                  </div>
                ) : (
                  finishedBooks.map(book => (
                    <div key={book.borrow_id} className="group">
                      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-emerald-500/20 shadow-2xl">
                        <img src={book.cover_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                        <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-lg">
                          ЗАЧТЕНО
                        </div>
                      </div>
                      <h4 className="mt-3 font-bold text-md truncate">{book.title}</h4>
                      <p className="text-sm text-[#4a6080] truncate">{book.author}</p>
                    </div>
                  ))
                )}
              </div>
            )}

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
                           <button 
                             onClick={() => handleRemoveFav(book.id)}
                             className="w-full py-2 bg-red-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                           >
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
                            Проверка ИИ: {rep.ai_score}%
                          </span>
                          
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                            rep.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {rep.status === 'approved' ? <CheckCircle size={18} /> : <Clock size={18} />}
                            {rep.status === 'approved' ? 'Зачтено' : 'На проверке'}
                          </div>
                        </div>
                      </div>

                      {rep.ai_feedback && (
                        <div className="bg-[#080c14] p-6 rounded-2xl border border-white/5">
                          <h4 className="text-xs uppercase tracking-widest text-sky-500 mb-5 font-bold">Разбор от Claude AI</h4>
                          <div className="space-y-4 text-[#bdcadd] leading-relaxed">
                            {rep.ai_feedback.split('Вопрос').map((text, index) => (
                              text && (
                                <div key={index} className="p-4 bg-[#0d1624] rounded-xl border border-white/5">
                                  <p className="text-sm"><strong className="text-sky-400">Вопрос</strong>{text}</p>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  ))
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
    <div className="w-16 h-16 bg-[#162236] rounded-full flex items-center justify-center mb-6 text-[#4a6080]">
      <BookOpen size={32} />
    </div>
    <p className="text-[#4a6080] text-lg mb-8">{message}</p>
    <button onClick={() => window.location.href = '/library'} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all">
      <ArrowLeft size={18} /> {actionLabel}
    </button>
  </div>
)

export default Profile