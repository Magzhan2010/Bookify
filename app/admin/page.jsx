'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Shield, Plus, Trash2, BookOpen, BarChart3, LogOut, Search,
  Loader2, RefreshCw
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
    } catch (e) { router.push('/login') }
  }, [])

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books?allBooks=true')
      setBooks(await res.json())
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchBooks() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.author) return toast.error('Заполни название и автора')
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
        toast.success(`«${form.title}» добавлена`)
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
    } catch (err) { toast.error('Ошибка') }
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
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1a56db] flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <div className="text-[15px] font-semibold text-[#1d1d1f]">Админ-панель</div>
              <div className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium">DLS Library</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/librarian')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a56db]/10 text-[#1a56db] hover:bg-[#1a56db]/15 text-[13px] font-medium transition-colors"
            >
              <BookOpen size={13} /> Библиотека
            </button>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-black/10 text-[#1d1d1f] hover:bg-[#f5f5f7] text-[13px] font-medium transition-colors"
            >
              <BarChart3 size={13} /> Отчёты
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/15 text-[13px] font-medium transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Всего книг" value={books.length} color="#1a56db" />
          <Stat label="Экземпляров" value={books.reduce((s, b) => s + (b.total_copies || 0), 0)} color="#1d1d1f" />
          <Stat label="На руках" value={books.reduce((s, b) => s + ((b.total_copies || 0) - (b.available_copies || 0)), 0)} color="#ff9500" />
          <Stat label="Доступно" value={books.reduce((s, b) => s + (b.available_copies || 0), 0)} color="#34c759" />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-black/8 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <Plus size={16} className="text-[#1a56db]" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Добавить книгу</h2>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Field label="Название *" value={form.title} onChange={v => setForm({...form, title: v})} />
            <Field label="Автор *" value={form.author} onChange={v => setForm({...form, author: v})} />
            <Field label="Жанр" value={form.genre} onChange={v => setForm({...form, genre: v})} />
            <Field label="Год" value={form.year} onChange={v => setForm({...form, year: v})} />
            <div className="md:col-span-2">
              <label className="block text-[12px] text-[#86868b] uppercase tracking-wider font-medium mb-1.5">Описание</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                className="w-full bg-[#f5f5f7] border border-transparent px-4 py-2.5 rounded-xl text-[#1d1d1f] outline-none focus:border-[#1a56db]/30 focus:bg-white transition-all resize-none text-[14px]"
              />
            </div>
            <Field label="URL обложки" value={form.cover_url} onChange={v => setForm({...form, cover_url: v})} />
            <Field label="URL PDF" value={form.file_url} onChange={v => setForm({...form, file_url: v})} />
            <Field label="Кол-во экземпляров" type="number" value={form.total_copies} onChange={v => setForm({...form, total_copies: parseInt(v) || 1})} />

            <div className="md:col-span-2 flex gap-2 mt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Добавить</>}
              </button>
              <button
                type="button"
                onClick={() => router.push('/librarian/sync')}
                className="px-5 py-3 rounded-xl bg-[#f5f5f7] hover:bg-[#ececec] text-[#1d1d1f] text-[13px] font-medium flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={13} /> Из Sheets
              </button>
            </div>
          </form>
        </motion.section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Каталог ({filtered.length})</h2>
            <div className="relative w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-black/10 pl-9 pr-3 py-2 rounded-xl text-[#1d1d1f] placeholder-[#86868b] outline-none focus:border-[#1a56db]/30 text-[13px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <AnimatePresence>
              {filtered.map((book, i) => (
                <motion.div
                  key={book.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.02 }}
                  className="group bg-white border border-black/8 rounded-2xl overflow-hidden hover:border-black/12 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all"
                >
                  <div className="relative aspect-[2/3] bg-[#f5f5f7]">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={24} className="text-[#86868b]" />
                      </div>
                    )}
                    {book.genre && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[9px] font-semibold text-[#1a56db]">
                        {book.genre}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-[13px] line-clamp-1 text-[#1d1d1f]">{book.title}</h3>
                    <p className="text-[11px] text-[#86868b] line-clamp-1 mb-2">{book.author}</p>
                    <div className="flex items-center gap-1 text-[10px] mb-2">
                      <span className={book.available_copies > 0 ? 'text-[#34c759] font-semibold' : 'text-[#ff3b30] font-semibold'}>
                        {book.available_copies || 0}/{book.total_copies || 1}
                      </span>
                      <span className="text-[#86868b]">доступно</span>
                    </div>
                    <button
                      onClick={() => handleDelete(book.id, book.title)}
                      className="w-full py-1.5 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/15 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 size={11} /> Удалить
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
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-black/8 rounded-2xl p-4"
  >
    <div className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color }}>{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium mt-1">{label}</div>
  </motion.div>
)

const Field = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-[12px] text-[#86868b] uppercase tracking-wider font-medium mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#f5f5f7] border border-transparent px-4 py-2.5 rounded-xl text-[#1d1d1f] outline-none focus:border-[#1a56db]/30 focus:bg-white transition-all text-[14px]"
    />
  </div>
)

export default Admin