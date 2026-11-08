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
        {/* Рейтинг */}
        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5">
          {loading && !data ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[var(--color-brand)]" /></div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-tertiary)] text-[14px]">Пока никто не сдал ни одной книги</div>
          ) : (
            <div className={`space-y-1.5 ${loading ? 'opacity-60' : ''} transition-opacity`}>
              {leaders.map((l, i) => {
                const expanded = open === l.id
                return (
                  <div key={l.id} className={`rounded-xl border ${i < 3 ? 'border-[#f5b301]/40 bg-[#f5b301]/5' : 'border-[var(--color-border)]'}`}>
                    <button
                      onClick={() => setOpen(expanded ? null : l.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <div className="w-8 text-center text-[16px] font-bold text-[var(--color-text-tertiary)] shrink-0">
                        {MEDALS[i] || i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[14px] text-[var(--color-text-primary)] truncate">{l.name}</div>
                        <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
                          {l.class_name ? `${l.class_name} класс` : 'без класса'}
                          {l.last_books?.[0] && <> · последняя: «{l.last_books[0].title}»</>}
                          {l.reading_now > 0 && <> · читает сейчас: {l.reading_now}</>}
                        </div>
                      </div>
                      <Stat value={l.books} label="книг" strong={sort === 'books'} />
                      <Stat value={l.points} label="монет" strong={sort === 'points'} />
                      <ChevronDown size={16} className={`text-[var(--color-text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pl-14 space-y-1">
                            {l.last_books.map((b, j) => (
                              <div key={j} className="flex items-center gap-2 text-[13px]">
                                {b.status === 'approved'
                                  ? <CheckCircle2 size={13} className="text-[var(--color-success)] shrink-0" />
                                  : <BookOpen size={13} className="text-[var(--color-text-tertiary)] shrink-0" />}
                                <span className="text-[var(--color-text-primary)] truncate">«{b.title}»</span>
                                <span className="text-[var(--color-text-tertiary)] truncate hidden sm:inline">{b.author}</span>
                                <span className="ml-auto text-[11px] text-[var(--color-text-tertiary)] shrink-0">
                                  {b.at ? new Date(b.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}
                                </span>
                              </div>
                            ))}
                            {l.books > l.last_books.length && (
                              <div className="text-[12px] text-[var(--color-text-tertiary)]">…и ещё {l.books - l.last_books.length}</div>
                            )}
                            <Link href={`/librarian/students/${l.id}`} className="inline-block mt-1 text-[12px] font-semibold text-[var(--color-brand)]">
                              Карточка ученика →
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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

function Stat({ value, label, strong }) {
  return (
    <div className="text-center w-14 shrink-0">
      <div className={`text-[17px] font-bold leading-none ${strong ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-primary)]'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mt-0.5">{label}</div>
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
