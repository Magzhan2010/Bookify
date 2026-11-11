'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BookOpen, Heart, CheckCircle, Clock, Target,
  Trophy, Library, X, Sparkles, BellOff, PenLine, Star, Send, Award, Loader2,
  Settings, User, KeyRound, Save, Camera
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import { Button, Input, Card } from '../../../components/ui'
import CoinCard from '../../../components/game/CoinCard'
import { useGame } from '../../../components/game/GameContext'
import Link from 'next/link'
import AvatarPicker from '../../../components/AvatarPicker'
import Achievements from '../../../components/game/Achievements'
import { LangSwitch } from '../../../lib/i18n'
import { REVIEW_CRITERIA, REVIEW_MIN_WORDS, REVIEW_MAX_WORDS, countWords } from '../../../lib/reviewRules'
import { TROPHY_NOTE } from '../../../lib/trophy'

const TABS = [
  { key: 'reading', label: 'На руках', icon: BookOpen },
  { key: 'requests', label: 'Заявки', icon: Library },
  { key: 'to_review', label: 'Ждут отзыва', icon: PenLine },
  { key: 'shelf', label: 'Моя полка', icon: Trophy },
  { key: 'favorites', label: 'Избранное', icon: Heart },
  { key: 'settings', label: 'Настройки', icon: Settings }
]

