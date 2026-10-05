'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Search, UserPlus, Mail, X, User, AlertTriangle, BookOpen, Check
} from 'lucide-react'

export default function StudentsPage() {
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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [classFilter])

  useEffect(() => {
    const t = setTimeout(fetchStudents, 300)
    return () => clearTimeout(t)
  }, [search])

  const classes = [...new Set(students.map(s => s.class_name).filter(Boolean))].sort()

  return (
    <div className="max-w-[1400px] mx-auto">

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
            <span className="text-gradient-gold">Ученики</span>
          </h1>
          <p className="text-[#94a3b8]">{students.length} зарегистрировано в библиотеке</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-[#e8b94e]/30 transition-all"
        >
          <UserPlus size={16} /> Добавить ученика
        </button>
      </div>

      {/* Search + class filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6383]" />
          <input
            type="text"
            placeholder="Поиск по имени, email или классу..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#11141f] border border-white/10 pl-12 pr-4 py-3 rounded-xl text-white placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/40"
          />
        </div>
        {classes.length > 0 && (
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="bg-[#11141f] border border-white/10 px-4 py-3 rounded-xl text-white outline-none cursor-pointer"
          >
            <option value="">Все классы</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 bg-[#11141f] border border-dashed border-white/10 rounded-2xl">
          <p className="text-[#5a6383]">Нет учеников</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-[#11141f] border border-white/5 rounded-2xl p-4 hover:border-[#e8b94e]/30 transition-all group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#60a5fa] to-[#1a56db] flex items-center justify-center font-bold text-white shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{s.name}</div>
                  <div className="text-xs text-[#5a6383] truncate">{s.class_name || '—'}</div>
                </div>
              </div>

              <div className="text-xs text-[#5a6383] mb-3 truncate">{s.email}</div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                <Stat label="Всего" value={s.total_borrows} color="#e8b94e" />
                <Stat label="Сейчас" value={s.currently_holding} color="#4ecdc4" />
                <Stat
                  label="Долги"
                  value={s.overdue_count}
                  color={s.overdue_count > 0 ? '#ff5d8f' : '#5a6383'}
                />
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
    <div className="text-lg font-bold" style={{ color }}>{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-[#5a6383] font-bold">{label}</div>
  </div>
)

const AddStudentModal = ({ open, onClose, onAdded }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', className: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      return toast.error('Заполни имя, email и пароль')
    }
    if (form.password.length < 6) {
      return toast.error('Пароль минимум 6 символов')
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/students', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="bg-[#11141f] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-xl">Новый ученик</h2>
              <button onClick={onClose} className="text-[#5a6383] hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Имя *" value={form.name} onChange={v => setForm({...form, name: v})} placeholder="Айдана Сатпаева" />
              <Field label="Email *" value={form.email} onChange={v => setForm({...form, email: v})} placeholder="student@school.kz" />
              <Field label="Пароль *" type="password" value={form.password} onChange={v => setForm({...form, password: v})} placeholder="Минимум 6 символов" />
              <Field label="Класс" value={form.className} onChange={v => setForm({...form, className: v})} placeholder="10-А" />
              <Field label="Телефон" value={form.phone} onChange={v => setForm({...form, phone: v})} placeholder="+7 (___) ___ ____" />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold disabled:opacity-50"
            >
              {submitting ? 'Создаю...' : 'Создать ученика'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const Field = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-xs text-[#5a6383] uppercase tracking-wider font-bold mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0a0c17] border border-white/10 px-4 py-2.5 rounded-xl text-white placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/40"
    />
  </div>
)