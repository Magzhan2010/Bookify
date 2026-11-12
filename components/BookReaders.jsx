'use client'

import { useEffect, useState } from 'react'
import { Users, Video, Mic, ChevronDown } from 'lucide-react'
import UserAvatar from './UserAvatar'
import { TROPHY_NOTE } from '../lib/trophy'

const STATUS = {
  active: ['Читает', 'text-[var(--color-brand)] bg-[var(--color-brand)]/10'],
  returned: ['Ждёт отзыва', 'text-[#9a6b00] bg-[#ffc93c]/25'],
  reviewed: ['Отзыв на проверке', 'text-[var(--color-warning)] bg-[var(--color-warning)]/10'],
  approved: ['Прочитал', 'text-[var(--color-success)] bg-[var(--color-success)]/10'],
  cancelled: ['Убрана (без отзыва)', 'text-[var(--color-text-tertiary)] bg-[var(--color-bg-soft)]']
}
const fmt = d => d ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

/** «Кто читал эту книгу» — для библиотекаря и тимлида, на странице книги. */
export default function BookReaders({ bookId }) {
  const [data, setData] = useState(null)
  const [open, setOpen] = useState({})
  useEffect(() => {
    fetch(`/api/books/${bookId}/readers`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : null)).then(setData).catch(() => {})
  }, [bookId])
  if (!data) return null
  const { summary, items } = data

  return (
    <section className="mt-10 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Users size={18} /> Кто читал эту книгу</h2>
        <div className="flex flex-wrap gap-2 text-[12px]">
          <span className="px-2.5 py-1 rounded-full bg-[var(--color-bg-soft)]">Прочитали: <b>{summary.readers}</b></span>
          <span className="px-2.5 py-1 rounded-full bg-[var(--color-bg-soft)]">Читают: <b>{summary.reading}</b></span>
          <span className="px-2.5 py-1 rounded-full bg-[var(--color-bg-soft)]">Отзывов: <b>{summary.reviews}</b>{summary.avg_rating ? ` · ${summary.avg_rating}★` : ''}</span>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-tertiary)] py-6 text-center">Эту книгу ещё никто не брал</p>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {items.map(it => {
            const [label, cls] = it.notes === TROPHY_NOTE ? ['Трофей (до Bookify)', 'text-[#9a6b00] bg-[#ffc93c]/20'] : (STATUS[it.status] || ['—', ''])
            const hasReview = it.review && it.review_status
            return (
              <div key={it.borrow_id} className="py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar src={it.avatar_url} name={it.name} className="w-9 h-9 rounded-full bg-[var(--color-brand)] text-white text-[13px] font-semibold shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate text-[var(--color-text-primary)]">
                      {it.name}<span className="text-[var(--color-text-tertiary)] font-normal">{it.role === 'teacher' ? ' · учитель' : it.class_name ? ` · ${it.class_name}` : ''}</span>
                    </div>
                    <div className="text-[12px] text-[var(--color-text-tertiary)]">
                      {fmt(it.borrowed_at)}{it.returned_at ? ` → ${fmt(it.returned_at)}` : ''}{it.own_book ? ' · своя книга' : ''}{it.coins ? ` · ${it.coins} монет` : ''}
                    </div>
                  </div>
                  {it.video && <Video size={14} className="text-[var(--color-success)]" aria-label="Видео" />}
                  {it.tedx && <Mic size={14} className="text-[var(--color-success)]" aria-label="TEDx" />}
                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold ${cls}`}>{label}</span>
                  {hasReview && (
                    <button onClick={() => setOpen(o => ({ ...o, [it.borrow_id]: !o[it.borrow_id] }))} aria-label="Показать отзыв"
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-soft)]">
                      <ChevronDown size={16} className={`transition-transform ${open[it.borrow_id] ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {hasReview && open[it.borrow_id] && (
                  <div className="mt-2 ml-12 p-3 rounded-xl bg-[var(--color-bg-soft)] text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--color-text-primary)]">
                    {it.rating ? <div className="text-[#ff9500] mb-1">{'★'.repeat(it.rating)}{'☆'.repeat(5 - it.rating)}</div> : null}
                    {it.review}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
