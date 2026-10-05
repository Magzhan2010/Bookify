'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Shield, Plus, Trash2, BookOpen, BarChart3, LogOut, Search,
  Loader2, X, RefreshCw, ExternalLink, CheckCircle
} from 'lucide-react'

const Admin = () => {
  const [form, setForm] = useState({
    title: '', author: '', genre: '', year: '',
    description: '', cover_url: '', file_url: '', total_copies: 1
  })
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/login')
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role !== 'admin') {
        router.push('/login')
      }
    } catch (e) {
      router.push('/login')
    }
  }, [])

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books?allBooks=true')
      const data = await res.json()
      setBooks(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchBooks() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.author) {
      return toast.error('Заполни название и автора')
    }
    setLoading(true)
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
      if (data.success) {
        toast.success(`«${form.title}» добавлена в каталог`)
        setForm({ title: '', author: '', genre: '', year: '', description: '', cover_url: '', file_url: '', total_copies: 1 })
        fetchBooks()
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
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
      }
    } catch (err) {
      toast.error('Ошибка')
    }
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
    <div className="min-h-screen bg-[#06070d] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#06070d]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#60a5fa] to-[#1a56db] flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-lg">Админ-панель</div>
              <div className="text-[10px] uppercase tracking-wider text-[#5a6383]">DLS Library</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/librarian')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8b94e]/10 border border-[#e8b94e]/30 text-[#e8b94e] hover:bg-[#e8b94e]/20 transition-all text-sm font-bold"
            >
              <BookOpen size={14} /> Библиотека
            </button>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all text-sm font-semibold"
            >
              <BarChart3 size={14} /> Отчёты
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-semibold"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Stat label="Всего книг" value={books.length} color="#60a5fa" />
          <Stat label="Экземпляров" value={books.reduce((s, b) => s + (b.total_copies || 0), 0)} color="#e8b94e" />
          <Stat label="На руках" value={books.reduce((s, b) => s + ((b.total_copies || 0) - (b.available_copies || 0)), 0)} color="#4ecdc4" />
          <Stat label="Доступно" value={books.reduce((s, b) => s + (b.available_copies || 0), 0)} color="#4ecdc4" />
        </div>

        {/* Add book form */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#11141f] border border-white/5 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Plus size={20} className="text-[#e8b94e]" />
            <h2 className="font-display font-bold text-xl">Добавить книгу</h2>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Название *" value={form.title} onChange={v => setForm({...form, title: v})} placeholder="Мастер и Маргарита" />
            <Field label="Автор *" value={form.author} onChange={v => setForm({...form, author: v})} placeholder="Булгаков" />
            <Field label="Жанр" value={form.genre} onChange={v => setForm({...form, genre: v})} placeholder="Классика" />
            <Field label="Год" value={form.year} onChange={v => setForm({...form, year: v})} placeholder="1967" />
            <div className="md:col-span-2">
              <label className="block text-xs text-[#5a6383] uppercase tracking-wider font-bold mb-1.5">Описание</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Краткое описание сюжета..."
                className="w-full bg-[#0a0c17] border border-white/10 px-4 py-2.5 rounded-xl text-white placeholder-[#3a4565] outline-none focus:border-[#e8b94e]/30 resize-none text-sm"
              />
            </div>
            <Field label="URL обложки" value={form.cover_url} onChange={v => setForm({...form, cover_url: v})} placeholder="https://..." />
            <Field label="URL PDF" value={form.file_url} onChange={v => setForm({...form, file_url: v})} placeholder="https://..." />
            <Field label="Кол-во экземпляров" type="number" value={form.total_copies} onChange={v => setForm({...form, total_copies: parseInt(v) || 1})} placeholder="1" />

            <div className="md:col-span-2 flex gap-2 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Добавить в каталог</>}
              </button>
              <button
                type="button"
                onClick={() => router.push('/librarian/sync')}
                className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-[#94a3b8] hover:text-white font-bold flex items-center gap-2"
              >
                <RefreshCw size={16} /> Из Sheets
              </button>
            </div>
          </form>
        </motion.section>

        {/* Books list */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl">Каталог ({filtered.length})</h2>
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6383]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full bg-[#11141f] border border-white/10 pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <AnimatePresence>
              {filtered.map((book, i) => (
                <motion.div
                  key={book.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.02 }}
                  className="group bg-[#11141f] border border-white/5 rounded-2xl overflow-hidden hover:border-[#e8b94e]/30 transition-all"
                >
                  <div className="relative aspect-[2/3] bg-[#0a0c17]">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={28} className="text-[#5a6383]" />
                      </div>
                    )}
                    {book.genre && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-bold text-[#e8b94e] uppercase tracking-wider">
                        {book.genre}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm line-clamp-1">{book.title}</h3>
                    <p className="text-xs text-[#5a6383] line-clamp-1 mb-2">{book.author}</p>
                    <div className="flex items-center gap-1 text-[10px] mb-2">
                      <span className={book.available_copies > 0 ? 'text-[#4ecdc4]' : 'text-[#ff5d8f]'}>
                        {book.available_copies || 0}/{book.total_copies || 1}
                      </span>
                      <span className="text-[#5a6383]">доступно</span>
                    </div>
                    <button
                      onClick={() => handleDelete(book.id, book.title)}
                      className="w-full py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12} /> Удалить
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  )
}

const Stat = ({ label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#11141f] border border-white/5 rounded-2xl p-4"
  >
    <div className="text-2xl sm:text-3xl font-display font-black" style={{ color }}>{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-[#5a6383] font-bold mt-1">{label}</div>
  </motion.div>
)

const Field = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-xs text-[#5a6383] uppercase tracking-wider font-bold mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0a0c17] border border-white/10 px-4 py-2.5 rounded-xl text-white placeholder-[#3a4565] outline-none focus:border-[#e8b94e]/30 text-sm"
    />
  </div>
)

export default Admin