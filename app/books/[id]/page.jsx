'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, Heart, BookOpen, Download,
  Bell, BellOff, Loader2, Clock, Star, Sparkles, User
} from 'lucide-react'

const Book = () => {
  const [book, setBook] = useState(null)
  const [requestLoading, setRequestLoading] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [myBorrow, setMyBorrow] = useState(null)
  const [myRequest, setMyRequest] = useState(null)
  const [favLoading, setFavLoading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [related, setRelated] = useState([])
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

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
            try {
              const reqRes = await fetch('/api/books/request', {
                headers: { Authorization: `Bearer ${token}` }
              })
              if (reqRes.ok) {
                const reqs = await reqRes.json()
                const mine = reqs.find(r => Number(r.book_id) === Number(id))
                if (mine) setMyRequest(mine)
              }
            } catch (e) {}
          }
        } catch (err) { console.error(err) }
      }

      try {
        const [bookRes, favRes] = await Promise.all([
          fetch(`/api/books/${id}`),
          token ? fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } }) : null
        ])

        const bookData = await bookRes.json()
        setBook(bookData)

        if (favRes) {
          try {
            const favData = await favRes.json()
            const favs = Array.isArray(favData) ? favData : (favData.favorites || [])
            setIsFavorite(favs.some(f => Number(f.book_id) === Number(id) || Number(f.id) === Number(id)))
          } catch (e) {}
        }

        // Похожие книги (тот же первый сегмент genre)
        if (bookData.genre) {
          const rootGenre = bookData.genre.split('/')[0].trim()
          try {
            const r = await fetch(`/api/genres/sub/${encodeURIComponent(rootGenre)}/books?limit=6`)
            if (r.ok) {
              const d = await r.json()
              setRelated((d.books || []).filter(b => Number(b.id) !== Number(id)).slice(0, 4))
            }
          } catch (e) {}
        }
      } catch (err) { console.error(err) }
    }

    fetchAll()
  }, [id])

  const handleRequest = async () => {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/login')

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
    if (!token) return router.push('/login')

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
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[var(--color-brand)] rounded-full animate-spin" />
      </div>
    )
  }

  const isUnavailable = book.available_copies !== undefined && book.available_copies <= 0 && !myBorrow
  const statusInfo = myBorrow
    ? { color: 'var(--color-brand)', bg: 'var(--color-brand-soft)', label: 'У тебя на руках', icon: BookOpen, msg: 'Ждём возврата в библиотеку' }
    : myRequest?.status === 'approved'
      ? { color: 'var(--color-success)', bg: 'var(--color-success)]/10', label: 'Заявка одобрена', icon: Sparkles, msg: 'Можешь забрать в библиотеке' }
      : myRequest
        ? { color: 'var(--color-warning)', bg: 'var(--color-warning)]/10', label: 'Заявка отправлена', icon: Bell, msg: 'Библиотекарь выдаст книгу, когда будет готова' }
        : null

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] pb-20">
      <div className="sticky top-0 z-30 bg-[var(--color-bg-overlay)] backdrop-blur-xl border-b border-[var(--color-border)]">
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
          {/* Cover */}
          <div className="shrink-0 mx-auto lg:mx-0">
            <div className="relative w-64 aspect-[2/3] rounded-2xl overflow-hidden bg-[var(--color-bg-soft)] shadow-[var(--shadow-elevated)] ring-1 ring-[var(--color-border)]">
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
                <span className="inline-block px-3 py-1 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-[12px] font-medium">
                  {book.genre}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.05] mb-3 text-[var(--color-text-primary)]">
              {book.title}
            </h1>
            <p className="text-[19px] text-[var(--color-brand)] font-medium mb-6">{book.author}</p>

            {/* Description — main text */}
            {book.description && (
              <div className="mb-8">
                <h2 className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mb-3">Описание</h2>
                <p className="text-[16px] text-[var(--color-text-primary)] leading-[1.65] max-w-3xl">
                  {book.description}
                </p>
              </div>
            )}

            {/* Status banner */}
            {statusInfo && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 flex items-center justify-between"
                style={{ background: statusInfo.bg, borderRadius: 16 }}
              >
                <div>
                  <div className="flex items-center gap-2 font-semibold mb-0.5" style={{ color: statusInfo.color }}>
                    <statusInfo.icon size={16} />
                    {statusInfo.label}
                  </div>
                  <div className="text-[13px] text-[var(--color-text-secondary)]">{statusInfo.msg}</div>
                </div>
                {myRequest?.status === 'pending' && (
                  <button
                    onClick={handleCancelRequest}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-[12px] font-medium transition-colors flex items-center gap-1"
                  >
                    <BellOff size={12} /> Отменить
                  </button>
                )}
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 mb-8">
              {myBorrow ? (
                <div className="w-full p-3 rounded-xl bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/30">
                  <div className="flex items-center gap-2 text-[var(--color-brand)] font-medium mb-1">
                    <BookOpen size={15} /> Книга у тебя
                  </div>
                  <div className="text-[12px] text-[var(--color-text-secondary)]">
                    Ждём возврата в библиотеку
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRequest}
                  disabled={requestLoading || isUnavailable}
                  className="px-5 py-2.5 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[15px] font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
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
                    : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]'
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
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] text-[14px] font-medium flex items-center gap-2 transition-all"
                >
                  <Download size={14} /> Скачать PDF
                </a>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[var(--color-border)] pt-6">
              {[
                { label: 'Год', value: book.year || '—' },
                { label: 'Доступно', value: `${book.available_copies ?? '?'}/${book.total_copies ?? '?'}`, color: (book.available_copies ?? 0) > 0 ? 'var(--color-success)' : 'var(--color-danger)' },
                { label: 'Жанр', value: book.genre || '—' },
                { label: 'Статус', value: myBorrow ? 'У тебя' : (isUnavailable ? 'Нет в наличии' : 'Доступна'), color: myBorrow ? 'var(--color-brand)' : (isUnavailable ? 'var(--color-danger)' : 'var(--color-success)') }
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-1">{s.label}</div>
                  <div className="font-semibold text-[15px]" style={{ color: s.color || 'var(--color-text-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Tags */}
            {book.tags && (
              <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mb-2">Теги</h3>
                <div className="flex flex-wrap gap-2">
                  {book.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg bg-[var(--color-bg-soft)] border border-[var(--color-border)] text-[12px] text-[var(--color-text-secondary)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Due date warning */}
            {myBorrow?.due_date && (
              <div className="mt-6 p-4 rounded-xl bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/20 flex items-center gap-3">
                <Clock size={16} className="text-[var(--color-brand)]" />
                <div className="text-[14px] text-[var(--color-text-primary)]">
                  <span className="text-[var(--color-text-secondary)]">Вернуть до: </span>
                  <strong>{new Date(myBorrow.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</strong>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Похожие книги */}
        {related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-16 pt-10 border-t border-[var(--color-border)]"
          >
            <h2 className="text-2xl font-semibold tracking-[-0.02em] mb-6 text-[var(--color-text-primary)]">
              Похожие книги
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {related.map((b, i) => (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => router.push(`/books/${b.id}`)}
                  className="text-left group"
                >
                  <div className="relative aspect-[2/3] bg-[var(--color-bg-soft)] rounded-xl overflow-hidden mb-2 ring-1 ring-[var(--color-border)] group-hover:ring-[var(--color-brand)]/50 transition-all">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={24} className="text-[var(--color-text-tertiary)]" />
                      </div>
                    )}
                  </div>
                  <div className="font-semibold text-[13px] line-clamp-2 text-[var(--color-text-primary)] group-hover:text-[var(--color-brand)] transition-colors">
                    {b.title}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{b.author}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Book