const COLORS = ['#1a56db', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6', '#ff2d55', '#5ac8fa']

export default function ProfilePage() {
  const router = useRouter()
  const [userData, setUserData] = useState(null)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const game = useGame()
  const [active, setActive] = useState([])
  const [requests, setRequests] = useState([])
  const [toReview, setToReview] = useState([])
  const [shelf, setShelf] = useState([])
  const [favorites, setFavorites] = useState([])
  const [stats, setStats] = useState(null)
  const [readingGoal, setReadingGoal] = useState(12)
  const [activeTab, setActiveTab] = useState('reading')
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalInput, setGoalInput] = useState(12)

  // Баллы
  const [points, setPoints] = useState({ total: 0, available: 0, spent: 0 })
  const [pointsHistory, setPointsHistory] = useState([])
  const [pointRules, setPointRules] = useState([])

  // Модалка отзыва
  const [reviewModal, setReviewModal] = useState(null) // { borrow_id, title, cover_url }
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewLoading, setReviewLoading] = useState(false)

  const fetchAll = async () => {
    const t = localStorage.getItem('token')
    if (!t) return router.push('/login')

    try {
      const [profile, fav, req, pts] = await Promise.all([
        fetch('/api/profile', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/favorites', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/books/request', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/profile/points', { headers: { Authorization: `Bearer ${t}` } })
      ])

      if (!profile.ok) throw new Error('Не удалось загрузить профиль')

      const p = await profile.json()
      setUserData(p.user)
      setActive(p.active || [])
      setShelf(p.shelf || [])
      setToReview(p.submitted || [])
      setStats(p.stats)
      setReadingGoal(p.reading_goal || 12)

      if (fav.ok) {
        const f = await fav.json()
        setFavorites(Array.isArray(f) ? f : (f.favorites || []))
      }
      if (req.ok) {
        setRequests(await req.json())
      }
      if (pts.ok) {
        const pd = await pts.json()
        setPoints(pd.balance || { earned: 0, available: 0, spent: 0 })
        setPointsHistory(pd.history || [])
        setPointRules(pd.rules || [])
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

  // === Отзыв о прочитанной книге ===
  const openReviewModal = (book) => {
    setReviewModal(book)
    // Отклонённый отзыв открываем с прежним текстом — ученик его дорабатывает
    setReviewText(book.review_status === 'rejected' ? (book.review_content || '') : '')
    setReviewRating(book.rating || 5)
  }

  const submitReview = async () => {
    if (!reviewModal) return
    const words = countWords(reviewText)
    if (words < REVIEW_MIN_WORDS || words > REVIEW_MAX_WORDS) {
      return toast.error(`Нужно от ${REVIEW_MIN_WORDS} до ${REVIEW_MAX_WORDS} слов, сейчас ${words}`)
    }

    setReviewLoading(true)
    try {
      const t = localStorage.getItem('token')
      const res = await fetch('/api/books/review', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowId: reviewModal.borrow_id,
          rating: reviewRating,
          content: reviewText
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Отзыв отправлен!', { description: '+5 баллов после одобрения библиотекаря' })
        setReviewModal(null)
        fetchAll()
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setReviewLoading(false)
    }
  }

  // Сданная книга без отзыва → просто на полку (без монет)
  const shelfWithoutReview = async (b) => {
    try {
      const res = await fetch('/api/profile/shelf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowId: b.borrow_id })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success(`«${b.title}» на полке`, { description: 'Без отзыва и без монет' })
      fetchAll()
    } catch (e) { toast.error(e.message) }
  }
  const removeFromShelf = async (b) => {
    try {
      const res = await fetch(`/api/profile/shelf?bookId=${b.book_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      if (!res.ok) throw new Error((await res.json()).error || 'Ошибка')
      toast.success('Убрали с полки')
      fetchAll()
    } catch (e) { toast.error(e.message) }
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
        <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[var(--color-brand)] rounded-full animate-spin" />
      </div>
    )
  }

  // Раньше здесь был `return null` — при истёкшем токене пользователь
  // видел просто белую страницу без единого элемента управления
  if (!userData) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-soft)] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--color-bg-card)] flex items-center justify-center mb-4">
          <User size={24} className="text-[var(--color-text-tertiary)]" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
          Нужно войти в аккаунт
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-6 max-w-sm">
          Профиль доступен только авторизованным пользователям.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/')}>
            На главную
          </Button>
          <Button onClick={() => router.push('/login')}>Войти</Button>
        </div>
      </div>
    )
  }

  if (!userData) return null

  const finishedCount = parseInt(stats?.books_finished || 0)
  const genresCount = parseInt(stats?.genres_count || 0)
  const progress = readingGoal ? Math.min(100, Math.round((finishedCount / readingGoal) * 100)) : 0

  const monthlyData = buildMonthlyData(shelf)
  const genreData = buildGenreData(shelf)

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
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              aria-label="Сменить аватарку"
              className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--color-brand)] flex items-center justify-center font-semibold text-3xl sm:text-4xl text-white shrink-0 overflow-visible apple-press"
            >
              <span className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center">
                {userData.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={userData.avatar_url} alt="" className="w-full h-full object-cover" />
                  : userData.name?.charAt(0).toUpperCase()}
                <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={22} />
                </span>
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] flex items-center justify-center shadow-sm">
                <Camera size={15} />
              </span>
            </button>
            <AvatarPicker
              open={avatarOpen}
              onClose={() => setAvatarOpen(false)}
              current={userData.avatar_url}
              name={userData.name}
              onSaved={url => { setUserData(u => ({ ...u, avatar_url: url })); game.refresh?.() }}
            />

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
                <Badge icon={Trophy} label={`${shelf.length} прочитано`} color="#1a56db" />
                <Badge icon={Library} label={`${genresCount} жанров`} color="#34c759" />
                <Badge icon={BookOpen} label={`${active.length} сейчас`} color="#ff9500" />
                <Badge icon={Heart} label={`${favorites.length} в избранном`} color="#ff2d55" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* === БАЛЛЫ И КАРТОЧКИ === */}
        {(userData.role === 'student' || userData.role === 'teacher') && (
          <PointsPanel points={points} history={pointsHistory} />
        )}
        {(userData.role === 'student' || userData.role === 'teacher') && <Achievements />}

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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#1a56db' }}
                    contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12, color: 'var(--color-text-primary)' }} labelStyle={{ color: 'var(--color-text-primary)' }} itemStyle={{ color: 'var(--color-text-secondary)' }}
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
                      <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12, color: 'var(--color-text-primary)' }} labelStyle={{ color: 'var(--color-text-primary)' }} itemStyle={{ color: 'var(--color-text-secondary)' }} />
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
              tab.key === 'to_review' ? toReview.filter(b => b.review_status !== 'pending').length :
              tab.key === 'shelf' ? shelf.length :
              tab.key === 'favorites' ? favorites.length :
              null
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
                {count !== null && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${activeTab === tab.key ? 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]' : 'text-[var(--color-text-tertiary)]'}`}>
                    {count}
                  </span>
                )}
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

          {/* === ЖДУТ ОТЗЫВА === */}
          {activeTab === 'to_review' && (
            toReview.length === 0 ? (
              <div className="text-center py-16 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
                <PenLine size={28} className="text-[var(--color-text-tertiary)] mx-auto mb-3" />
                <p className="text-[var(--color-text-primary)] font-medium mb-1">Нет книг для отзыва</p>
                <p className="text-[13px] text-[var(--color-text-tertiary)]">
                  Верни книгу из библиотеки — и напиши отзыв, получи +5 баллов
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {toReview.map(b => (
                  <div key={b.borrow_id} className="flex items-center gap-4 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl">
                    <div className="w-14 shrink-0">
                      <div className="relative aspect-[2/3] rounded-lg bg-[var(--color-bg-soft)] overflow-hidden">
                        {b.cover_url && <img src={b.cover_url} className="w-full h-full object-cover" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] truncate text-[var(--color-text-primary)]">{b.title}</div>
                      <div className="text-[12px] text-[var(--color-text-tertiary)] truncate mb-1.5">{b.author}</div>
                      {b.review_status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-warning)]/15 text-[var(--color-warning)] text-[11px] font-medium">
                          <Clock size={10} /> Отзыв отправлен, ждём проверки
                        </span>
                      ) : b.review_status === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)] text-[11px] font-medium">
                          <CheckCircle size={10} /> Отзыв одобрен (+5 баллов)
                        </span>
                      ) : b.review_status === 'rejected' ? (
                        <div className="space-y-2">
                          <div className="px-3 py-2 rounded-lg bg-[var(--color-danger)]/10 text-[12px] text-[var(--color-danger)]">
                            <span className="font-semibold">Нужно доработать</span>
                            {b.review_note ? `: ${b.review_note}` : ''}
                          </div>
                          <button
                            onClick={() => openReviewModal(b)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-brand)] text-white text-[12px] font-medium hover:bg-[var(--color-brand-hover)] transition-colors flex items-center gap-1.5"
                          >
                            <PenLine size={12} /> Переписать отзыв
                          </button>
                          <button onClick={() => shelfWithoutReview(b)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] text-[12px] font-medium hover:text-[var(--color-text-primary)] transition-colors">
                            Без отзыва — на полку
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openReviewModal(b)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-brand)] text-white text-[12px] font-medium hover:bg-[var(--color-brand-hover)] transition-colors flex items-center gap-1.5"
                          >
                            <PenLine size={12} /> Написать отзыв (+5 баллов)
                          </button>
                          <button onClick={() => shelfWithoutReview(b)} title="Не хочу писать отзыв — просто поставить книгу на полку, без монет"
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] text-[12px] font-medium hover:text-[var(--color-text-primary)] transition-colors">
                            Без отзыва — на полку
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* === МОЯ ПОЛКА === */}
          {activeTab === 'shelf' && (
            shelf.length === 0 ? (
              <div className="text-center py-16 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
                <Trophy size={32} className="text-[var(--color-text-tertiary)] mx-auto mb-3" />
                <p className="text-[var(--color-text-primary)] font-medium mb-1">Полка пока пуста</p>
                <p className="text-[13px] text-[var(--color-text-tertiary)]">
                  Прочитай книгу и напиши отзыв — или нажми «На мою полку» на странице книги
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    Ты прочитал <strong className="text-[var(--color-text-primary)]">{shelf.length}</strong> книг
                  </p>
                  <div className="flex gap-1.5">
                    <Badge icon={Star} label={`${genresCount} жанров`} color="#34c759" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {shelf.map((b, i) => (
                    <motion.div
                      key={b.borrow_id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="group bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:border-[var(--color-brand)]/40 hover:shadow-[var(--shadow-soft)] transition-all"
                    >
                      <div
                        className="relative aspect-[2/3] bg-[var(--color-bg-soft)] cursor-pointer overflow-hidden"
                        onClick={() => router.push(`/books/${b.book_id}`)}
                      >
                        {b.cover_url && (
                          <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        )}
                        {b.notes === TROPHY_NOTE && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-white">
                            без отзыва
                          </div>
                        )}
                        {b.rating && (
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-bold text-[#ffd66b]">
                            {b.rating} ★
                          </div>
                        )}
                        {b.genre && (
                          <div className="absolute bottom-2 left-2 right-2">
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-medium text-white uppercase tracking-wider">
                              {b.genre.split(' / ')[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="font-semibold text-[13px] line-clamp-2 text-[var(--color-text-primary)] mb-0.5">
                          {b.title}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{b.author}</div>
                        {b.notes === TROPHY_NOTE && (
                          <button onClick={() => removeFromShelf(b)} className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] transition-colors">
                            Убрать с полки
                          </button>
                        )}
                        {b.review_content && (
                          <div className="mt-2 pt-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)] italic line-clamp-3 leading-relaxed">
                            «{b.review_content}»
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )
          )}

          {activeTab === 'favorites' && (
            <BookGrid
              books={favorites}
              emptyText="Нет избранных книг"
              onRemove={removeFavorite}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel user={userData} onUpdated={setUserData} />
          )}
        </motion.div>
      </main>

      {/* === МОДАЛКА ОТЗЫВА === */}
      {reviewModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setReviewModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] w-full max-w-lg p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.2)] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="w-14 shrink-0">
                <div className="relative aspect-[2/3] rounded-lg bg-[var(--color-bg-soft)] overflow-hidden">
                  {reviewModal.cover_url && (
                    <img src={reviewModal.cover_url} className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-brand)] font-medium mb-1">
                  Отзыв о книге
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)] leading-tight mb-1 line-clamp-2">
                  {reviewModal.title}
                </h3>
                {reviewModal.author && (
                  <div className="text-[12px] text-[var(--color-text-tertiary)]">{reviewModal.author}</div>
                )}
              </div>
              <button
                onClick={() => setReviewModal(null)}
                className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Рейтинг */}
            <div className="mb-4">
              <label className="block text-[12px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-2">
                Оценка
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setReviewRating(s)}
                    className={`text-3xl transition-transform hover:scale-110 ${
                      s <= reviewRating ? 'text-[#ff9500]' : 'text-[var(--color-border)]'
                    }`}
                  >
                    {s <= reviewRating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Требования к отзыву */}
            <div className="mb-4 p-3.5 rounded-xl bg-[var(--color-brand-soft)]">
              <div className="text-[12px] font-semibold text-[var(--color-brand)] mb-2">Требования к отзыву · Пікір талаптары</div>
              <ol className="space-y-1">
                {REVIEW_CRITERIA.map((c, i) => (
                  <li key={c.code} className="flex gap-2 text-[12px] leading-snug text-[var(--color-text-secondary)]">
                    <span className="font-bold text-[var(--color-brand)] tabular-nums">0{i + 1}</span>
                    <span>{c.ru} <span className="text-[var(--color-text-tertiary)]">· {c.kk}</span></span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Текст отзыва */}
            <div className="mb-4">
              <label className="block text-[12px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-2">
                Расскажи своими словами
              </label>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                rows={9}
                maxLength={4000}
                autoFocus
                placeholder="О чём книга? Какая в ней главная мысль? Приведи примеры из книги. Что ты понял и чем она тебе полезна?"
                className="w-full bg-[var(--color-bg-soft)] border border-transparent rounded-xl p-3.5 text-[14px] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-brand)]/40 focus:bg-[var(--color-bg-card)] transition-all resize-y leading-relaxed"
              />
              {(() => {
                const w = countWords(reviewText)
                const ok = w >= REVIEW_MIN_WORDS && w <= REVIEW_MAX_WORDS
                return (
                  <div className="mt-1.5">
                    <div className="h-1.5 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${w > REVIEW_MAX_WORDS ? 'bg-[var(--color-danger)]' : ok ? 'bg-[var(--color-success)]' : 'bg-[var(--color-brand)]'}`}
                        style={{ width: `${Math.min(100, (w / REVIEW_MAX_WORDS) * 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[11px] ${ok ? 'text-[var(--color-success)]' : w > REVIEW_MAX_WORDS ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-tertiary)]'}`}>
                        {ok ? '✓ Объём подходит' : w > REVIEW_MAX_WORDS ? `Слишком длинно — убери ${w - REVIEW_MAX_WORDS} сл.` : `Ещё ${REVIEW_MIN_WORDS - w} сл. до минимума`}
                      </span>
                      <span className="text-[11px] tabular-nums text-[var(--color-text-tertiary)]">{w} / {REVIEW_MIN_WORDS}–{REVIEW_MAX_WORDS} слов</span>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Предупреждение про ИИ */}
            <div className="mb-5 p-3 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 flex items-start gap-2.5">
              <Sparkles size={15} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
              <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                Пиши своими словами. Если списать с ИИ — баллы не засчитаются.
              </p>
            </div>

            <button
              onClick={submitReview}
              disabled={reviewLoading || countWords(reviewText) < REVIEW_MIN_WORDS || countWords(reviewText) > REVIEW_MAX_WORDS}
              className="w-full py-3 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
            >
              {reviewLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Send size={16} /> Отправить отзыв
                  <span className="opacity-70 font-normal">+5 баллов</span>
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}

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

/**
 * Панель настроек: свои данные и смена пароля.
 * Раньше эндпоинта для этого не было вообще — ученик не мог поменять
 * себе ни имя, ни телефон, ни пароль.
 */
const SettingsPanel = ({ user, onUpdated }) => {
  const [name, setName] = useState(user?.name || '')
  const [className, setClassName] = useState(user?.class_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const [passError, setPassError] = useState('')

  useEffect(() => {
    setName(user?.name || '')
    setClassName(user?.class_name || '')
    setPhone(user?.phone || '')
  }, [user])

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    if (!name.trim()) {
      setProfileError('Имя не может быть пустым')
      return
    }
    setSavingProfile(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, className, phone })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      onUpdated?.({ ...user, ...data.user })
      toast.success('Профиль обновлён')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPassError('')

    if (newPassword.length < 6) {
      setPassError('Новый пароль должен быть не короче 6 символов')
      return
    }
    if (newPassword !== repeatPassword) {
      setPassError('Новые пароли не совпадают')
      return
    }

    setSavingPass(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPassword, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')

      // Сервер вернул новый токен — сохраняем, иначе придётся снова логиниться
      if (data.token) localStorage.setItem('token', data.token)

      setOldPassword('')
      setNewPassword('')
      setRepeatPassword('')
      toast.success('Пароль изменён')
    } catch (err) {
      setPassError(err.message)
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <Card padding="lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Язык · Тіл</h3>
            <p className="text-[13px] text-[var(--color-text-tertiary)]">Русский или қазақша</p>
          </div>
          <LangSwitch />
        </div>
      </Card>
      {/* Личные данные */}
      <Card padding="lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] flex items-center justify-center">
            <User size={18} className="text-[var(--color-brand)]" />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              Личные данные
            </h3>
            <p className="text-[12px] text-[var(--color-text-tertiary)]">
              Имя и класс видит библиотекарь
            </p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <Input
            label="Имя"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Как тебя зовут"
          />

          <Input
            label="Класс"
            value={className}
            onChange={e => setClassName(e.target.value)}
            placeholder="Например, 10-А"
            hint={user?.role === 'librarian' ? 'Библиотекарям класс не нужен' : undefined}
          />

          <Input
            label="Телефон"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+7 (___) ___-__-__"
            hint="Чтобы библиотекарь мог быстро связаться по поводу долга"
          />

          <Input
            label="Email"
            value={user?.email || ''}
            disabled
            hint="Email — это логин, его нельзя изменить"
          />

          {profileError && (
            <p className="text-[12px] text-[var(--color-danger)]">{profileError}</p>
          )}

          <Button type="submit" loading={savingProfile} icon={Save} fullWidth>
            Сохранить
          </Button>
        </form>
      </Card>

      {/* Пароль — ученикам менять нельзя: пароли выдаёт библиотекарь */}
      {user?.role !== 'student' && (
      <Card padding="lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] flex items-center justify-center">
            <KeyRound size={18} className="text-[var(--color-text-secondary)]" />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              Смена пароля
            </h3>
            <p className="text-[12px] text-[var(--color-text-tertiary)]">
              Нужен текущий пароль для подтверждения
            </p>
          </div>
        </div>

        <form onSubmit={changePassword} className="space-y-4">
          <Input
            label="Текущий пароль"
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••"
          />

          <Input
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            hint="Минимум 6 символов"
          />

          <Input
            label="Повтори новый пароль"
            type="password"
            value={repeatPassword}
            onChange={e => setRepeatPassword(e.target.value)}
            required
            autoComplete="new-password"
            error={
              repeatPassword && repeatPassword !== newPassword
                ? 'Пароли не совпадают'
                : ''
            }
          />

          {passError && (
            <p className="text-[12px] text-[var(--color-danger)]">{passError}</p>
          )}

          <Button
            type="submit"
            variant="secondary"
            loading={savingPass}
            icon={KeyRound}
            fullWidth
            disabled={!oldPassword || !newPassword || !repeatPassword}
          >
            Изменить пароль
          </Button>
        </form>
      </Card>
      )}
      {user?.role === 'student' && (
        <p className="text-[13px] text-[var(--color-text-tertiary)] text-center">
          Забыл пароль? Обратись к библиотекарю.
        </p>
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

/**
 * Баллы ученика: баланс, уровень, место и все полученные карточки-монеты.
 */
const PointsPanel = ({ points, history }) => {
  const { summary } = useGame()
  const level = summary?.level
  const ranks = summary?.ranks
  const [showAll, setShowAll] = useState(false)
  const cards = showAll ? history : history.slice(0, 8)

  return (
    <motion.div
      id="points"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-[24px] mb-6 overflow-hidden border border-[var(--color-border)] scroll-mt-20"
    >
      <div className="bg-gradient-to-br from-[#1f2a5c] via-[#22348a] to-[#2f5bea] p-6 sm:p-7 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] opacity-75 font-semibold mb-1.5">Мои монеты</div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight text-[#ffc93c]">{points.available || 0}</span>
              <span className="text-lg opacity-75 font-medium">можно потратить</span>
            </div>
            {level && (
              <div className="mt-3 max-w-xs">
                <div className="flex justify-between text-[12px]">
                  <span className="font-semibold">{level.emoji} {level.title}</span>
                  {level.next && <span className="opacity-70">ещё {level.toNext} до «{level.next.title}»</span>}
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full rounded-full bg-[#ffc93c]" style={{ width: `${level.progress}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <PointsStat label="Заработано" value={points.earned ?? points.total ?? 0} />
            <PointsStat label="Потрачено" value={points.spent || 0} />
            <PointsStat label="Место" value={ranks?.school_rank ? `#${ranks.school_rank}` : '—'} highlight />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/shop" className="px-4 py-2 rounded-xl bg-[#ffc93c] text-[#1f2a5c] text-[13px] font-bold hover:brightness-105">
            В магазин призов
          </Link>
          <Link href="/leaderboard" className="px-4 py-2 rounded-xl bg-white/12 text-white text-[13px] font-semibold hover:bg-white/20">
            Таблица лидеров
          </Link>
          <Link href="/game" className="px-4 py-2 rounded-xl bg-white/12 text-white text-[13px] font-semibold hover:bg-white/20">
            Как заработать
          </Link>
        </div>
      </div>

      <div className="p-5 sm:p-6 bg-[var(--color-bg-card)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-[var(--color-text-primary)]">Мои карточки</h3>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">{history.length} шт.</span>
        </div>
        {history.length === 0 ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-[var(--color-bg-soft)]">
            <CoinCard value={5} size="sm" className="opacity-60" />
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Здесь будут твои карточки-монеты. Прочитай книгу, сдай её и напиши отзыв —
              после проверки библиотекарем получишь первые монеты.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {cards.map(h => (
                <div key={h.id} className="rounded-2xl p-2.5 bg-[var(--color-bg-soft)]">
                  <CoinCard value={h.points} fluid />
                  <div className="mt-2 px-1">
                    <div className="text-[12px] font-semibold text-[var(--color-text-primary)] line-clamp-1">
                      {h.description || h.reason}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-tertiary)] line-clamp-1">
                      {h.book_title ? `«${h.book_title}» · ` : ''}
                      {new Date(h.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {history.length > 8 && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="mt-4 text-[13px] font-semibold text-[var(--color-brand)]"
              >
                {showAll ? 'Свернуть' : `Показать все (${history.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

const PointsStat = ({ label, value, highlight }) => (
  <div className={`text-center px-3 py-2.5 rounded-xl ${highlight ? 'bg-white/20' : 'bg-white/10'}`}>
    <div className="text-xl font-bold">{value || 0}</div>
    <div className="text-[10px] uppercase tracking-wider opacity-75 font-medium mt-0.5">{label}</div>
  </div>
)
