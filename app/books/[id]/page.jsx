'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, Heart, BookOpen, Download,
  Bell, BellOff, Loader2, Clock
} from 'lucide-react'

const Book = () => {
  const [book, setBook] = useState(null)
  const [requestLoading, setRequestLoading] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [myBorrow, setMyBorrow] = useState(null)
  const [myRequest, setMyRequest] = useState(null)
  const [favLoading, setFavLoading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    const fetchAll = async () => {
      const token = localStorage.getItem('token')

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setUserRole(payload.role)

          const profileRes = await fetch('/api/profile', {
            headers: { Authorization: `Bearer ${token}` }
          })
          const dataProfile = await profileRes.json()
          const activeBook = dataProfile.active?.find(b => Number(b.book_id) === Number(id))
          if (activeBook) {
            setMyBorrow(activeBook)
          } else {
            // Проверяем активные заявки
            const reqRes = await fetch('/api/books/request', {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (reqRes.ok) {
              const reqs = await reqRes.json()
              const mine = reqs.find(r => Number(r.book_id) === Number(id))
              if (mine) setMyRequest(mine)
            }
          }
        } catch (err) { console.error(err) }
      }

      try {
        const [bookRes, favRes] = await Promise.all([
          fetch(`/api/books/${id}`),
          token ? fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } }) : null
        ])

        setBook(await bookRes.json())

        if (favRes) {
          const favData = await favRes.json()
          const favs = Array.isArray(favData) ? favData : (favData.favorites || [])
          setIsFavorite(favs.some(f => Number(f.book_id) === Number(id) || Number(f.id) === Number(id)))
        }
      } catch (err) { console.error(err) }
    }

    fetchAll()
  }, [id])

  const handleRequest = async () => {
    const token = localStorage.getItem('token')
    if (!token) return toast.error('Войдите в аккаунт')

    setRequestLoading(true)
    try {
      const res = await fetch('/api/books/request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: id })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Заявка отправлена', {
          description: 'Библиотекарь увидит её и выдаст книгу'
        })
        setMyRequest({ ...data.request, book_title: book.title })
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setRequestLoading(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!myRequest) return
    const token = localStorage.getItem('token')
    try {
      await fetch('/api/books/request', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: myRequest.id })
      })
      setMyRequest(null)
      toast.success('Заявка отменена')
    } catch (err) {
      toast.error('Ошибка')
    }
  }

  const handleFavorite = async () => {
    const token = localStorage.getItem('token')
    if (!token) return toast.error('Войдите в аккаунт')

    setFavLoading(true)
    try {
      if (isFavorite) {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: id })
        })
        setIsFavorite(false)
        toast.success('Убрано из избранного')
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: id })
        })
        if (res.ok) {
          setIsFavorite(true)
          toast.success('Добавлено в избранное')
        } else {
          const data = await res.json()
          toast.error(data.error || 'Ошибка')
        }
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setFavLoading(false)
    }
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-card)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[#1a56db] rounded-full animate-spin" />
      </div>
    )
  }

  const isUnavailable = book.available_copies !== undefined && book.available_copies <= 0 && !myBorrow

  return (
    <div className="min-h-screen bg-[var(--color-bg-card)] text-[var(--color-text-primary)] pb-20">
      <div className="sticky top-0 z-30 bg-[var(--color-bg-card)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] transition-colors"
          >
            <ArrowLeft size={15} /> Назад
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row gap-8 lg:gap-12"
        >
          <div className="shrink-0 mx-auto lg:mx-0">
            <div className="relative w-64 aspect-[2/3] rounded-2xl overflow-hidden bg-[var(--color-bg-soft)] shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
              {book.cover_url ? (
                <Image src={book.cover_url} alt={book.title} fill className="object-cover" priority sizes="256px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={48} className="text-[var(--color-text-tertiary)]" />
                </div>
              )}
            </div>
            {book.genre && (
              <div className="mt-4 text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand)] text-[12px] font-medium">
                  {book.genre}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.05] mb-2 text-[var(--color-text-primary)]">
              {book.title}
            </h1>
            <p className="text-[19px] text-[var(--color-brand)] font-medium mb-6">{book.author}</p>

            {book.description && (
              <p className="text-[16px] text-[var(--color-text-secondary)] leading-[1.55] mb-8 max-w-3xl">
                {book.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2.5 mb-8">
              {myBorrow ? (
                <div className="w-full p-4 rounded-xl bg-[var(--color-brand)]/8 border border-[var(--color-brand)]/20">
                  <div className="flex items-center gap-2 text-[var(--color-brand)] font-medium mb-1">
                    <BookOpen size={15} /> У тебя на руках
                  </div>
                  <div className="text-[12px] text-[var(--color-text-secondary)]">
                    Ждём возврата в библиотеку
                  </div>
                </div>
              ) : myRequest ? (
                <div className="w-full p-4 rounded-xl bg-[var(--color-warning)]/8 border border-[var(--color-warning)]/30">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-[var(--color-warning)] font-medium mb-1">
                        <Bell size={15} /> Заявка отправлена
                      </div>
                      <div className="text-[12px] text-[var(--color-text-secondary)]">
                        Библиотекарь выдаст книгу, когда будет готова
                      </div>
                    </div>
                    <button
                      onClick={handleCancelRequest}
                      className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-card)] border border-[#4a6080]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-[12px] font-medium transition-colors flex items-center gap-1"
                    >
                      <BellOff size={12} /> Отменить
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRequest}
                  disabled={requestLoading || isUnavailable}
                  className="px-5 py-2.5 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-[15px] font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {requestLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : isUnavailable ? (
                    'Нет в наличии'
                  ) : (
                    <><Bell size={15} /> Хочу забрать</>
                  )}
                </button>
              )}

              <button
                onClick={handleFavorite}
                disabled={favLoading}
                className={`px-4 py-2.5 rounded-xl border text-[14px] font-medium flex items-center gap-2 transition-all ${
                  isFavorite
                    ? 'bg-[#ff2d55]/10 border-[#ff2d55]/30 text-[#ff2d55]'
                    : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-black/20'
                }`}
              >
                {favLoading ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />}
                {isFavorite ? 'В избранном' : 'В избранное'}
              </button>

              {book.file_url && (
                <a
                  href={book.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-black/20 text-[14px] font-medium flex items-center gap-2 transition-all"
                >
                  <Download size={14} /> PDF
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 border-t border-[var(--color-border)] pt-6">
              {[
                { label: 'Год', value: book.year || '—' },
                { label: 'Доступно', value: `${book.available_copies ?? '?'}/${book.total_copies ?? '?'}`, color: (book.available_copies ?? 0) > 0 ? '#34c759' : '#ff3b30' },
                { label: 'Жанр', value: book.genre || '—' },
                { label: 'Статус', value: myBorrow ? 'У тебя' : (isUnavailable ? 'Нет в наличии' : 'Доступна'), color: myBorrow ? '#1a56db' : (isUnavailable ? '#ff3b30' : '#34c759') }
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-1">{s.label}</div>
                  <div className="font-semibold text-[15px]" style={{ color: s.color || '#1d1d1f' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {myBorrow?.due_date && (
              <div className="mt-6 p-4 rounded-xl bg-[var(--color-brand)]/8 border border-[var(--color-brand)]/20 flex items-center gap-3">
                <Clock size={16} className="text-[var(--color-brand)]" />
                <div className="text-[14px] text-[var(--color-text-primary)]">
                  <span className="text-[var(--color-text-secondary)]">Вернуть до: </span>
                  <strong>{new Date(myBorrow.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</strong>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Book