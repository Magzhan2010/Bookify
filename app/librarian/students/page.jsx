'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AddStudentsModal from '../../../components/librarian/AddStudentsModal'
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
  // /librarian/students?add=1 — сразу открыть окно добавления (кнопка на дашборде)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('add') === '1') setShowAddModal(true)
  }, [])
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
          <UserPlus size={14} /> Добавить учеников
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

      <AddStudentsModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        classes={classes}
        onAdded={() => fetchStudents()}
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
