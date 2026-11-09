'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Users, BookOpen, MessageSquareText, Coins, AlertTriangle, Search, Lightbulb, Trash2, Clock } from 'lucide-react'
import { Button, Skeleton } from '../../../components/ui'
import UserAvatar from '../../../components/UserAvatar'

/**
 * Кабинет учителя: как читает класс и советы книг ученикам.
 */
async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) { const e = new Error(d.error || 'Ошибка'); e.status = res.status; throw e }
  return d
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40'

export default function TeacherPage() {
  const [cls, setCls] = useState('')
  const [data, setData] = useState(null)
  const [denied, setDenied] = useState('')

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/teacher/class${cls ? `?class=${encodeURIComponent(cls)}` : ''}`)
      setData(d); if (!cls && d.class_name) setCls(d.class_name)
    } catch (e) {
      if (e.status === 403) setDenied(e.message); else toast.error(e.message)
    }
  }, [cls])
  useEffect(() => { load() }, [load])

  if (denied) {
    return (
      <main className="max-w-[640px] mx-auto px-4 py-20 text-center">
        <div className="text-[48px] mb-3">🧑‍🏫</div>
        <h1 className="text-[24px] font-bold text-[var(--color-text-primary)]">Кабинет учителя</h1>
        <p className="text-[15px] text-[var(--color-text-secondary)] mt-2">{denied}</p>
        <p className="text-[13px] text-[var(--color-text-tertiary)] mt-4">А пока можно брать книги в каталоге, как обычно.</p>
        <Link href="/library" className="inline-block mt-6 px-5 py-2.5 rounded-full bg-[var(--color-brand)] text-white text-[14px] font-medium">В каталог</Link>
      </main>
    )
  }

  const s = data?.summary
  return (
    <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e4ec6]">Кабинет учителя</div>
          <h1 className="text-[30px] sm:text-[36px] font-extrabold tracking-tight text-[var(--color-text-primary)]">
            {data?.class_name ? `${data.class_name} класс` : 'Мой класс'}
          </h1>
        </div>
        {data?.classes?.length > 0 && (
          <select value={cls} onChange={e => setCls(e.target.value)} className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)]" aria-label="Класс">
            <option value="">Выбери класс</option>
            {data.classes.map(c => <option key={c} value={c}>{c} класс</option>)}
          </select>
        )}
      </div>

      {!data ? <Skeleton className="h-64 rounded-3xl" /> : !data.class_name ? (
        <p className="text-[15px] text-[var(--color-text-secondary)] py-10 text-center border border-dashed border-[var(--color-border)] rounded-3xl">Выберите класс сверху.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Tile icon={Users} label="Учеников" value={s.students} />
            <Tile icon={BookOpen} label="Читают сейчас" value={s.reading} />
            <Tile icon={BookOpen} label="Прочитано книг" value={s.finished} />
            <Tile icon={MessageSquareText} label="Отзывов" value={s.reviews} />
            <Tile icon={Coins} label="Монет за месяц" value={s.coins_month} />
          </section>
          {s.idle > 0 && (
            <p className="mb-5 text-[13px] text-[#b86e00] bg-[#ff9500]/10 rounded-2xl px-4 py-3">
              {s.idle} учеников ещё не взяли ни одной книги — можно посоветовать им что-нибудь ниже.
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
            {data.students.map((st, i) => {
              const idle = st.reading === 0 && st.finished === 0
              return (
                <motion.div key={st.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.02 }}
                  className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <UserAvatar src={st.avatar_url} name={st.name} className="w-10 h-10 rounded-full bg-[var(--color-brand)] text-white font-semibold text-[14px]" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[14px] truncate text-[var(--color-text-primary)]">{st.name}</div>
                      <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
                        {st.current_book ? `📖 ${st.current_book}` : idle ? 'Пока не читает' : 'Сейчас без книги'}
                      </div>
                    </div>
                    {st.overdue > 0 && <span title="Просрочена книга" className="text-[var(--color-danger)]"><Clock size={16} /></span>}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                    <Mini v={st.finished} l="книг" />
                    <Mini v={st.reviews} l="отзывов" />
                    <Mini v={st.coins_month} l="монет/мес" gold />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      <Recommend classes={data?.classes || []} defaultClass={data?.class_name || ''} />
    </main>
  )
}

function Tile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)]">
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)]"><Icon size={13} /> {label}</div>
      <div className="text-[26px] font-bold tabular-nums text-[var(--color-text-primary)] mt-1">{value ?? 0}</div>
    </div>
  )
}

function Mini({ v, l, gold }) {
  return (
    <div className="rounded-xl bg-[var(--color-bg-soft)] py-1.5">
      <div className={`text-[16px] font-bold tabular-nums ${gold ? 'text-[#c98a12]' : 'text-[var(--color-text-primary)]'}`}>{v}</div>
      <div className="text-[10px] text-[var(--color-text-tertiary)]">{l}</div>
    </div>
  )
}

function Recommend({ classes, defaultClass }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState([])
  const [book, setBook] = useState(null)
  const [cls, setCls] = useState(defaultClass)
  const [note, setNote] = useState('')
  const [mine, setMine] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { setCls(defaultClass) }, [defaultClass])
  const loadMine = useCallback(() => api('/api/teacher/recommendations').then(setMine).catch(() => {}), [])
  useEffect(() => { loadMine() }, [loadMine])

  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return }
    const t = setTimeout(() => api(`/api/books/search?q=${encodeURIComponent(q.trim())}`).then(d => setFound(Array.isArray(d) ? d : d.books || [])).catch(() => setFound([])), 250)
    return () => clearTimeout(t)
  }, [q])

  const send = async () => {
    if (!book) return toast.error('Выберите книгу')
    setSaving(true)
    try {
      const r = await api('/api/teacher/recommendations', 'POST', { bookId: book.id, className: cls, note })
      toast.success(`Совет отправлен ${r.notified} ученикам`)
      setBook(null); setQ(''); setNote(''); loadMine()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const remove = async r => {
    try { await api(`/api/teacher/recommendations/${r.id}`, 'DELETE'); loadMine() } catch (e) { toast.error(e.message) }
  }

  return (
    <section className="rounded-3xl p-5 sm:p-6 bg-[var(--color-bg-card)] border border-[var(--color-border)]">
      <h2 className="text-[18px] font-bold flex items-center gap-2 text-[var(--color-text-primary)]"><Lightbulb size={18} className="text-[#8e4ec6]" /> Посоветовать книгу</h2>
      <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1">Ученики получат уведомление, а книга появится в каталоге в блоке «Советует учитель».</p>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div>
          {book ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-bg-soft)]">
              <div className="w-10 aspect-[2/3] rounded overflow-hidden bg-[var(--color-bg-card)] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {book.cover_url && <img src={book.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold truncate text-[var(--color-text-primary)]">{book.title}</div>
                <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">{book.author}</div>
              </div>
              <button onClick={() => setBook(null)} className="text-[12px] text-[var(--color-brand)]">Другая</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Найти книгу в каталоге" className={`${inputCls} pl-9`} />
              </div>
              <div className="mt-2 max-h-56 overflow-y-auto">
                {found.map(b => (
                  <button key={b.id} onClick={() => setBook(b)} className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--color-bg-soft)]">
                    <BookOpen size={14} className="text-[var(--color-text-tertiary)] shrink-0" />
                    <span className="text-[13px] truncate text-[var(--color-text-primary)]">{b.title} <span className="text-[var(--color-text-tertiary)]">· {b.author}</span></span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="space-y-3">
          <select value={cls} onChange={e => setCls(e.target.value)} className={inputCls} aria-label="Кому">
            <option value="">Всей школе</option>
            {classes.map(c => <option key={c} value={c}>{c} класс</option>)}
          </select>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Почему стоит прочитать (необязательно)" className={`${inputCls} resize-y`} />
          <Button icon={Lightbulb} loading={saving} onClick={send} disabled={!book}>Посоветовать</Button>
        </div>
      </div>

      {mine.length > 0 && (
        <div className="mt-6">
          <div className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">Мои советы</div>
          <div className="divide-y divide-[var(--color-border)]">
            {mine.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-2.5">
                <BookOpen size={14} className="text-[var(--color-text-tertiary)]" />
                <div className="min-w-0 flex-1 text-[13px] text-[var(--color-text-primary)] truncate">
                  {r.title} <span className="text-[var(--color-text-tertiary)]">· {r.class_name ? `${r.class_name} класс` : 'вся школа'}</span>
                </div>
                <button onClick={() => remove(r)} aria-label="Убрать совет" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
