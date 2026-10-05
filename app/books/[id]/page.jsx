'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, Heart, BookOpen, Download, MessageSquare,
  Send, Loader2, Clock, Pin as PinIcon
} from 'lucide-react'

const Book = () => {
  const [book, setBook] = useState(null)
  const [borrowLoading, setBorrowLoading] = useState(false)
  const [comment, setComment] = useState([])
  const [content, setContent] = useState('')
  const [userRole, setUserRole] = useState(null)
  const [myBorrowId, setMyBorrowId] = useState(null)
  const [myDueDate, setMyDueDate] = useState(null)
  const [favLoading, setFavLoading] = useState(false)
  const [commentLoading, setCommentLoading] = useState(false)
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
          const myBook = dataProfile.active?.find(b => Number(b.book_id) === Number(id))
          if (myBook) {
            setMyBorrowId(myBook.borrow_id)
            setMyDueDate(myBook.due_date)
          }
        } catch (err) { console.error(err) }
      }

      try {
        const [bookRes, commentsRes, favRes] = await Promise.all([
          fetch(`/api/books/${id}`),
          fetch(`/api/comments?bookId=${id}`),
          token ? fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } }) : null
        ])

        setBook(await bookRes.json())
        setComment(await commentsRes.json())

        if (favRes) {
          const favData = await favRes.json()
          const favs = Array.isArray(favData) ? favData : (favData.favorites || [])
          setIsFavorite(favs.some(f => Number(f.book_id) === Number(id) || Number(f.id) === Number(id)))
        }
      } catch (err) { console.error(err) }
    }

    fetchAll()
  }, [id])

  const handleBorrow = async () => {
    const token = localStorage.getItem('token')
    if (!token) return toast.error('Войдите в аккаунт')

    setBorrowLoading(true)
    try {
      const res = await fetch('/api/books/borrow/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookId: id })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Чтение начато', { description: 'У тебя 14 дней на отчёт' })
        setMyBorrowId(data.borrowId)
        setMyDueDate(data.due_date || data.deadline)
        const r = await fetch(`/api/books/${id}`)
        setBook(await r.json())
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setBorrowLoading(false)
    }
  }

  const handleComment = async () => {
    if (!content.trim()) return toast.error('Комментарий не может быть пустым')
    const token = localStorage.getItem('token')
    if (!token) return toast.error('Войдите в аккаунт')

    setCommentLoading(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, bookId: id })
      })
      const data = await res.json()
      if (res.ok) {
        setComment(prev => [data.newComment, ...prev])
        setContent('')
        toast.success('Комментарий добавлен')
      } else {
        toast.error(data.error)
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setCommentLoading(false)
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

  const handlePin = async (commentId) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId })
      })
      const data = await res.json()
      if (data.updatedComment) {
        setComment(prev => prev.map(c => c.id === data.updatedComment.id ? data.updatedComment : c))
      }
    } catch (err) { toast.error('Ошибка') }
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
      </div>
    )
  }

  const isUnavailable = book.available_copies !== undefined && book.available_copies <= 0 && !myBorrowId

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
              {myBorrowId ? (
                <button
                  onClick={() => router.push(`/report/${myBorrowId}`)}
                  className="px-5 py-2.5 rounded-xl bg-[#34c759] hover:bg-[#2da847] text-white text-[15px] font-medium flex items-center gap-2 transition-colors"
                >
                  <BookOpen size={15} /> Сдать отчёт
                </button>
              ) : (
                <button
                  onClick={handleBorrow}
                  disabled={borrowLoading || isUnavailable}
                  className="px-5 py-2.5 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[15px] font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {borrowLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : isUnavailable ? (
                    'Нет в наличии'
                  ) : (
                    <><BookOpen size={15} /> Взять книгу</>
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
                { label: 'Статус', value: myBorrowId ? 'Читаешь' : (isUnavailable ? 'На руках' : 'Доступна'), color: myBorrowId ? '#1a56db' : (isUnavailable ? '#ff3b30' : '#34c759') }
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-medium mb-1">{s.label}</div>
                  <div className="font-semibold text-[15px]" style={{ color: s.color || '#1d1d1f' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {myDueDate && (
              <div className="mt-6 p-4 rounded-xl bg-[#1a56db]/8 border border-[#1a56db]/20 flex items-center gap-3">
                <Clock size={16} className="text-[#1a56db]" />
                <div className="text-[14px] text-[#1d1d1f]">
                  <span className="text-[#6e6e73]">Вернуть до: </span>
                  <strong>{new Date(myDueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</strong>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <div className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] mb-5 flex items-center gap-2">
            <MessageSquare size={18} className="text-[#1a56db]" />
            Комментарии ({comment.length})
          </h2>

          <div className="mb-6 bg-white border border-black/8 rounded-2xl p-4">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              className="w-full bg-[#f5f5f7] border border-transparent rounded-xl p-3 text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#1a56db]/30 focus:bg-white transition-all resize-none text-[14px]"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleComment}
                disabled={commentLoading || !content.trim()}
                className="px-4 py-2 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[13px] font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {commentLoading ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Отправить</>}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {comment.length === 0 ? (
              <div className="text-center py-12 text-[#86868b] text-[14px]">
                Пока никто не оставил отзыв
              </div>
            ) : comment.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border transition-all ${
                  item.is_pinned
                    ? 'bg-[#1a56db]/5 border-[#1a56db]/30'
                    : 'bg-white border-black/8 hover:border-black/12'
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a56db] to-[#3b82f6] flex items-center justify-center font-semibold text-white text-[13px] shrink-0">
                    {item.user_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[14px] flex items-center gap-2 text-[#1d1d1f]">
                      {item.user_name}
                      {item.is_pinned && (
                        <span className="text-[10px] bg-[#1a56db]/15 text-[#1a56db] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <PinIcon size={9} /> Закреплено
                        </span>
                      )}
                    </div>
                  </div>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => handlePin(item.id)}
                      className="text-[#86868b] hover:text-[#1a56db] p-1.5 rounded-lg hover:bg-[#1a56db]/10 transition-colors"
                    >
                      <PinIcon size={13} />
                    </button>
                  )}
                </div>
                <p className="text-[#6e6e73] text-[14px] leading-relaxed pl-12">{item.content}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Book