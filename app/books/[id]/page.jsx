'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, Heart, BookOpen, Download, MessageSquare,
  Send, Loader2, Clock, User as UserIcon, Pin
} from 'lucide-react'

const Spinner = () => (
  <Loader2 size={16} className="animate-spin" />
)

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

        const bookData = await bookRes.json()
        setBook(bookData)

        const commentsData = await commentsRes.json()
        setComment(commentsData)

        if (favRes) {
          const favData = await favRes.json()
          const favs = Array.isArray(favData) ? favData : (favData.favorites || [])
          setIsFavorite(favs.some(f => Number(f.book_id) === Number(id) || Number(f.id) === Number(id)))
        }
      } catch (err) {
        console.error(err)
      }
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
        toast.success('Чтение начато!', { description: 'У тебя 14 дней на отчёт' })
        setMyBorrowId(data.borrowId)
        setMyDueDate(data.due_date || data.deadline)
        // Refetch book to update availability
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
          toast.success('Добавлено в избранное ❤️')
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
    } catch (err) {
      toast.error('Ошибка')
    }
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#06070d] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
      </div>
    )
  }

  const isUnavailable = book.available_copies !== undefined && book.available_copies <= 0 && !myBorrowId

  return (
    <div className="min-h-screen bg-[#06070d] text-white pb-20">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#06070d]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 h-16 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-semibold text-[#94a3b8] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Назад
          </button>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row gap-8 lg:gap-12"
        >
          {/* Cover */}
          <div className="shrink-0 mx-auto lg:mx-0">
            <div className="relative w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
              {book.cover_url ? (
                <Image src={book.cover_url} alt={book.title} fill className="object-cover" priority sizes="256px" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a1f30] to-[#0a0c17] flex items-center justify-center">
                  <BookOpen size={48} className="text-[#5a6383]" />
                </div>
              )}
            </div>
            {book.genre && (
              <div className="mt-4 text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-[#e8b94e]/10 border border-[#e8b94e]/20 text-[#e8b94e] text-xs font-bold uppercase tracking-wider">
                  {book.genre}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tighter leading-tight mb-2">
              {book.title}
            </h1>
            <p className="text-xl text-[#e8b94e] font-semibold mb-6">{book.author}</p>

            {book.description && (
              <p className="text-[#94a3b8] leading-relaxed mb-8 max-w-3xl">
                {book.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
              {myBorrowId ? (
                <button
                  onClick={() => router.push(`/report/${myBorrowId}`)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#4ecdc4] to-[#2d9b94] text-[#06070d] font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-[#4ecdc4]/30 transition-all"
                >
                  <BookOpen size={16} /> Сдать отчёт
                </button>
              ) : (
                <button
                  onClick={handleBorrow}
                  disabled={borrowLoading || isUnavailable}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold flex items-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-[#e8b94e]/30 transition-all"
                >
                  {borrowLoading ? (
                    <Spinner />
                  ) : isUnavailable ? (
                    <>Нет в наличии</>
                  ) : (
                    <><BookOpen size={16} /> Взять книгу</>
                  )}
                </button>
              )}

              <button
                onClick={handleFavorite}
                disabled={favLoading}
                className={`px-5 py-3 rounded-xl border font-bold flex items-center gap-2 transition-all ${
                  isFavorite
                    ? 'bg-[#ff5d8f]/10 border-[#ff5d8f]/30 text-[#ff5d8f]'
                    : 'bg-white/5 border-white/10 text-[#94a3b8] hover:text-white'
                }`}
              >
                {favLoading ? <Spinner /> : <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />}
                {isFavorite ? 'В избранном' : 'В избранное'}
              </button>

              {book.file_url && (
                <a
                  href={book.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-[#94a3b8] hover:text-white font-bold flex items-center gap-2 transition-all"
                >
                  <Download size={16} /> PDF
                </a>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/5 pt-6">
              {[
                { label: 'Год', value: book.year || '—' },
                { label: 'Доступно', value: `${book.available_copies ?? '?'}/${book.total_copies ?? '?'}`, color: (book.available_copies ?? 0) > 0 ? '#4ecdc4' : '#ff5d8f' },
                { label: 'Жанр', value: book.genre || '—' },
                { label: 'Статус', value: myBorrowId ? 'Читаешь' : (isUnavailable ? 'На руках' : 'Доступна'), color: myBorrowId ? '#e8b94e' : (isUnavailable ? '#ff5d8f' : '#4ecdc4') }
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-[10px] text-[#5a6383] uppercase tracking-wider font-bold mb-1">{s.label}</div>
                  <div className="font-bold" style={{ color: s.color || '#fff' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {myDueDate && (
              <div className="mt-6 p-4 rounded-xl bg-[#e8b94e]/10 border border-[#e8b94e]/20 flex items-center gap-3">
                <Clock size={18} className="text-[#e8b94e]" />
                <div className="text-sm">
                  <span className="text-[#94a3b8]">Вернуть до: </span>
                  <strong className="text-white">{new Date(myDueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</strong>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Comments */}
        <div className="mt-16 max-w-3xl">
          <h2 className="font-display text-2xl font-black mb-6 flex items-center gap-2">
            <MessageSquare size={20} className="text-[#e8b94e]" />
            Комментарии ({comment.length})
          </h2>

          <div className="mb-6 bg-[#11141f] border border-white/5 rounded-2xl p-4">
            <textarea
              placeholder="Поделитесь мыслями о книге..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              className="w-full bg-[#0a0c17] border border-white/5 rounded-xl p-3 text-white placeholder-[#3a4565] focus:outline-none focus:border-[#e8b94e]/30 transition-all resize-none text-sm"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleComment}
                disabled={commentLoading || !content.trim()}
                className="px-5 py-2 rounded-xl bg-[#e8b94e] text-[#06070d] font-bold text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-[#e8b94e]/90 transition-all"
              >
                {commentLoading ? <Spinner /> : <><Send size={14} /> Отправить</>}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {comment.length === 0 ? (
              <div className="text-center py-12 text-[#5a6383] text-sm">
                Пока никто не оставил отзыв. Будь первым!
              </div>
            ) : comment.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border transition-all ${
                  item.is_pinned
                    ? 'bg-[#e8b94e]/5 border-[#e8b94e]/30'
                    : 'bg-[#11141f] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#60a5fa] to-[#1a56db] flex items-center justify-center font-bold text-sm shrink-0">
                    {item.user_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm flex items-center gap-2">
                      {item.user_name}
                      {item.is_pinned && (
                        <span className="text-[10px] bg-[#e8b94e]/20 text-[#e8b94e] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <Pin size={10} /> Закреплено
                        </span>
                      )}
                    </div>
                  </div>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => handlePin(item.id)}
                      className="text-[#5a6383] hover:text-[#e8b94e] p-1.5 rounded-lg hover:bg-[#e8b94e]/10 transition-colors"
                    >
                      <Pin size={14} />
                    </button>
                  )}
                </div>
                <p className="text-[#94a3b8] text-sm leading-relaxed pl-12">{item.content}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Book