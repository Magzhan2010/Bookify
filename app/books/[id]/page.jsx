'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, Heart, BookOpen, Download,
  Bell, BellOff, Loader2, Clock, Star, MessageCircle,
  Send, Trash2, Sparkles, Save, X, Edit, RotateCcw
} from 'lucide-react'

// === ВСПОМОГАТЕЛЬНОЕ ДЛЯ ФОРМЫ РЕДАКТИРОВАНИЯ ===
// В таблице books нет колонок language/difficulty — они хранятся в tags.
// Поэтому при открытии формы мы достаём их из tags, а при сохранении — собираем обратно.
const LANGUAGES = ['Русский', 'Английский', 'Казахский']
const DIFFICULTY_KEYS = ['сложн', 'средн', 'лёгк', 'легк']

function splitTags(tags, genre) {
  const list = (tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    // жанр в tags дублирует колонку genre — убираем, чтобы не задваивался
    .filter(t => !genre || t.toLowerCase() !== genre.toLowerCase())

  return {
    language: list.find(t => LANGUAGES.includes(t)) || '',
    difficulty: list.find(t => {
      const l = t.toLowerCase()
      return DIFFICULTY_KEYS.some(k => l.includes(k))
    }) || '',
    // теги, которые не являются ни языком, ни сложностью — сохраняем как есть
    rest: list.filter(t => {
      if (LANGUAGES.includes(t)) return false
      const l = t.toLowerCase()
      return !DIFFICULTY_KEYS.some(k => l.includes(k))
    })
  }
}

const Field = ({ label, children, type }) => (
  <div>
    <label className="block text-[12px] text-[var(--color-text-tertiary)] font-medium mb-1.5 uppercase tracking-wider">{label}</label>
    {children}
  </div>
)

// === ФОРМА РЕДАКТИРОВАНИЯ (для библиотекаря) ===
const EditBookForm = ({ form, setForm, onSave, onCancel, saving }) => {
  const update = (k, v) => setForm({ ...form, [k]: v })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-soft)] flex items-center justify-center">
          <Edit size={20} className="text-[var(--color-brand)]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Редактирование книги</h2>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">Изменения сохранятся в БД и Google Sheets</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Название *">
            <input
              type="text"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
          <Field label="Автор *">
            <input
              type="text"
              value={form.author}
              onChange={e => update('author', e.target.value)}
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Жанр">
            <input
              type="text"
              value={form.genre || ''}
              onChange={e => update('genre', e.target.value)}
              placeholder="Классика"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
          <Field label="Год">
            <input
              type="text"
              value={form.year || ''}
              onChange={e => update('year', e.target.value)}
              placeholder="1967"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
          <Field label="Язык">
            <input
              type="text"
              value={form.language || ''}
              onChange={e => update('language', e.target.value)}
              placeholder="Русский"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
          <Field label="Сложность">
            <input
              type="text"
              value={form.difficulty || ''}
              onChange={e => update('difficulty', e.target.value)}
              placeholder="Средний"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Экземпляров всего">
            <input
              type="number"
              min="1"
              value={form.total_copies}
              onChange={e => update('total_copies', parseInt(e.target.value) || 1)}
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
          <Field label="Страниц">
            <input
              type="number"
              min="0"
              value={form.pages || ''}
              onChange={e => update('pages', e.target.value)}
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
        </div>

        <Field label="Описание">
          <textarea
            rows={3}
            value={form.description || ''}
            onChange={e => update('description', e.target.value)}
            className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors resize-none"
          />
        </Field>

        <Field label="URL обложки">
          <input
            type="url"
            value={form.cover_url || ''}
            onChange={e => update('cover_url', e.target.value)}
            placeholder="https://..."
            className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
          />
        </Field>

        <Field label="URL PDF">
          <input
            type="url"
            value={form.file_url || ''}
            onChange={e => update('file_url', e.target.value)}
            placeholder="https://..."
            className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
          />
        </Field>

        <Field label="Доп. теги (через запятую)">
          <input
            type="text"
            value={form.tags || ''}
            onChange={e => update('tags', e.target.value)}
            placeholder="Классика, must-read"
            className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
          />
        </Field>

        <p className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">
          «Жанр», «Язык», «Сложность» и доп. теги сохраняются в одном поле тегов —
          по нему каталог определяет уровень сложности.
        </p>

        <div className="pt-4 border-t border-[var(--color-border)] flex gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Сохранить</>}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            <X size={16} /> Отмена
          </button>
        </div>
      </div>
    </motion.div>
  )
}

