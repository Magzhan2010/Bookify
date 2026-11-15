'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, Star, CheckCircle2, XCircle } from 'lucide-react'
import { countWords } from '../lib/reviewRules'

/**
 * История отзывов: «Сдали» (одобренные) или «Отклонённые».
 * Отклонённый отзыв, который ученик переписал, снова попадает «На проверке».
 */
const fmt = d => d ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export default function ReviewHistory({ status }) {
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    setRows(null)
    try {
      const res = await fetch(`/api/librarian/reviews?status=${status}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setRows(res.ok ? await res.json() : [])
    } catch {
      setRows([])
    }
  }, [status])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!rows) return []
    if (!s) return rows
    return rows.filter(r =>
      [r.student_name, r.student_class, r.book_title, r.book_author, r.reviewer_name]
        .some(v => String(v || '').toLowerCase().includes(s)))
  }, [rows, q])

  const approved = status === 'approved'

  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Ученик, класс или книга"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent focus:border-[var(--color-brand)]/40 focus:bg-[var(--color-bg-card)] outline-none text-[14px] transition-colors"
        />
      </div>

      {!rows ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-[68px] rounded-2xl bg-[var(--color-bg-soft)] animate-pulse" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[var(--color-border-strong)] py-14 text-center text-[14px] text-[var(--color-text-tertiary)]">
          {q ? 'Никого не нашли' : approved ? 'Одобренных отзывов пока нет' : 'Отклонённых отзывов нет'}
        </div>
      ) : (
        <>
          <div className="text-[12px] text-[var(--color-text-tertiary)] mb-2">
            {shown.length} {approved ? 'сдано' : 'отклонено'}{!approved && ' · если ученик перепишет, отзыв снова будет на проверке'}
          </div>
          <ul className="rounded-[22px] bg-[var(--color-bg-card)] border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden">
            {shown.map(r => {
              const isOpen = open === r.id
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setOpen(isOpen ? null : r.id)}
                    className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-[var(--color-bg-soft)]/60 transition-colors"
                  >
                    {approved
                      ? <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0" />
                      : <XCircle size={18} className="text-[var(--color-danger)] shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold truncate">
                        {r.student_name}
                        {r.student_class && <span className="ml-1.5 font-normal text-[var(--color-text-tertiary)]">{r.student_class} класс</span>}
                      </div>
                      <div className="text-[13px] text-[var(--color-text-secondary)] truncate">
                        {r.book_title}{r.book_author ? ` — ${r.book_author}` : ''}
                      </div>
                    </div>
                    <div className="hidden sm:block text-right shrink-0">
                      <div className="text-[12px] text-[var(--color-text-secondary)] tabular-nums">{fmt(r.reviewed_at || r.created_at)}</div>
                      {r.reviewer_name && <div className="text-[11px] text-[var(--color-text-tertiary)]">проверил(а) {r.reviewer_name}</div>}
                    </div>
                    <ChevronDown size={16} className={`shrink-0 text-[var(--color-text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-5 pb-4 pl-[46px] sm:pl-[52px] space-y-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--color-text-tertiary)]">
                            <span className="inline-flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} size={12} className={n <= r.rating ? 'fill-[#ffc93c] text-[#ffc93c]' : 'text-[var(--color-border-strong)]'} />
                              ))}
                            </span>
                            <span>{countWords(r.content)} слов</span>
                            <span>сдан {fmt(r.created_at)}</span>
                            <span className="sm:hidden">{r.reviewer_name ? `проверил(а) ${r.reviewer_name}` : ''}</span>
                          </div>
                          {!approved && r.review_note && (
                            <div className="rounded-xl px-3.5 py-2.5 bg-[var(--color-danger)]/10 text-[13px]">
                              <span className="font-semibold text-[var(--color-danger)]">Причина: </span>{r.review_note}
                            </div>
                          )}
                          <p className="text-[14px] leading-relaxed whitespace-pre-line text-[var(--color-text-primary)]">{r.content}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
