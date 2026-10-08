'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, UserPlus, Mail, X, User, AlertTriangle, BookOpen, Check } from 'lucide-react'

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (classFilter) params.set('class', classFilter)
      const res = await fetch(`/api/librarian/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStudents(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStudents() }, [classFilter])
  useEffect(() => {
    const t = setTimeout(fetchStudents, 300)
    return () => clearTimeout(t)
  }, [search])

  const classes = [...new Set(students.map(s => s.class_name).filter(Boolean))].sort()

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[var(--color-text-primary)]">
            Ученики
          </h1>
          <p className="text-[15px] text-[var(--color-text-secondary)]">{students.length} зарегистрировано</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-[13px] font-medium transition-colors flex items-center gap-2"
        >
          <UserPlus size={14} /> Добавить ученика
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] pl-11 pr-4 py-3 rounded-xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand-soft)] transition-all text-[14px]"
          />
        </div>
        {classes.length > 0 && (
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4 py-3 rounded-xl text-[var(--color-text-primary)] outline-none cursor-pointer text-[14px]"
          >
            <option value="">Все классы</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[#1a56db] rounded-full animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
          <p className="text-[var(--color-text-tertiary)] text-[14px]">Нет учеников</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {students.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => router.push(`/librarian/students/${s.id}`)}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 hover:border-[var(--color-brand)]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--color-brand)] flex items-center justify-center font-semibold text-white shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14px] truncate text-[var(--color-text-primary)]">{s.name}</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{s.class_name || '—'}</div>
                </div>
              </div>

              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-3 truncate">{s.email}</div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--color-border)]">
                <Stat label="Всего" value={s.total_borrows} color="#1a56db" />
                <Stat label="Сейчас" value={s.currently_holding} color="#ff9500" />
                <Stat label="Долги" value={s.overdue_count} color={s.overdue_count > 0 ? '#ff3b30' : '#86868b'} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AddStudentModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={() => { setShowAddModal(false); fetchStudents() }}
      />
    </div>
  )
}

const Stat = ({ label, value, color }) => (
  <div className="text-center">
    <div className="text-[16px] font-semibold" style={{ color }}>{value}</div>
    <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mt-0.5">{label}</div>
  </div>
)

const AddStudentModal = ({ open, onClose, onAdded }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', className: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Заполни имя, email и пароль')
    if (form.password.length < 6) return toast.error('Пароль минимум 6 символов')

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/students', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Ученик ${data.student.name} создан`)
        onAdded()
        setForm({ name: '', email: '', password: '', className: '', phone: '' })
      } else {
        toast.error(data.error)
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            onClick={e => e.stopPropagation()}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Новый ученик</h2>
              <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Имя *" value={form.name} onChange={v => setForm({...form, name: v})} />
              <Field label="Email *" value={form.email} onChange={v => setForm({...form, email: v})} />
              <Field label="Пароль *" type="password" value={form.password} onChange={v => setForm({...form, password: v})} />
              <Field label="Класс" value={form.className} onChange={v => setForm({...form, className: v})} />
              <Field label="Телефон" value={form.phone} onChange={v => setForm({...form, phone: v})} />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-6 py-3 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-[14px] font-medium disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Создаю...' : 'Создать'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const Field = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-[12px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[var(--color-bg-soft)] border border-transparent px-4 py-2.5 rounded-xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/30 focus:bg-[var(--color-bg-card)] transition-all text-[14px]"
    />
  </div>
)