'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, BookOpen, Coins, ChevronDown, Clock, CheckCircle2, Loader2 } from 'lucide-react'

const MEDALS = ['🥇', '🥈', '🥉']
const REVIEW = {
  approved: { label: 'отзыв принят', cls: 'text-[var(--color-success)]' },
  pending: { label: 'отзыв на проверке', cls: 'text-[var(--color-warning)]' },
  rejected: { label: 'отзыв на доработке', cls: 'text-[var(--color-danger)]' }
}

export default function LibrarianLeadersPage() {
  const [cls, setCls] = useState('')
  const [sort, setSort] = useState('books')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const token = localStorage.getItem('token')
    const q = new URLSearchParams({ sort })
    if (cls) q.set('class', cls)
    fetch(`/api/librarian/leaders?${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (alive) setData(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [cls, sort])

  const leaders = data?.leaders || []
  const maxBooks = Math.max(1, ...(data?.by_class || []).map(c => c.books))

  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[var(--color-text-primary)] flex items-center gap-2">
            <Trophy className="text-[#f5b301]" /> Лидеры чтения
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            Кто сколько прочитал и что именно закончил. Нажми на ученика, чтобы увидеть его книги.
          </p>
        </div>
        <div className="flex p-1 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] w-fit">
          {[{ k: 'books', l: 'По книгам', i: BookOpen }, { k: 'points', l: 'По монетам', i: Coins }].map(s => {
            const Icon = s.i
            return (
              <button
                key={s.k}
                onClick={() => setSort(s.k)}
                className={`px-3.5 py-2 rounded-lg text-[13px] font-medium flex items-center gap-1.5 ${
                  sort === s.k ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                <Icon size={14} /> {s.l}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        <Chip active={!cls} onClick={() => setCls('')}>Вся школа</Chip>
        {(data?.classes || []).map(c => (
          <Chip key={c} active={cls === c} onClick={() => setCls(c)}>{c} класс</Chip>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Рейтинг — карточки учеников */}
        <div className="lg:col-span-2">
          {loading && !data ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[var(--color-brand)]" /></div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-text-tertiary)] text-[14px]">
              Пока никто не сдал ни одной книги
            </div>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 items-start ${loading ? 'opacity-60' : ''} transition-opacity`}>
              {leaders.map((l, i) => {
                const expanded = open === l.id
                return (
                  <motion.div
                    key={l.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                    className={`relative bg-[var(--color-bg-card)] border rounded-2xl p-5 transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] ${
                      i < 3 ? 'border-[#f5b301]/50' : 'border-[var(--color-border)]'
                    }`}
                  >
                    <div className="absolute top-4 right-4 text-[18px] font-semibold text-[var(--color-text-tertiary)]">
                      {MEDALS[i] || `#${i + 1}`}
                    </div>
                    <div className="flex items-center gap-3 pr-10">
                      <Avatar name={l.name} />
                      <div className="min-w-0">
                        <div className="font-semibold text-[16px] text-[var(--color-text-primary)] truncate">{l.name}</div>
                        <div className="text-[13px] text-[var(--color-text-tertiary)]">{l.class_name || 'без класса'}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-[12px] text-[var(--color-text-secondary)] truncate min-h-[18px]">
                      {l.last_books?.[0] ? <>Последняя: «{l.last_books[0].title}»</> : ' '}
                    </div>
                    <div className="mt-3 pt-3 border-t border-[var(--color-border)] grid grid-cols-3 text-center">
                      <Stat value={l.books} label="книг" color="var(--color-brand)" strong={sort === 'books'} />
                      <Stat value={l.points} label="монет" color="#d99a00" strong={sort === 'points'} />
                      <Stat value={l.reading_now} label="сейчас" color="var(--color-text-primary)" />
                    </div>
                    <button
                      onClick={() => setOpen(expanded ? null : l.id)}
                      className="mt-3 w-full flex items-center justify-center gap-1 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand)]"
                    >
                      {expanded ? 'Скрыть книги' : 'Что прочитал'}
                      <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 space-y-1.5">
                            {l.last_books.map((b, j) => (
                              <div key={j} className="flex items-center gap-2 text-[13px]">
                                {b.status === 'approved'
                                  ? <CheckCircle2 size={13} className="text-[var(--color-success)] shrink-0" />
                                  : <BookOpen size={13} className="text-[var(--color-text-tertiary)] shrink-0" />}
                                <span className="text-[var(--color-text-primary)] truncate">«{b.title}»</span>
                                <span className="ml-auto text-[11px] text-[var(--color-text-tertiary)] shrink-0">
                                  {b.at ? new Date(b.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}
                                </span>
                              </div>
                            ))}
                            {l.books > l.last_books.length && (
                              <div className="text-[12px] text-[var(--color-text-tertiary)]">…и ещё {l.books - l.last_books.length}</div>
                            )}
                            <Link href={`/librarian/students/${l.id}`} className="inline-block pt-1 text-[12px] font-semibold text-[var(--color-brand)]">
                              Карточка ученика →
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Недавно закончили */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
              <Clock size={16} className="text-[var(--color-brand)]" /> Недавно закончили
            </h3>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mb-3">Последние сданные книги</p>
            <div className="space-y-2.5">
              {(data?.recent || []).length === 0 && (
                <div className="text-[13px] text-[var(--color-text-tertiary)] py-4 text-center">Пока пусто</div>
              )}
              {(data?.recent || []).map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-8 h-11 rounded-md bg-[var(--color-bg-soft)] overflow-hidden shrink-0">
                    {r.cover_url && <img src={r.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{r.student_name}</div>
                    <div className="text-[12px] text-[var(--color-text-secondary)] truncate">«{r.title}»</div>
                    <div className="text-[11px] text-[var(--color-text-tertiary)]">
                      {r.class_name ? `${r.class_name} кл. · ` : ''}
                      {r.returned_at ? new Date(r.returned_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}
                      {r.review_status && <span className={` ${REVIEW[r.review_status]?.cls}`}> · {REVIEW[r.review_status]?.label}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Классы */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-1">Соревнование классов</h3>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mb-4">Сколько книг сдал каждый класс</p>
            <div className="space-y-3">
              {(data?.by_class || []).map((c, i) => (
                <button key={c.class_name} onClick={() => setCls(c.class_name)} className="block w-full text-left">
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="font-medium text-[var(--color-text-primary)]">{MEDALS[i] || ''} {c.class_name} класс</span>
                    <span className="text-[var(--color-text-tertiary)]">{c.books} книг · {c.per_student} на ученика</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.books / maxBooks) * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                      className="h-full rounded-full bg-[var(--color-brand)]"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label, color, strong }) {
  return (
    <div>
      <div className={`text-[22px] font-semibold leading-none tabular-nums ${strong ? 'scale-110' : ''} transition-transform`} style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mt-1.5">{label}</div>
    </div>
  )
}

const AVATAR_COLORS = ['#2f5bea', '#ff6b6b', '#20b486', '#ff9f1c', '#8b5cf6', '#0ea5e9', '#e0457b']

function Avatar({ name = '?' }) {
  const color = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
  return (
    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[18px] font-semibold shrink-0" style={{ background: color }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
      }`}
    >
      {children}
    </button>
  )
}
