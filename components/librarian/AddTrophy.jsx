'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Trophy, Search, Loader2 } from 'lucide-react'
import { Button, Modal } from '../ui'
import { TROPHY_NOTE } from '../../lib/trophy'

/**
 * «Добавить прочитанную книгу»: ученик прочитал её до запуска Bookify —
 * книга встаёт на полку как трофей, без отзыва и без монет.
 */
export default function AddTrophy({ studentId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [books, setBooks] = useState([])
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!open || q.trim().length < 2) { setBooks([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(q.trim())}`)
        setBooks(res.ok ? await res.json() : [])
      } catch { setBooks([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [q, open])

  const add = async book => {
    setBusy(book.id)
    try {
      const res = await fetch(`/api/librarian/students/${studentId}/trophy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success(`«${book.title}» на полке`, { description: 'Без отзыва и без монет' })
      onAdded?.({ id: d.id, status: 'approved', notes: TROPHY_NOTE, title: book.title, author: book.author, cover_url: book.cover_url, book_id: book.id })
    } catch (e) { toast.error(e.message) } finally { setBusy(null) }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffc93c]/20 text-[#9a6b00] text-[12px] font-semibold hover:bg-[#ffc93c]/30 transition-colors">
        <Trophy size={13} /> Прочитал раньше
      </button>
      <Modal open={open} onClose={() => { setOpen(false); setQ('') }} size="md" title="Книга, прочитанная до Bookify"
        description="Встанет на полку ученика как трофей. Отзыв не нужен, монеты не начисляются."
        footer={<Button variant="secondary" onClick={() => { setOpen(false); setQ('') }}>Готово</Button>}>
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Название или автор"
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-[var(--color-bg-soft)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20" />
        </div>
        <div className="max-h-[50vh] overflow-y-auto space-y-1.5">
          {q.trim().length >= 2 && books.length === 0 && <p className="text-[13px] text-[var(--color-text-tertiary)] text-center py-6">Не нашли такую книгу в каталоге</p>}
          {books.map(b => (
            <button key={b.id} onClick={() => add(b)} disabled={busy === b.id}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--color-bg-soft)] text-left transition-colors disabled:opacity-50">
              <div className="w-9 h-12 rounded overflow-hidden shrink-0 bg-[var(--color-bg-soft)]">{b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{b.title}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{b.author}</div>
              </div>
              {busy === b.id ? <Loader2 size={15} className="animate-spin" /> : <Trophy size={15} className="text-[#c97a00]" />}
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
