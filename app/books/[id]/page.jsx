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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
      </div>
    )
  }

  const isUnavailable = book.available_copies !== undefined && book.available_copies <= 0 && !myBorrow

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] pb-20">
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[14px] font-medium text-[#6e6e73] hover:text-[#1a56db] transition-colors"
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
            <div className="relative w-64 aspect-[2/3] rounded-2xl overflow-hidden bg-[#f5f5f7] shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
              {book.cover_url ? (
                <Image src={book.cover_url} alt={book.title} fill className="object-cover" priority sizes="256px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={48} className="text-[#86868b]" />
                </div>
              )}
            </div>
            {book.genre && (
              <div className="mt-4 text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-[#1a56db]/10 text-[#1a56db] text-[12px] font-medium">
                  {book.genre}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.05] mb-2 text-[#1d1d1f]">
              {book.title}
            </h1>
            <p className="text-[19px] text-[#1a56db] font-medium mb-6">{book.author}</p>

            {book.description && (
              <p className="text-[16px] text-[#6e6e73] leading-[1.55] mb-8 max-w-3xl">
                {book.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2.5 mb-8">
              {myBorrow ? (
                <div className="w-full p-4 rounded-xl bg-[#1a56db]/8 border border-[#1a56db]/20">
                  <div className="flex items-center gap-2 text-[#1a56db] font-medium mb-1">
                    <BookOpen size={15} /> У тебя на руках
                  </div>
                  <div className="text-[12px] text-[#6e6e73]">
                    Ждём возврата в библиотеку
                  </div>
                </div>
              ) : myRequest ? (
                <div className="w-full p-4 rounded-xl bg-[#ff9500]/8 border border-[#ff9500]/20">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-[#ff9500] font-medium mb-1">
                        <Bell size={15} /> Заявка отправлена
                      </div>
                      <div className="text-[12px] text-[#6e6e73]">
                        Библиотекарь выдаст книгу, когда будет готова
                      </div>
                    </div>
                    <button
                      onClick={handleCancelRequest}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#4a6080]/20 text-[#6e6e73] hover:text-[#1d1d1f] text-[12px] font-medium transition-colors flex items-center gap-1"
                    >
                      <BellOff size={12} /> Отменить
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRequest}
                  disabled={requestLoading || isUnavailable}
                  className="px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[15px] font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
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
                    : 'bg-white border-black/10 text-[#6e6e73] hover:text-[#1d1d1f] hover:border-black/20'
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
                  className="px-4 py-2.5 rounded-xl bg-white border border-black/10 text-[#6e6e73] hover:text-[#1d1d1f] hover:border-black/20 text-[14px] font-medium flex items-center gap-2 transition-all"
                >
                  <Download size={14} /> PDF
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 border-t border-black/8 pt-6">
              {[
                { label: 'Год', value: book.year || '—' },
                { label: 'Доступно', value: `${book.available_copies ?? '?'}/${book.total_copies ?? '?'}`, color: (book.available_copies ?? 0) > 0 ? '#34c759' : '#ff3b30' },
                { label: 'Жанр', value: book.genre || '—' },
                { label: 'Статус', value: myBorrow ? 'У тебя' : (isUnavailable ? 'Нет в наличии' : 'Доступна'), color: myBorrow ? '#1a56db' : (isUnavailable ? '#ff3b30' : '#34c759') }
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-medium mb-1">{s.label}</div>
                  <div className="font-semibold text-[15px]" style={{ color: s.color || '#1d1d1f' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {myBorrow?.due_date && (
              <div className="mt-6 p-4 rounded-xl bg-[#1a56db]/8 border border-[#1a56db]/20 flex items-center gap-3">
                <Clock size={16} className="text-[#1a56db]" />
                <div className="text-[14px] text-[#1d1d1f]">
                  <span className="text-[#6e6e73]">Вернуть до: </span>
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