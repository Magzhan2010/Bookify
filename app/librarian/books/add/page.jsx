'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, BookOpen, Plus, Trash2, Loader2,
  Library, Upload, AlertCircle
} from 'lucide-react'

export default function AddBookPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    title: '',
    author: '',
    genre: '',
    year: '',
    description: '',
    cover_url: '',
    file_url: '',
    total_copies: 1,
    language: '',
    tags: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.author) {
      return toast.error('Заполни название и автора')
    }

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
        setResult({ success: true, book: data.book, sheets: data.sheets_synced })
        let msg = `«${form.title}» добавлена в каталог`
        if (data.sheets_synced) msg += ' → в Google Sheets ✓'
        else if (data.sheets_error) msg += ` (Sheets: ${data.sheets_error})`
        toast.success(msg, { duration: 5000 })
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (e) {
      toast.error('Ошибка сети')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> Назад
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand)] flex items-center justify-center">
            <Plus size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">Добавить книгу</h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
              Книга появится в каталоге и (если настроено) в Google Sheets
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Название *" required>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              placeholder="Мастер и Маргарита"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>

          <Field label="Автор *" required>
            <input
              type="text"
              value={form.author}
              onChange={e => setForm({...form, author: e.target.value})}
              placeholder="Михаил Булгаков"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Жанр">
            <input
              type="text"
              value={form.genre}
              onChange={e => setForm({...form, genre: e.target.value})}
              placeholder="Классика"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
          <Field label="Год">
            <input
              type="text"
              value={form.year}
              onChange={e => setForm({...form, year: e.target.value})}
              placeholder="1967"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
          <Field label="Язык">
            <input
              type="text"
              value={form.language}
              onChange={e => setForm({...form, language: e.target.value})}
              placeholder="Русский"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
          <Field label="Сложность">
            <input
              type="text"
              value={form.difficulty}
              onChange={e => setForm({...form, difficulty: e.target.value})}
              placeholder="Средний"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
          </Field>
        </div>

        <Field label="Описание">
          <textarea
            rows={3}
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            placeholder="Краткое описание сюжета..."
            className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors resize-none"
          />
        </Field>

        <Field label="URL обложки">
          <input
            type="url"
            value={form.cover_url}
            onChange={e => setForm({...form, cover_url: e.target.value})}
            placeholder="https://..."
            className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
          />
        </Field>

        <Field label="Кол-во экземпляров" type="number">
          <input
            type="number"
            min="1"
            value={form.total_copies}
            onChange={e => setForm({...form, total_copies: parseInt(e.target.value) || 1})}
            className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
          />
        </Field>

        <div className="pt-3 border-t border-[var(--color-border)]">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Save size={16} /> Добавить книгу
              </>
            )}
          </button>
        </div>
      </motion.form>

      {/* Success */}
      <AnimatePresence>
        {result?.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-5 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-success)] flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[15px] text-[var(--color-success)] mb-1">
                  «{result.book.title}» добавлена!
                </div>
                <div className="text-[13px] text-[var(--color-text-secondary)]">
                  {result.sheets
                    ? 'Книга уже в каталоге и в Google Sheets ✓'
                    : 'Книга в каталоге (Sheets не настроен)'}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => router.push('/librarian')}
                    className="text-[12px] px-3 py-1.5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-brand)]/40 transition-colors"
                  >
                    В библиотеку
                  </button>
                  <button
                    onClick={() => {
                      setForm({ title: '', author: '', genre: '', year: '', description: '', cover_url: '', file_url: '', total_copies: 1, language: '', tags: '' })
                      setResult(null)
                    }}
                    className="text-[12px] px-3 py-1.5 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] transition-colors"
                  >
                    + Ещё одну
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const Field = ({ label, children, required, type }) => (
  <div>
    <label className="block text-[13px] text-[var(--color-text-primary)] font-medium mb-1.5">
      {label}
      {required && <span className="text-[var(--color-danger)] ml-1">*</span>}
    </label>
    {children}
  </div>
)

// Импорт AnimatePresence
import { AnimatePresence } from 'framer-motion'