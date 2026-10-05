'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BookOpen, Heart, CheckCircle, Clock, Star, Target,
  TrendingUp, Trophy, Library, Plus, X, ChevronRight, Sparkles
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

const COLORS = ['#e8b94e', '#4ecdc4', '#ff5d8f', '#60a5fa', '#a78bfa', '#fb923c', '#34d399', '#f472b6']

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
      const [profile, fav, reports] = await Promise.all([
        fetch('/api/profile', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/favorites', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${t}` } })
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
      toast.error('Ошибка загрузки профиля')
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
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ goal: goalInput })
      })
      if (!res.ok) throw new Error('Server error')
      setReadingGoal(goalInput)
      setShowGoalModal(false)
      toast.success(`Цель обновлена: ${goalInput} книг`)
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
      <div className="min-h-screen bg-[#06070d] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
      </div>
    )
  }

  if (!userData) {
    return null
  }

  const finishedCount = parseInt(stats?.books_finished || 0)
  const genresCount = parseInt(stats?.genres_count || 0)
  const progress = readingGoal ? Math.min(100, Math.round((finishedCount / readingGoal) * 100)) : 0

  // График по месяцам (из finished)
  const monthlyData = buildMonthlyData(finished)
  // Жанры
  const genreData = buildGenreData(finished)

  return (
    <div className="min-h-screen bg-[#06070d] text-white">
      <Navbar onBack={() => router.push('/library')} />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-20">

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#11141f] to-[#0a0c17] border border-white/5 rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#e8b94e]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start gap-5 relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#e8b94e] to-[#9c6f25] flex items-center justify-center font-display text-3xl sm:text-4xl font-black text-[#06070d] shrink-0 shadow-2xl shadow-[#e8b94e]/30"
            >
              {userData.name?.charAt(0).toUpperCase()}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-2xl sm:text-4xl font-black tracking-tight">
                  {userData.name}
                </h1>
                {userData.role === 'librarian' && (
                  <span className="px-2 py-0.5 rounded-full bg-[#e8b94e]/20 text-[#e8b94e] text-xs font-bold">
                    БИБЛИОТЕКАРЬ
                  </span>
                )}
              </div>
              <p className="text-[#94a3b8] mb-3">
                {userData.email}
                {userData.class_name && <span className="text-[#5a6383]"> · {userData.class_name}</span>}
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-bold flex items-center gap-1">
                  <Trophy size={12} className="text-[#e8b94e]" />
                  {finishedCount} прочитано
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-bold flex items-center gap-1">
                  <Library size={12} className="text-[#4ecdc4]" />
                  {genresCount} жанров
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-bold flex items-center gap-1">
                  <BookOpen size={12} className="text-[#60a5fa]" />
                  {active.length} сейчас читаю
                </span>
                <span className="px-3 py-1 rounded-full bg-[#ff5d8f]/10 text-[#ff5d8f] text-xs font-bold flex items-center gap-1">
                  <Heart size={12} />
                  {favorites.length} в избранном
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#11141f] border border-white/5 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Target size={18} className="text-[#e8b94e]" /> Цель на {new Date().getFullYear()} год
              </h3>
              <p className="text-sm text-[#5a6383] mt-0.5">Сколько книг ты хочешь прочитать</p>
            </div>
            <button
              onClick={() => { setGoalInput(readingGoal); setShowGoalModal(true) }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              Изменить
            </button>
          </div>

          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-4xl font-display font-black text-gradient-gold">
                {finishedCount}
                <span className="text-[#5a6383] text-2xl"> / {readingGoal}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-display font-black text-[#4ecdc4]">{progress}%</div>
              <div className="text-xs text-[#5a6383]">выполнено</div>
            </div>
          </div>

          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#e8b94e] to-[#c89538] rounded-full relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>

          {progress >= 100 && (
            <div className="mt-4 p-3 rounded-xl bg-[#4ecdc4]/10 border border-[#4ecdc4]/20 text-[#4ecdc4] text-sm font-semibold flex items-center gap-2">
              <Sparkles size={16} /> Цель достигнута! Ты машина 📚
            </div>
          )}
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#11141f] border border-white/5 rounded-2xl p-6"
          >
            <h3 className="font-display font-bold text-lg mb-1">Книги по месяцам</h3>
            <p className="text-sm text-[#5a6383] mb-4">Твой ритм чтения</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1f30" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#5a6383', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#5a6383', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: '#e8b94e10' }}
                    contentStyle={{ background: '#0a0c17', border: '1px solid #1a1f30', borderRadius: 12 }}
                  />
                  <Bar dataKey="count" fill="#e8b94e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#11141f] border border-white/5 rounded-2xl p-6"
          >
            <h3 className="font-display font-bold text-lg mb-1">Жанры</h3>
            <p className="text-sm text-[#5a6383] mb-4">Что ты читал</p>
            {genreData.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-[#5a6383] text-sm">
                Прочитай первую книгу — увидишь статистику здесь
              </div>
            ) : (
              <div className="flex items-center gap-4 h-56">
                <div className="flex-1 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genreData} dataKey="count" nameKey="genre"
                           cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {genreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0a0c17', border: '1px solid #1a1f30', borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 max-h-56 overflow-y-auto">
                  {genreData.map((g, i) => (
                    <div key={g.genre} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 text-sm font-semibold truncate">{g.genre}</div>
                      <div className="text-xs text-[#5a6383]">{g.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
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
                className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d]'
                    : 'bg-white/5 text-[#94a3b8] hover:bg-white/10'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.key ? 'bg-[#06070d]/20' : 'bg-white/10'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {activeTab === 'reading' && (
            <BookGrid
              books={active}
              emptyText="Сейчас ничего не читаешь. Возьми книгу из каталога!"
              action={(book) => (
                <button
                  onClick={() => router.push(`/report/${book.borrow_id}`)}
                  className="w-full px-3 py-2 rounded-xl bg-[#e8b94e] text-[#06070d] font-bold text-xs hover:bg-[#e8b94e]/90"
                >
                  Сдать отчёт
                </button>
              )}
              extra={(book) => book.due_date && (
                <div className="text-xs text-[#5a6383] flex items-center gap-1">
                  <Clock size={10} /> до {new Date(book.due_date).toLocaleDateString('ru-RU')}
                </div>
              )}
            />
          )}

          {activeTab === 'finished' && (
            <BookGrid
              books={finished}
              emptyText="Прочитанных книг пока нет. Время начать!"
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

      {/* Goal modal */}
      {showGoalModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowGoalModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#11141f] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Цель на год</h3>
              <button onClick={() => setShowGoalModal(false)} className="text-[#5a6383] hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-[#94a3b8] mb-4">Сколько книг хочешь прочитать в {new Date().getFullYear()}?</p>
            <input
              type="number"
              min="1"
              max="365"
              value={goalInput}
              onChange={e => setGoalInput(parseInt(e.target.value) || 1)}
              className="w-full bg-[#0a0c17] border border-white/10 px-4 py-3 rounded-xl text-white text-2xl font-bold text-center outline-none focus:border-[#e8b94e]/40"
            />
            <button
              onClick={updateGoal}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold"
            >
              Сохранить
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

const BookGrid = ({ books, emptyText, action, extra, onRemove }) => {
  const router = useRouter()

  if (!books || books.length === 0) {
    return (
      <div className="text-center py-16 bg-[#11141f] border border-dashed border-white/10 rounded-2xl">
        <p className="text-[#5a6383]">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {books.map((book, i) => (
        <motion.div
          key={book.borrow_id || book.book_id || book.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="group bg-[#11141f] border border-white/5 rounded-2xl overflow-hidden hover:border-[#e8b94e]/30 transition-all"
        >
          <div
            className="relative aspect-[2/3] bg-[#0a0c17] overflow-hidden cursor-pointer"
            onClick={() => router.push(`/books/${book.book_id || book.id}`)}
          >
            {book.cover_url && (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            )}
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(book.book_id || book.id) }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white hover:bg-red-500/80 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="p-3">
            <div className="font-bold text-sm line-clamp-1">{book.title}</div>
            <div className="text-xs text-[#5a6383] line-clamp-1 mb-2">{book.author}</div>
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
    <nav className="sticky top-0 z-40 bg-[#06070d]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          onClick={onBack || (() => router.push('/library'))}
          className="text-sm font-semibold text-[#94a3b8] hover:text-white transition-colors flex items-center gap-2"
        >
          ← Каталог
        </button>
        <span className="font-display font-bold text-sm">Мой профиль</span>
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