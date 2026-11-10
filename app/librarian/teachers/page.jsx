'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, X, Search, GraduationCap, UserMinus, School } from 'lucide-react'
import { Button, Modal, Skeleton } from '../../../components/ui'
import UserAvatar from '../../../components/UserAvatar'
import SchoolTeachersImport from '../../../components/librarian/SchoolTeachersImport'

/**
 * Учителя: заявки (учитель отметил «Я учитель» при регистрации), список учителей,
 * перевод ученика в учителя. Учитель читает книги, видит свой класс и советует книги,
 * но в игре (монеты, лидеры) не участвует.
 */
const inputCls = 'px-3 py-2 rounded-xl bg-[var(--color-bg-soft)] border border-transparent text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40'

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(d.error || 'Ошибка')
  return d
}

export default function TeachersPage() {
  const [data, setData] = useState(null)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    try { setData(await api('/api/librarian/teachers')) } catch (e) { toast.error(e.message); setData({ pending: [], teachers: [] }) }
  }, [])
  useEffect(() => { load() }, [load])

  const act = async (t, body, msg) => {
    try { await api(`/api/librarian/teachers/${t.id}`, 'PATCH', body); toast.success(msg); load() } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">Учителя</h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] mt-1 max-w-2xl">
            Учитель участвует наравне с учениками: берёт книги, пишет отзывы, получает монеты и призы. Плюс видит, как читает любой класс, и советует книги. Классный руководитель — по желанию.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={School} onClick={() => setImporting(true)}>Из школьной базы</Button>
          <Button variant="secondary" icon={GraduationCap} onClick={() => setAdding(true)}>Сделать учителем</Button>
        </div>
      </div>
      <SchoolTeachersImport open={importing} onClose={() => setImporting(false)} onDone={load} />

      {!data ? <Skeleton className="h-40 rounded-2xl" /> : (
        <>
          {data.pending.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[15px] font-semibold mb-3 text-[var(--color-text-primary)]">Ждут подтверждения <span className="text-[var(--color-danger)]">{data.pending.length}</span></h2>
              <div className="space-y-2">
                {data.pending.map(t => <PendingRow key={t.id} t={t} onAct={act} />)}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-[15px] font-semibold mb-3 text-[var(--color-text-primary)]">Учителя <span className="text-[var(--color-text-tertiary)] font-normal">{data.teachers.length}</span></h2>
            {data.teachers.length === 0 ? (
              <p className="text-[14px] text-[var(--color-text-tertiary)] py-10 text-center border border-dashed border-[var(--color-border)] rounded-2xl">Пока нет учителей</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.teachers.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                      <UserAvatar src={t.avatar_url} name={t.name} className="w-11 h-11 rounded-full bg-[#8e4ec6] text-white font-semibold" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[14px] truncate text-[var(--color-text-primary)]">{t.name}</div>
                        <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">{t.email}</div>
                      </div>
                    </div>
                    <ClassEdit t={t} onSave={cls => act(t, { className: cls }, 'Класс сохранён')} />
                    <div className="flex items-center justify-between mt-3 text-[12px] text-[var(--color-text-tertiary)]">
                      <span>Книг взял: {t.borrows} · советов: {t.recommendations}</span>
                      <button onClick={() => confirm(`Сделать ${t.name} обычным читателем?`) && act(t, { action: 'demote' }, 'Готово')}
                        className="flex items-center gap-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)]" title="Убрать роль учителя">
                        <UserMinus size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <AddTeacher open={adding} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load() }} />
    </div>
  )
}

function PendingRow({ t, onAct }) {
  const [cls, setCls] = useState(t.class_name || '')
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[#c98a12]/40">
      <UserAvatar src={t.avatar_url} name={t.name} className="w-10 h-10 rounded-full bg-[#8e4ec6] text-white font-semibold" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[14px] text-[var(--color-text-primary)]">{t.name}</div>
        <div className="text-[12px] text-[var(--color-text-tertiary)]">{t.email} · зарегистрировался {new Date(t.created_at).toLocaleDateString('ru-RU')}</div>
      </div>
      <input value={cls} onChange={e => setCls(e.target.value)} placeholder="Класс (рук-ль)" className={`${inputCls} w-36`} />
      <Button size="sm" icon={Check} onClick={() => onAct(t, { action: 'approve', className: cls }, 'Учитель подтверждён')}>Подтвердить</Button>
      <Button size="sm" variant="ghost" icon={X} onClick={() => onAct(t, { action: 'reject' }, 'Заявка отклонена — это обычный читатель')}>Отклонить</Button>
    </div>
  )
}

function ClassEdit({ t, onSave }) {
  const [cls, setCls] = useState(t.class_name || '')
  const changed = cls !== (t.class_name || '')
  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-[12px] text-[var(--color-text-secondary)] shrink-0">Классный руководитель (необязательно):</span>
      <input value={cls} onChange={e => setCls(e.target.value)} placeholder="—" className={`${inputCls} flex-1 min-w-0`} />
      {changed && <Button size="sm" onClick={() => onSave(cls)}>OK</Button>}
    </div>
  )
}

function AddTeacher({ open, onClose, onDone }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState([])

  useEffect(() => {
    if (!open || q.trim().length < 2) { setFound([]); return }
    const t = setTimeout(async () => {
      try { setFound(await api(`/api/librarian/students?q=${encodeURIComponent(q.trim())}`)) } catch { setFound([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [q, open])

  const make = async s => {
    try { await api('/api/librarian/teachers', 'POST', { userId: s.id }); toast.success(`${s.name} теперь учитель`); setQ(''); onDone() } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Сделать учителем" description="Найдите учителя, который зарегистрировался как ученик.">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Имя или email" className={`${inputCls} w-full pl-9 py-2.5 text-[14px]`} />
      </div>
      <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-[var(--color-border)]">
        {found.slice(0, 20).map(s => (
          <div key={s.id} className="flex items-center gap-3 py-2.5">
            <UserAvatar src={s.avatar_url} name={s.name} className="w-9 h-9 rounded-full bg-[var(--color-brand)] text-white font-semibold text-[13px]" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium truncate text-[var(--color-text-primary)]">{s.name}</div>
              <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">{s.email}{s.class_name ? ` · ${s.class_name}` : ''}</div>
            </div>
            <Button size="sm" onClick={() => make(s)}>Учитель</Button>
          </div>
        ))}
        {q.trim().length >= 2 && found.length === 0 && <p className="text-[13px] text-[var(--color-text-tertiary)] py-4">Никого не нашли</p>}
      </div>
    </Modal>
  )
}
