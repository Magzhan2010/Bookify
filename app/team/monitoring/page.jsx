'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Search, BookOpenCheck, MessageSquareOff, MessageSquareText, Mic, Video, Coins, Users, ChevronDown, Plus
} from 'lucide-react'
import { Button, Modal, Skeleton, EmptyState } from '../../../components/ui'
import { PageHeader, Segmented, Stat, Avatar, Field, inputCls, timeAgo, api } from '../../../components/team/ui'

export default function MonitoringPage() {
  return (
    <Suspense fallback={null}>
      <Monitoring />
    </Suspense>
  )
}

const FILTERS = [
  { value: 'all', label: 'Все', test: () => true },
  { value: 'missing', label: 'Нет отзыва', test: s => s.reviews_missing > 0 },
  { value: 'pending', label: 'Отзыв на проверке', test: s => s.reviews_pending > 0 },
  { value: 'tedx', label: 'TEDx', test: s => s.tedx > 0 },
  { value: 'video', label: 'Видео', test: s => s.videos > 0 },
  { value: 'idle', label: 'Ещё не читали', test: s => s.borrowed === 0 }
]

function Monitoring() {
  const params = useSearchParams()
  const [data, setData] = useState(null)
  const [cls, setCls] = useState('')
  const [filter, setFilter] = useState(FILTERS.some(f => f.value === params.get('filter')) ? params.get('filter') : 'all')
  const [q, setQ] = useState('')
  const [award, setAward] = useState(null) // { student, kind }

  const load = useCallback(async () => {
    try { setData(await api(`/api/team/monitoring${cls ? `?class=${encodeURIComponent(cls)}` : ''}`)) }
    catch (e) { toast.error(e.message); setData({ summary: {}, classes: [], students: [] }) }
  }, [cls])
  useEffect(() => { load() }, [load])

  const students = data?.students || []
  const shown = useMemo(() => {
    const f = FILTERS.find(x => x.value === filter) || FILTERS[0]
    const needle = q.trim().toLowerCase()
    return students.filter(s => f.test(s) && (!needle || s.name.toLowerCase().includes(needle)))
  }, [students, filter, q])

  const s = data?.summary || {}

  return (
    <div>
      <PageHeader
        eyebrow="Ученики"
        title="Мониторинг"
        subtitle="Кто читает, кто сдал книгу без отзыва, кто выступил на TEDx или снял видео."
      />

      {!data ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[92px] rounded-[20px]" />)}</div>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <Stat i={0} icon={Users} label="Учеников" value={s.students} hint={`${s.reading || 0} читают сейчас`} />
            <Stat i={1} icon={BookOpenCheck} label="Сдано книг" value={s.finished_books} />
            <Stat i={2} icon={MessageSquareText} label="Отзывов написано" value={s.reviews_written} />
            <Stat i={3} icon={MessageSquareOff} label="Книг без отзыва" value={s.reviews_missing}
              hint={`у ${s.students_missing || 0} учеников`} tone={s.reviews_missing > 0 ? 'danger' : undefined} />
            <Stat i={4} icon={Mic} label="TEDx / видео" value={`${s.tedx || 0} / ${s.videos || 0}`} hint={`${s.tedx_students || 0} выступили`} />
          </section>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={FILTERS.map(f => ({ value: f.value, label: f.label, count: students.filter(f.test).length }))}
            />
            <div className="flex gap-2 lg:ml-auto">
              <select value={cls} onChange={e => setCls(e.target.value)} className={`${inputCls} !w-auto !py-2`} aria-label="Класс">
                <option value="">Все классы</option>
                {data.classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск" className={`${inputCls} !py-2 pl-9 w-44`} />
              </div>
            </div>
          </div>

          {shown.length === 0 ? (
            <EmptyState title="Никого не нашли" description="Попробуй другой фильтр или класс." />
          ) : (
            <motion.div layout className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <AnimatePresence initial={false}>
                {shown.map((st, i) => (
                  <StudentCard key={st.id} s={st} i={i} onAward={kind => setAward({ student: st, kind })} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}

      <AwardModal award={award} onClose={() => setAward(null)} onDone={() => { setAward(null); load() }} />
    </div>
  )
}

function StudentCard({ s, i, onAward }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.25 }}
      className="rounded-[20px] bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 flex flex-col"
    >
      <div className="flex items-center gap-3">
        <Avatar name={s.name} src={s.avatar_url} size={40} />
        <div className="min-w-0 flex-1">
          <Link href={`/team/students/${s.id}`} className="text-[14px] font-semibold truncate block hover:text-[var(--color-brand)]">{s.name}</Link>
          <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
            {s.class_name || 'Без класса'}{s.last_activity ? ` · ${timeAgo(s.last_activity)}` : ''}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-[#c97a00]" title="Монет заработано">
          <Coins size={14} /> {s.earned}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mt-4">
        <Cell label="прочитано" value={s.finished} />
        <Cell label="отзывов" value={s.reviews_approved + s.reviews_pending} sub={s.reviews_pending ? `${s.reviews_pending} ждёт` : null} />
        <Cell label="TEDx" value={s.tedx} good={s.tedx > 0} />
        <Cell label="видео" value={s.videos} good={s.videos > 0} />
      </div>

      {s.reviews_missing > 0 && (
        <div className="mt-3">
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--color-danger)]/[0.07] text-[var(--color-danger)] text-[12px] font-medium">
            <span className="flex items-center gap-1.5"><MessageSquareOff size={13} /> Без отзыва: {s.reviews_missing}</span>
            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden text-[12px] text-[var(--color-text-secondary)]">
                {s.missing_books.map(b => (
                  <li key={b.borrow_id} className="flex justify-between gap-2 px-3 pt-2">
                    <span className="truncate">{b.title}</span>
                    {b.returned_at && <span className="text-[var(--color-text-tertiary)] shrink-0">{timeAgo(b.returned_at)}</span>}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-4">
        <button onClick={() => onAward('tedx')} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--color-bg-soft)] text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] apple-press">
          <Plus size={12} /><Mic size={13} /> TEDx
        </button>
        <button onClick={() => onAward('video')} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--color-bg-soft)] text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] apple-press">
          <Plus size={12} /><Video size={13} /> Видео
        </button>
      </div>
    </motion.div>
  )
}

function Cell({ label, value, sub, good }) {
  return (
    <div className="rounded-xl bg-[var(--color-bg-soft)] py-2 text-center">
      <div className={`text-[16px] font-semibold tabular-nums ${good ? 'text-[var(--color-success)]' : ''}`}>{value}</div>
      <div className="text-[10px] text-[var(--color-text-tertiary)] leading-tight">{sub || label}</div>
    </div>
  )
}

function AwardModal({ award, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (award) setNote('') }, [award])

  const isTedx = award?.kind === 'tedx'
  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api('/api/team/monitoring', { method: 'POST', body: { userId: award.student.id, kind: award.kind, note } })
      toast.success(`${award.student.name}: +${res.points} монет`)
      onDone()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  return (
    <Modal
      open={!!award}
      onClose={onClose}
      title={isTedx ? 'Выступление на TEDx' : 'Видео о книге'}
      description={award ? `${award.student.name} получит ${isTedx ? 15 : 10} монет по правилам программы.` : ''}
      size="sm"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={isTedx ? 'Тема или дата выступления' : 'О какой книге / ссылка'} hint="Необязательно">
          <input value={note} onChange={e => setNote(e.target.value)} className={inputCls} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={saving}>Отметить</Button>
        </div>
      </form>
    </Modal>
  )
}
