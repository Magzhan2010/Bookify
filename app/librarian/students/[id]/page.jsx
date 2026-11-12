'use client'

import { motion } from 'framer-motion'
import UserAvatar from '../../../../components/UserAvatar'
import ExtendDue from '../../../../components/librarian/ExtendDue'
import DeleteStudent from '../../../../components/librarian/DeleteStudent'
import AddTrophy from '../../../../components/librarian/AddTrophy'
import { TROPHY_NOTE } from '../../../../lib/trophy'
import Achievements from '../../../../components/game/Achievements'
import StudentCoins from '../../../../components/librarian/StudentCoins'
import StudentCredentials from '../../../../components/librarian/StudentCredentials'
import { useTeamMe } from '../../../../lib/useTeamMe'
import { parseJwt } from '../../../../lib/jwt'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useArea } from '../../../../lib/useArea'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, KeyRound, Trash2, BookOpen, Heart,
  Calendar, Phone, User, Loader2, X
} from 'lucide-react'

export default function StudentDetailPage() {
  const router = useRouter()
  const { team, base } = useArea()
  const { id } = useParams()
  const credsMe = useTeamMe()
  const [canSeeCreds, setCanSeeCreds] = useState(false)
  useEffect(() => {
    setCanSeeCreds(parseJwt(localStorage.getItem('token') || '')?.role === 'librarian' || !!credsMe?.is_lead)
  }, [credsMe])

  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [stats, setStats] = useState(null)

  const [form, setForm] = useState({
    name: '', className: '', phone: ''
  })
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      try {
        const res = await fetch(`/api/librarian/students/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) {
          toast.error('Ученик не найден')
          router.push('/library')
          return
        }
        const data = await res.json()
        setStudent(data.user)
        setHistory(data.history || [])
        setFavorites(data.favorites || [])
        setStats(data.stats || null)
        setForm({
          name: data.user.name || '',
          className: data.user.class_name || '',
          phone: data.user.phone || ''
        })
      } catch (e) {
        toast.error('Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleSave = async () => {
    const token = localStorage.getItem('token')
    setSaving(true)
    try {
      const body = {
        name: form.name,
        className: form.className,
        phone: form.phone
      }
      if (newPassword) body.password = newPassword

      const res = await fetch(`/api/librarian/students/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Сохранено')
        setStudent(data.student)
        setNewPassword('')
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (e) {
      toast.error('Ошибка сети')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => setDeleteOpen(true)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-[var(--color-text-secondary)]">Ученик не найден</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => router.push(`${base}/students`)}
        className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Назад к списку
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка — карточка ученика */}
        <div className="lg:col-span-1 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 text-center"
          >
            <UserAvatar src={student.avatar_url} name={student.name} className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-hover)] flex items-center justify-center text-white font-semibold text-3xl mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">{student.name}</h1>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mb-3">{student.email}</p>
            {student.class_name && (
              <span className="inline-block px-2.5 py-1 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-[12px] font-medium">
                {student.class_name}
              </span>
            )}
          </motion.div>

          {/* Статистика */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5"
            >
              <h3 className="text-[13px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mb-3">Статистика</h3>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Всего" value={parseInt(stats.total_borrows) || 0} color="var(--color-brand)" />
                <Stat label="Прочитано" value={parseInt(stats.returned_count) || 0} color="var(--color-success)" />
                <Stat label="Сейчас" value={parseInt(stats.active_count) || 0} color="var(--color-warning)" />
                <Stat label="Жанров" value={parseInt(stats.genres_count) || 0} color="var(--color-text-secondary)" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Правая колонка — форма и история */}
        <div className="lg:col-span-2 space-y-4">
          {/* Форма редактирования */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6"
          >
            <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-4">Редактировать данные</h2>

            <div className="space-y-4">
              <Field label="Имя">
                <input
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Класс">
                  <input
                    value={form.className}
                    onChange={e => setForm({...form, className: e.target.value})}
                    placeholder="9-А"
                    className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
                  />
                </Field>
                <Field label="Телефон">
                  <input
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="+7 (...)"
                    className="w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
                  />
                </Field>
              </div>

              <Field label="Новый пароль (оставь пустым, чтобы не менять)">
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="не менять"
                    className="flex-1 bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 rounded-xl bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-[12px] font-medium"
                  >
                    {showPassword ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
              </Field>
            </div>

            {team ? (
              <p className="mt-5 text-[12px] text-[var(--color-text-tertiary)]">
                Менять данные и пароль ученика может только библиотекарь.
              </p>
            ) : (
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Сохранить
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15 text-[14px] font-medium flex items-center gap-2 transition-colors"
              >
                <Trash2 size={14} /> Удалить
              </button>
            </div>
            )}
          </motion.div>

          {canSeeCreds && <StudentCredentials student={student} />}
          <StudentCoins studentId={student.id} />
          {student.role !== 'teacher' && <Achievements userId={student.id} compact />}

          {/* История книг */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">История чтения ({history.length})</h3>
              <AddTrophy studentId={student.id} onAdded={h => setHistory(hs => [h, ...hs])} />
            </div>
            {history.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-tertiary)] text-center py-6">Пока не брал книг</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--color-bg-soft)]">
                    <div className="w-9 h-12 rounded overflow-hidden shrink-0 bg-[var(--color-bg-card)]">
                      {h.cover_url && <img src={h.cover_url} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{h.title}</div>
                      <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{h.author}{h.own_book ? ' · своя книга' : ''}</div>
                      {(h.status === 'active' || h.status === 'overdue') && h.due_date && (
                        <div className={`text-[11px] mt-0.5 ${new Date(h.due_date) < new Date() ? 'text-[var(--color-danger)] font-semibold' : 'text-[var(--color-text-tertiary)]'}`}>
                          Вернуть до {new Date(h.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                    {(h.status === 'active' || h.status === 'overdue') && !h.own_book && (
                      <ExtendDue
                        loan={{ ...h, student_name: student.name }}
                        onExtended={due => setHistory(hs => hs.map(x => x.id === h.id ? { ...x, due_date: due } : x))}
                      />
                    )}
                    {(() => {
                      const trophy = h.notes === TROPHY_NOTE
                      const [label, cls] = trophy ? ['Трофей', 'bg-[#ffc93c]/25 text-[#9a6b00]']
                        : h.status === 'active' || h.status === 'overdue' ? ['Активна', 'bg-[var(--color-brand)]/15 text-[var(--color-brand)]']
                        : h.status === 'approved' ? ['Прочитано', 'bg-[var(--color-success)]/15 text-[var(--color-success)]']
                        : h.status === 'reviewed' ? ['Отзыв на проверке', 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]']
                        : h.status === 'cancelled' ? ['Без отзыва', 'bg-[var(--color-bg-card)] text-[var(--color-text-tertiary)]']
                        : ['Сдана, нет отзыва', 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]']
                      return (
                        <span className="flex items-center gap-1 shrink-0">
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${cls}`}>{label}</span>
                          {!trophy && ['returned', 'reviewed', 'approved'].includes(h.status) && (
                            <button title={h.status === 'approved' ? 'Убрать с полки и отменить монеты за эту книгу' : 'Закрыть без отзыва — в профиль не попадёт'}
                              onClick={async () => {
                                const msg = h.status === 'approved'
                                  ? `Убрать «${h.title}» с полки ${student.name}? Монеты за эту книгу отменятся. Причина (по желанию):`
                                  : `Закрыть «${h.title}» без отзыва? В профиль ученика книга не попадёт. Причина (по желанию):`
                                const note = window.prompt(msg, '')
                                if (note === null) return
                                const res = await fetch(`/api/librarian/borrows/${h.id}/close`, {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ note })
                                })
                                const d = await res.json()
                                if (!res.ok) return toast.error(d.error || 'Ошибка')
                                toast.success(d.reverted ? `Убрано · −${d.reverted} монет` : 'Закрыто без отзыва')
                                setHistory(hs => hs.map(x => x.id === h.id ? { ...x, status: 'cancelled' } : x))
                              }}
                              className="px-2 h-6 rounded-md text-[11px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">
                              {h.status === 'approved' ? 'Убрать' : 'Без отзыва'}
                            </button>
                          )}
                          {trophy && (
                            <button title="Убрать трофей" onClick={async () => {
                              const res = await fetch(`/api/librarian/students/${student.id}/trophy?borrowId=${h.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
                              if (res.ok) setHistory(hs => hs.filter(x => x.id !== h.id)); else toast.error('Не удалось убрать')
                            }} className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)]">×</button>
                          )}
                        </span>
                      )
                    })()}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <DeleteStudent student={student} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={() => router.push(`${base}/students`)} />
    </div>
  )
}

const Field = ({ label, children }) => (
  <div>
    <label className="block text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium mb-1.5">{label}</label>
    {children}
  </div>
)

const Stat = ({ label, value, color }) => (
  <div>
    <div className="text-xl font-semibold" style={{ color }}>{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mt-0.5">{label}</div>
  </div>
)