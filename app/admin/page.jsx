'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Shield, Plus, Trash2, BookOpen, LogOut, Search,
  Loader2, RefreshCw, Save, Library, X
} from 'lucide-react'

const Admin = () => {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', author: '', genre: '', year: '',
    description: '', cover_url: '', file_url: '', total_copies: 1
  })
  const [books, setBooks] = useState([])
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/login')
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role !== 'librarian') return router.push('/login')
    } catch (e) { router.push('/login') }
  }, [router])

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books?allBooks=true')
      if (res.ok) setBooks(await res.json())
    } catch (e) { console.error(e) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.author) return toast.error('Заполни название и автора')

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (res.ok) {
        let msg = `«${form.title}» добавлена в каталог`
        if (data.sheets_synced) {
          msg += ' → синхронизирована с Google Sheets ✓'
        } else if (data.sheets_error) {
          msg += ` (Sheets: ${data.sheets_error})`
        }
        toast.success(msg, { duration: 5000 })
        setForm({ title: '', author: '', genre: '', year: '', description: '', cover_url: '', file_url: '', total_copies: 1 })
        fetchBooks()
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (e) {
      toast.error('Ошибка сети')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, title) => {
    if (!confirm(`Удалить "${title}"?`)) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setBooks(prev => prev.filter(b => b.id !== id))
        toast.success('Удалено')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Ошибка')
      }
    } catch (e) { toast.error('Ошибка сети') }
  }

  const filtered = books.filter(b =>
    !search || b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase())
  )

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-soft)] text-[var(--color-text-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--color-bg-overlay)] backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Управление книгами</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)]">Добавление в каталог</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/librarian')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white text-[12px] font-medium transition-colors"
            >
              <Library size={13} /> Каталог
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15 text-[12px] font-medium transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Всего книг" value={books.length} color="var(--color-brand)" />
          <Stat label="Экземпляров" value={books.reduce((s, b) => s + (b.total_copies || 0), 0)} color="var(--color-text-primary)" />
          <Stat label="Доступно" value={books.reduce((s, b) => s + (b.available_copies || 0), 0)} color="var(--color-success)" />
          <Stat label="Жанров" value={new Set(books.map(b => b.genre).filter(Boolean)).size} color="var(--color-warning)" />
        </div>

        {/* Add form */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-soft)] flex items-center justify-center">
              <Plus size={20} className="text-[var(--color-brand)]" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Добавить книгу</h2>
              <p className="text-[12px] text-[var(--color-text-tertiary)]">Книга сразу появится в каталоге</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Название *" value={form.title} onChange={v => setForm({...form, title: v})} placeholder="Мастер и Маргарита" />
              <Field label="Автор *" value={form.author} onChange={v => setForm({...form, author: v})} placeholder="Михаил Булгаков" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Жанр" value={form.genre} onChange={v => setForm({...form, genre: v})} placeholder="Классика" />
              <Field label="Год" value={form.year} onChange={v => setForm({...form, year: v})} placeholder="1967" />
              <Field label="Язык" value={form.language} onChange={v => setForm({...form, language: v})} placeholder="Русский" />
              <Field label="Сложность" value={form.difficulty} onChange={v => setForm({...form, difficulty: v})} placeholder="Средний" />
            </div>
            <Field label="Описание" value={form.description} onChange={v => setForm({...form, description: v})} placeholder="Краткое описание сюжета..." multiline />
            <Field label="URL обложки" value={form.cover_url} onChange={v => setForm({...form, cover_url: v})} placeholder="https://..." />
            <Field label="Кол-во экземпляров" type="number" value={form.total_copies} onChange={v => setForm({...form, total_copies: parseInt(v) || 1})} />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Добавить книгу</>}
            </button>
          </form>
        </motion.section>

        {/* Books list */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold">Каталог ({filtered.length})</h2>
            <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] pl-9 pr-3 py-2 rounded-xl text-[13px] outline-none focus:border-[var(--color-brand)]"
                />
              </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
              <p className="text-[var(--color-text-tertiary)] text-[14px]">Нет книг</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((book, i) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:border-[var(--color-danger)]/40 transition-all group"
                >
                  <div className="relative aspect-[2/3] bg-[var(--color-bg-soft)]">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={24} className="text-[var(--color-text-tertiary)]" />
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(book.id, book.title)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--color-danger)] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Удалить"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="p-2.5">
                    <div className="font-semibold text-[13px] line-clamp-1 text-[var(--color-text-primary)]">{book.title}</div>
                    <div className="text-[11px] text-[var(--color-text-tertiary)] line-clamp-1">{book.author}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

const Stat = ({ label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4"
  >
    <div className="text-2xl sm:text-3xl font-semibold" style={{ color }}>{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mt-1">{label}</div>
  </motion.div>
)

const Field = ({ label, value, onChange, type = 'text', placeholder, multiline }) => (
  <div>
    <label className="block text-[13px] text-[var(--color-text-primary)] font-medium mb-1.5">{label}</label>
    {multiline ? (
      <textarea
        rows={2}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors resize-none"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
      />
    )}
  </div>
)

export default Admin