const Book = () => {
  const [book, setBook] = useState(null)
  const [requestLoading, setRequestLoading] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [userId, setUserId] = useState(null)
  const [myBorrow, setMyBorrow] = useState(null)
  const [myRequest, setMyRequest] = useState(null)
  const [favLoading, setFavLoading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [related, setRelated] = useState([])

  // Librarian: edit mode
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Комментарии
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentsLoaded, setCommentsLoaded] = useState(false)

  const router = useRouter()
  const { id } = useParams()

  // Загружает комментарии к книге.
  // ВАЖНО: эта функция обязана быть объявлена — раньше её потеряли при
  // рефакторинге, и страница падала с "fetchComments is not defined".
  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/books/comment?bookId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setComments(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('Comments load error:', e)
    } finally {
      setCommentsLoaded(true)
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [id])

  useEffect(() => {
    const fetchAll = async () => {
      const token = localStorage.getItem('token')

      if (token) {
        // parseJwt использует atob — client-only. Импортируем динамически.
        import('../../../lib/jwt')
          .then(({ parseJwt: pj }) => {
            const payload = pj(token) || { role: 'student' }
            setUserRole(payload?.role)
            setUserId(payload?.id)
          })
          .catch(() => {
            setUserRole('student')
            setUserId(null)
          })

        try {
          const profileRes = await fetch('/api/profile', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (profileRes.ok) {
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
        const parsedTags = splitTags(bookData.tags, bookData.genre)
        setEditForm({
          title: bookData.title || '',
          author: bookData.author || '',
          genre: bookData.genre || '',
          year: bookData.year || '',
          description: bookData.description || '',
          cover_url: bookData.cover_url || '',
          file_url: bookData.file_url || '',
          total_copies: bookData.total_copies || 1,
          isbn: bookData.isbn || '',
          pages: bookData.pages || '',
          language: parsedTags.language,
          difficulty: parsedTags.difficulty,
          tags: parsedTags.rest.join(', ')
        })

        if (favRes) {
          try {
            const favData = await favRes.json()
            const favs = Array.isArray(favData) ? favData : (favData.favorites || [])
            setIsFavorite(favs.some(f => Number(f.book_id) === Number(id) || Number(f.id) === Number(id)))
          } catch (e) {}
        }

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
    fetchComments()
  }, [id])

  const isLibrarian = userRole === 'librarian'

  // === Библиотекарь: сохранить изменения ===
  const handleSaveEdit = async () => {
    if (!editForm.title?.trim() || !editForm.author?.trim()) {
      return toast.error('Название и автор обязательны')
    }

    setSavingEdit(true)
    try {
      const token = localStorage.getItem('token')

      // language/difficulty — не колонки, а часть tags (как при добавлении книги)
      const tagParts = [
        editForm.genre,
        editForm.language,
        editForm.difficulty,
        editForm.tags
      ]
        .map(v => (v || '').trim())
        .filter(Boolean)

      const payload = {
        title: editForm.title.trim(),
        author: editForm.author.trim(),
        genre: editForm.genre.trim() || 'Без раздела',
        year: editForm.year.trim(),
        description: editForm.description.trim(),
        cover_url: editForm.cover_url.trim(),
        file_url: editForm.file_url.trim(),
        total_copies: Math.max(1, parseInt(editForm.total_copies) || 1),
        isbn: editForm.isbn.trim(),
        pages: editForm.pages === '' ? '' : parseInt(editForm.pages) || 0,
        tags: tagParts.join(', ')
      }

      const res = await fetch(`/api/books/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Книга обновлена')
        setBook(data.book)
        const parsed = splitTags(data.book.tags, data.book.genre)
        setEditForm(prev => ({
          ...prev,
          language: parsed.language,
          difficulty: parsed.difficulty,
          tags: parsed.rest.join(', ')
        }))
        setEditMode(false)
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (e) {
      toast.error('Ошибка сети')
    } finally {
      setSavingEdit(false)
    }
  }

  // === Библиотекарь: убрать книгу в архив (историю выдач не стираем) ===
  const handleArchive = async () => {
    if (
      !confirm(
        `Убрать «${book.title}» из каталога?\n\nКнига пропадёт из каталога и из выдачи, но история выдач и возвратов сохранится. Книгу можно вернуть обратно в любой момент.`
      )
    )
      return

    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`«${data.archived}» убрана в архив`, {
          description: 'История выдач сохранена'
        })
        setTimeout(() => router.push('/library'), 900)
      } else {
        toast.error(data.error || 'Ошибка')
        setDeleting(false)
      }
    } catch (e) {
      toast.error('Ошибка сети')
      setDeleting(false)
    }
  }

  // === Библиотекарь: вернуть книгу из архива ===
  const handleRestore = async () => {
    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/books/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Книга снова в каталоге')
        setBook(data.book)
        setDeleting(false)
      } else {
        toast.error(data.error || 'Ошибка')
        setDeleting(false)
      }
    } catch (e) {
      toast.error('Ошибка сети')
      setDeleting(false)
    }
  }

  // === Ученик: заявка на книгу ===
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

  const handleAddComment = async () => {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/login')
    if (!newComment.trim()) return toast.error('Комментарий пустой')

    setCommentLoading(true)
    try {
      const res = await fetch('/api/books/comment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: id, content: newComment })
      })
      const data = await res.json()
      if (res.ok) {
        setComments(prev => [data.comment, ...prev])
        setNewComment('')
        toast.success('Комментарий добавлен')
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleDeleteComment = async (commentId, commentUserId) => {
    if (userId !== commentUserId && !isLibrarian) return
    if (!confirm('Удалить комментарий?')) return

    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/books/comment?commentId=${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setComments(prev => prev.filter(c => c.id !== commentId))
      toast.success('Удалено')
    } catch (err) {
      toast.error('Ошибка')
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
        ? { color: 'var(--color-warning)', bg: 'var(--color-warning)]/10', label: 'Заявка отправлена', icon: Bell, msg: 'Библиотекарь выдаст книгу' }
        : null

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] pb-20">
      <div className="sticky top-0 z-30 bg-[var(--color-bg-overlay)] backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft size={15} /> Назад
          </button>

          {isLibrarian && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  editMode
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
                }`}
              >
                <Edit size={13} /> {editMode ? 'Отменить' : 'Редактировать'}
              </button>
              <button
                onClick={book.archived_at ? handleRestore : handleArchive}
                disabled={deleting}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 ${
                  book.archived_at
                    ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/15'
                    : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15'
                }`}
              >
                {deleting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : book.archived_at ? (
                  <RotateCcw size={13} />
                ) : (
                  <Trash2 size={13} />
                )}
                {book.archived_at ? 'Вернуть в каталог' : 'В архив'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8">
        {editMode ? (
          <EditBookForm
            form={editForm}
            setForm={setEditForm}
            onSave={handleSaveEdit}
            onCancel={() => setEditMode(false)}
            saving={savingEdit}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col lg:flex-row gap-8 lg:gap-12"
          >
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

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.05] mb-3 text-[var(--color-text-primary)]">
                {book.title}
              </h1>
              <p className="text-[19px] text-[var(--color-brand)] font-medium mb-6">{book.author}</p>

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

              <div className="flex flex-wrap gap-2.5 mb-8">
                {!isLibrarian && (
                  myBorrow ? (
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
                  )
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
        )}

        {/* === КОММЕНТАРИИ === */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-12 pt-8 border-t border-[var(--color-border)]"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-soft)] flex items-center justify-center">
              <MessageCircle size={20} className="text-[var(--color-brand)]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                Обсуждение книги
              </h2>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">
                {comments.length > 0
                  ? `${comments.length} ${comments.length === 1 ? 'комментарий' : 'комментариев'}`
                  : 'Будь первым, кто поделится впечатлениями'}
              </p>
            </div>
          </div>

          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-6">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Поделитесь впечатлениями, мыслями, цитатами из книги..."
              className="w-full bg-[var(--color-bg-soft)] border border-transparent rounded-xl p-3 text-[14px] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-brand)]/30 focus:bg-[var(--color-bg-card)] transition-all resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-[var(--color-text-tertiary)]">{newComment.length}/500</span>
              <button
                onClick={handleAddComment}
                disabled={commentLoading || !newComment.trim()}
                className="px-4 py-2 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[13px] font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {commentLoading ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Отправить</>}
              </button>
            </div>
          </div>

          {!commentsLoaded ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[var(--color-text-tertiary)]" />
            </div>
          ) : comments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-soft)] mx-auto mb-3 flex items-center justify-center">
                <MessageCircle size={28} className="text-[var(--color-text-tertiary)]" />
              </div>
              <p className="text-[var(--color-text-secondary)] text-[14px] mb-1">Пока никто не оставил отзыв</p>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">Будь первым, кто поделится мыслями о книге</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {comments.map((c, i) => {
                  const isOwn = c.user_id === userId
                  const canDelete = isOwn || isLibrarian
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                      className={`bg-[var(--color-bg-card)] border rounded-2xl p-4 transition-all hover:shadow-[var(--shadow-soft)] hover:border-[var(--color-border-strong)] ${
                        c.is_pinned ? 'bg-[var(--color-brand-soft)]/30 border-[var(--color-brand)]/30' : 'border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-hover)] flex items-center justify-center text-white font-semibold shrink-0">
                          {c.user_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-semibold text-[14px] text-[var(--color-text-primary)]">{c.user_name}</span>
                            {c.user_class && (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] text-[10px] font-medium">
                                {c.user_class}
                              </span>
                            )}
                            {c.is_pinned && (
                              <span className="text-[10px] uppercase tracking-wider text-[var(--color-brand)] font-bold">
                                📌 Закреплено
                              </span>
                            )}
                            <span className="text-[11px] text-[var(--color-text-tertiary)]">
                              · {new Date(c.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[14px] text-[var(--color-text-primary)] leading-[1.55] whitespace-pre-wrap">
                            {c.content}
                          </p>
                          {canDelete && (
                            <div className="flex justify-end mt-2">
                              <button
                                onClick={() => handleDeleteComment(c.id, c.user_id)}
                                className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] flex items-center gap-1 transition-colors"
                              >
                                <Trash2 size={11} /> Удалить
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.section>

        {/* Похожие книги */}
        {!editMode && related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-12 pt-8 border-t border-[var(--color-border)]"
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