'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BookOpen, Heart, CheckCircle, Clock, Target,
  Trophy, Library, X, Sparkles, BellOff
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts'

const TABS = [
  { key: 'reading', label: 'На руках', icon: BookOpen },
  { key: 'requests', label: 'Заявки', icon: Library },
  { key: 'finished', label: 'Прочитано', icon: CheckCircle },
  { key: 'favorites', label: 'Избранное', icon: Heart }
]

const COLORS = ['#1a56db', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6', '#ff2d55', '#5ac8fa']

export default function ProfilePage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [active, setActive] = useState([])
  const [requests, setRequests] = useState([])
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
      const [profile, fav, req] = await Promise.all([
        fetch('/api/profile', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/favorites', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/books/request', { headers: { Authorization: `Bearer ${t}` } })
      ])

      if (!profile.ok) throw new Error('Не удалось загрузить профиль')

      const p = await profile.json()
      setUserData(p.user)
      setActive(p.active || [])
      setFinished(p.finished || [])
      setStats(p.stats)
      setReadingGoal(p.reading_goal || 12)

      if (fav.ok) {
        const f = await fav.json()
        setFavorites(Array.isArray(f) ? f : (f.favorites || []))
      }
      if (req.ok) {
        setRequests(await req.json())
      }
    } catch (err) {
      console.error(err)
      toast.error('Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const cancelRequest = async (requestId) => {
    const t = localStorage.getItem('token')
    try {
      await fetch('/api/books/request', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      })
      setRequests(prev => prev.filter(r => r.id !== requestId))
      toast.success('Заявка отменена')
    } catch (err) {
      toast.error('Ошибка')
    }
  }

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
      <div className="min-h-screen bg-[var(--color-bg-card)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[#1a56db] rounded-full animate-spin" />
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
    <div className="min-h-screen bg-[var(--color-bg-card)] text-[var(--color-text-primary)]">
      <Navbar onBack={() => router.push('/library')} />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-8 pb-20">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] p-6 sm:p-8 mb-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
        >
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[var(--color-brand)] flex items-center justify-center font-semibold text-3xl sm:text-4xl text-white shrink-0">
              {userData.name?.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {userData.name}
                </h1>
                {userData.role === 'librarian' && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand)] text-[11px] font-medium">
                    БИБЛИОТЕКАРЬ
                  </span>
                )}
              </div>
              <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">
                {userData.email}
                {userData.class_name && <span className="text-[var(--color-text-tertiary)]"> · {userData.class_name}</span>}
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge icon={Trophy} label={`${finishedCount} прочитано`} color="#1a56db" />
                <Badge icon={Library} label={`${genresCount} жанров`} color="#34c759" />
                <Badge icon={BookOpen} label={`${active.length} сейчас`} color="#ff9500" />
                <Badge icon={Heart} label={`${favorites.length} в избранном`} color="#ff2d55" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] p-6 sm:p-7 mb-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-[17px] font-semibold flex items-center gap-2 text-[var(--color-text-primary)]">
                <Target size={16} className="text-[var(--color-brand)]" /> Цель на {new Date().getFullYear()}
              </h3>
              <p className="text-[13px] text-[var(--color-text-tertiary)] mt-0.5">Сколько книг хочешь прочитать</p>
            </div>
            <button
              onClick={() => { setGoalInput(readingGoal); setShowGoalModal(true) }}
              className="text-[13px] px-3 py-1.5 rounded-lg bg-[var(--color-bg-soft)] hover:bg-[var(--color-border)] transition-colors font-medium text-[var(--color-text-primary)]"
            >
              Изменить
            </button>
          </div>

          <div className="flex items-end justify-between mb-3">
            <div className="text-4xl font-semibold text-[var(--color-text-primary)] tracking-tight">
              {finishedCount}
              <span className="text-[var(--color-text-tertiary)] text-2xl"> / {readingGoal}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-[var(--color-brand)]">{progress}%</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)]">выполнено</div>
            </div>
          </div>

          <div className="h-2 bg-[var(--color-bg-soft)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              className="h-full bg-[var(--color-brand)] rounded-full"
            />
          </div>

          {progress >= 100 && (
            <div className="mt-4 p-3 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)] text-[13px] font-medium flex items-center gap-2">
              <Sparkles size={14} /> Цель достигнута!
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] p-6"
          >
            <h3 className="text-[16px] font-semibold mb-1 text-[var(--color-text-primary)]">Книги по месяцам</h3>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mb-5">Твой ритм чтения</p>
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
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] p-6"
          >
            <h3 className="text-[16px] font-semibold mb-1 text-[var(--color-text-primary)]">Жанры</h3>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mb-5">Что ты читал</p>
            {genreData.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-[var(--color-text-tertiary)] text-[13px]">
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
                      <div className="flex-1 font-medium truncate text-[var(--color-text-primary)]">{g.genre}</div>
                      <div className="text-[var(--color-text-tertiary)]">{g.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <div className="flex gap-1 mb-5 p-1 bg-[var(--color-bg-soft)] rounded-xl w-fit overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const count =
              tab.key === 'reading' ? active.length :
              tab.key === 'requests' ? requests.length :
              tab.key === 'finished' ? finished.length :
              favorites.length
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${activeTab === tab.key ? 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]' : 'text-[var(--color-text-tertiary)]'}`}>
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
              extra={(book) => book.due_date && (
                <div className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Clock size={10} /> до {new Date(book.due_date).toLocaleDateString('ru-RU')}
                </div>
              )}
            />
          )}

          {activeTab === 'requests' && (
            requests.length === 0 ? (
              <div className="text-center py-16 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
                <p className="text-[var(--color-text-tertiary)] text-[14px]">Нет активных заявок</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map(r => (
                  <div key={r.id} className="flex items-center gap-4 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl">
                    <div className="w-11 h-15 rounded-lg bg-[var(--color-bg-soft)] overflow-hidden shrink-0">
                      {r.book_cover && <img src={r.book_cover} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] truncate text-[var(--color-text-primary)]">{r.book_title}</div>
                      <div className="text-[12px] text-[var(--color-text-tertiary)]">
                        Статус:{' '}
                        <span className={
                          r.status === 'approved' ? 'text-[var(--color-success)] font-semibold' : 'text-[var(--color-warning)] font-semibold'
                        }>
                          {r.status === 'approved' ? 'Одобрено — можешь забрать' : 'Ждёт библиотекаря'}
                        </span>
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => cancelRequest(r.id)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-[12px] font-medium transition-colors flex items-center gap-1"
                      >
                        <BellOff size={12} /> Отменить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
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
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Цель на год</h3>
              <button onClick={() => setShowGoalModal(false)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
                <X size={18} />
              </button>
            </div>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">Сколько книг хочешь прочитать в {new Date().getFullYear()}?</p>
            <input
              type="number"
              min="1"
              max="365"
              value={goalInput}
              onChange={e => setGoalInput(parseInt(e.target.value) || 1)}
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-4 py-3 rounded-xl text-[28px] font-semibold text-center text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/30 focus:bg-[var(--color-bg-card)] transition-all"
            />
            <button
              onClick={updateGoal}
              className="w-full mt-5 py-3 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-[15px] font-medium transition-colors"
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
  <span className="px-3 py-1.5 rounded-full bg-[var(--color-bg-soft)] text-[12px] font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
    <Icon size={12} style={{ color }} /> {label}
  </span>
)

const BookGrid = ({ books, emptyText, extra, onRemove }) => {
  const router = useRouter()

  if (!books || books.length === 0) {
    return (
      <div className="text-center py-16 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
        <p className="text-[var(--color-text-tertiary)] text-[14px]">{emptyText}</p>
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
          className="group bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
        >
          <div
            className="relative aspect-[2/3] bg-[var(--color-bg-soft)] overflow-hidden"
            onClick={() => router.push(`/books/${book.book_id || book.id}`)}
          >
            {book.cover_url && (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover cursor-pointer" loading="lazy" />
            )}
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(book.book_id || book.id) }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-[var(--color-bg-card)]/90 backdrop-blur-sm text-[var(--color-text-primary)] hover:bg-[var(--color-danger)] hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="p-3">
            <div className="font-semibold text-[13px] line-clamp-1 text-[var(--color-text-primary)]">{book.title}</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] line-clamp-1 mb-1">{book.author}</div>
            {extra && extra(book)}
            {book.rating && (
              <div className="text-[11px] text-[var(--color-warning)] mt-1">
                {'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

const Navbar = ({ onBack }) => {
  const router = useRouter()
  return (
    <nav className="sticky top-0 z-40 bg-[var(--color-bg-card)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button
          onClick={onBack || (() => router.push('/library'))}
          className="text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] transition-colors flex items-center gap-1.5"
        >
          ← Каталог
        </button>
        <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">Профиль</span>
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