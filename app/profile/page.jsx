'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BookOpen, Heart, CheckCircle, Clock, Star, Target,
  Trophy, Library, Plus, X, ChevronRight, Sparkles
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts'

const TABS = [
  { key: 'reading', label: 'Читаю', icon: BookOpen },
  { key: 'finished', label: 'Прочитано', icon: CheckCircle },
  { key: 'favorites', label: 'Избранное', icon: Heart }
]

const COLORS = ['#1a56db', '#34c759', '#ff9500', '#ff2d55', '#af52de', '#5856d6', '#ff3b30', '#5ac8fa']

export default function ProfilePage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [active, setActive] = useState([])
  const [submitted, setSubmitted] = useState([])
  const [finished, setFinished] = useState([])
  const [favorites, setFavorites] = useState([])
  const [stats, setStats] = useState(null)
  const [readingGoal, setReadingGoal] = useState(12)
  const [activeTab, setActiveTab] = useState('reading')
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalInput, setGoalInput] = useState(12)

  const fetchAll = async () => {
    const t = localStorage.getItem('token')
    if (!t) return router.push('/login')

    try {
      const [profile, fav] = await Promise.all([
        fetch('/api/profile', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/favorites', { headers: { Authorization: `Bearer ${t}` } })
      ])

      if (!profile.ok) throw new Error('Не удалось загрузить профиль')

      const p = await profile.json()
      setUserData(p.user)
      setActive(p.active || [])
      setSubmitted(p.submitted || [])
      setFinished(p.finished || [])
      setStats(p.stats)
      setReadingGoal(p.reading_goal || 12)

      if (fav.ok) {
        const f = await fav.json()
        setFavorites(Array.isArray(f) ? f : (f.favorites || []))
      }
    } catch (err) {
      console.error(err)
      toast.error('Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const updateGoal = async () => {
    const t = localStorage.getItem('token')
    try {
      const res = await fetch('/api/profile/goal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalInput })
      })
      if (!res.ok) throw new Error()
      setReadingGoal(goalInput)
      setShowGoalModal(false)
      toast.success(`Цель: ${goalInput} книг`)
    } catch (err) {
      toast.error('Не удалось обновить цель')
    }
  }

  const removeFavorite = async (bookId) => {
    const t = localStorage.getItem('token')
    try {
      await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId })
      })
      setFavorites(prev => prev.filter(f => f.book_id !== bookId && f.id !== bookId))
      toast.success('Убрано из избранного')
    } catch (err) {
      toast.error('Ошибка')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
      </div>
    )
  }

  if (!userData) return null

  const finishedCount = parseInt(stats?.books_finished || 0)
  const genresCount = parseInt(stats?.genres_count || 0)
  const progress = readingGoal ? Math.min(100, Math.round((finishedCount / readingGoal) * 100)) : 0

  const monthlyData = buildMonthlyData(finished)
  const genreData = buildGenreData(finished)

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Navbar onBack={() => router.push('/library')} />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-8 pb-20">

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-black/8 rounded-[24px] p-6 sm:p-8 mb-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
        >
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#1a56db] flex items-center justify-center font-semibold text-3xl sm:text-4xl text-white shrink-0">
              {userData.name?.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">
                  {userData.name}
                </h1>
                {userData.role === 'librarian' && (
                  <span className="px-2 py-0.5 rounded-full bg-[#1a56db]/10 text-[#1a56db] text-[11px] font-medium">
                    БИБЛИОТЕКАРЬ
                  </span>
                )}
              </div>
              <p className="text-[14px] text-[#6e6e73] mb-4">
                {userData.email}
                {userData.class_name && <span className="text-[#86868b]"> · {userData.class_name}</span>}
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge icon={Trophy} label={`${finishedCount} прочитано`} color="#1a56db" />
                <Badge icon={Library} label={`${genresCount} жанров`} color="#34c759" />
                <Badge icon={BookOpen} label={`${active.length} сейчас читаю`} color="#ff9500" />
                <Badge icon={Heart} label={`${favorites.length} в избранном`} color="#ff2d55" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Goal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white border border-black/8 rounded-[24px] p-6 sm:p-7 mb-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-[17px] font-semibold flex items-center gap-2 text-[#1d1d1f]">
                <Target size={16} className="text-[#1a56db]" /> Цель на {new Date().getFullYear()}
              </h3>
              <p className="text-[13px] text-[#86868b] mt-0.5">Сколько книг хочешь прочитать</p>
            </div>
            <button
              onClick={() => { setGoalInput(readingGoal); setShowGoalModal(true) }}
              className="text-[13px] px-3 py-1.5 rounded-lg bg-[#f5f5f7] hover:bg-[#ececec] transition-colors font-medium text-[#1d1d1f]"
            >
              Изменить
            </button>
          </div>

          <div className="flex items-end justify-between mb-3">
            <div className="text-4xl font-semibold text-[#1d1d1f] tracking-tight">
              {finishedCount}
              <span className="text-[#86868b] text-2xl"> / {readingGoal}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-[#1a56db]">{progress}%</div>
              <div className="text-[11px] text-[#86868b]">выполнено</div>
            </div>
          </div>

          <div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              className="h-full bg-[#1a56db] rounded-full"
            />
          </div>

          {progress >= 100 && (
            <div className="mt-4 p-3 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 text-[#34c759] text-[13px] font-medium flex items-center gap-2">
              <Sparkles size={14} /> Цель достигнута!
            </div>
          )}
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="bg-white border border-black/8 rounded-[24px] p-6"
          >
            <h3 className="text-[16px] font-semibold mb-1 text-[#1d1d1f]">Книги по месяцам</h3>
            <p className="text-[12px] text-[#86868b] mb-5">Твой ритм чтения</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f7" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#86868b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#86868b', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#1a56db' }}
                    contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#1a56db" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white border border-black/8 rounded-[24px] p-6"
          >
            <h3 className="text-[16px] font-semibold mb-1 text-[#1d1d1f]">Жанры</h3>
            <p className="text-[12px] text-[#86868b] mb-5">Что ты читал</p>
            {genreData.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-[#86868b] text-[13px]">
                Прочитай первую книгу
              </div>
            ) : (
              <div className="flex items-center gap-4 h-56">
                <div className="flex-1 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genreData} dataKey="count" nameKey="genre"
                           cx="50%" cy="50%" innerRadius={48} outerRadius={85} paddingAngle={2} stroke="none">
                        {genreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5 max-h-56 overflow-y-auto">
                  {genreData.slice(0, 6).map((g, i) => (
                    <div key={g.genre} className="flex items-center gap-2 text-[13px]">
                      <div className="w-2.5 h-2.5 rounded shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 font-medium truncate text-[#1d1d1f]">{g.genre}</div>
                      <div className="text-[#86868b]">{g.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 bg-[#f5f5f7] rounded-xl w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon
            const count =
              tab.key === 'reading' ? active.length :
              tab.key === 'finished' ? finished.length :
              favorites.length
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${activeTab === tab.key ? 'bg-[#f5f5f7] text-[#6e6e73]' : 'bg-white/0 text-[#86868b]'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'reading' && (
            <BookGrid
              books={active}
              emptyText="Сейчас ничего не читаешь"
              action={(book) => (
                <button
                  onClick={() => router.push(`/report/${book.borrow_id}`)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a56db] text-white text-[12px] font-medium hover:bg-[#1849b8] transition-colors"
                >
                  Сдать отчёт
                </button>
              )}
              extra={(book) => book.due_date && (
                <div className="text-[11px] text-[#86868b] flex items-center gap-1">
                  <Clock size={10} /> до {new Date(book.due_date).toLocaleDateString('ru-RU')}
                </div>
              )}
            />
          )}

          {activeTab === 'finished' && (
            <BookGrid
              books={finished}
              emptyText="Прочитанных книг пока нет"
            />
          )}

          {activeTab === 'favorites' && (
            <BookGrid
              books={favorites}
              emptyText="Нет избранных книг"
              onRemove={removeFavorite}
            />
          )}
        </motion.div>
      </main>

      {showGoalModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowGoalModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white border border-black/10 rounded-2xl w-full max-w-sm p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Цель на год</h3>
              <button onClick={() => setShowGoalModal(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X size={18} />
              </button>
            </div>
            <p className="text-[13px] text-[#6e6e73] mb-4">Сколько книг хочешь прочитать в {new Date().getFullYear()}?</p>
            <input
              type="number"
              min="1"
              max="365"
              value={goalInput}
              onChange={e => setGoalInput(parseInt(e.target.value) || 1)}
              className="w-full bg-[#f5f5f7] border border-transparent px-4 py-3 rounded-xl text-[28px] font-semibold text-center text-[#1d1d1f] outline-none focus:border-[#1a56db]/30 focus:bg-white transition-all"
            />
            <button
              onClick={updateGoal}
              className="w-full mt-5 py-3 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[15px] font-medium transition-colors"
            >
              Сохранить
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

const Badge = ({ icon: Icon, label, color }) => (
  <span className="px-3 py-1.5 rounded-full bg-[#f5f5f7] text-[12px] font-medium text-[#1d1d1f] flex items-center gap-1.5">
    <Icon size={12} style={{ color }} /> {label}
  </span>
)

const BookGrid = ({ books, emptyText, action, extra, onRemove }) => {
  const router = useRouter()

  if (!books || books.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-dashed border-black/10 rounded-2xl">
        <p className="text-[#86868b] text-[14px]">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {books.map((book, i) => (
        <motion.div
          key={book.borrow_id || book.book_id || book.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="group bg-white border border-black/8 rounded-2xl overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
        >
          <div
            className="relative aspect-[2/3] bg-[#f5f5f7] overflow-hidden"
            onClick={() => router.push(`/books/${book.book_id || book.id}`)}
          >
            {book.cover_url && (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover cursor-pointer" loading="lazy" />
            )}
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(book.book_id || book.id) }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-[#1d1d1f] hover:bg-[#ff3b30] hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="p-3">
            <div className="font-semibold text-[13px] line-clamp-1 text-[#1d1d1f]">{book.title}</div>
            <div className="text-[11px] text-[#86868b] line-clamp-1 mb-2">{book.author}</div>
            {extra && extra(book)}
            {action && action(book)}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

const Navbar = ({ onBack }) => {
  const router = useRouter()
  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button
          onClick={onBack || (() => router.push('/library'))}
          className="text-[14px] font-medium text-[#6e6e73] hover:text-[#1a56db] transition-colors flex items-center gap-1.5"
        >
          ← Каталог
        </button>
        <span className="text-[14px] font-semibold text-[#1d1d1f]">Профиль</span>
        <div className="w-16" />
      </div>
    </nav>
  )
}

function buildMonthlyData(finished) {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  const currentYear = new Date().getFullYear()
  const counts = Array(12).fill(0)
  finished?.forEach(b => {
    if (b.returned_at) {
      const d = new Date(b.returned_at)
      if (d.getFullYear() === currentYear) counts[d.getMonth()]++
    }
  })
  return months.map((m, i) => ({ month: m, count: counts[i] }))
}

function buildGenreData(finished) {
  const map = {}
  finished?.forEach(b => {
    if (b.genre) map[b.genre] = (map[b.genre] || 0) + 1
  })
  return Object.entries(map).map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count)
}