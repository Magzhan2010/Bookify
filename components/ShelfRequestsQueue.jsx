'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Library, Check, X } from 'lucide-react'

/**
 * Заявки «на полку без отзыва»: ученик просит поставить книгу в профиль (без монет).
 * Решают библиотекарь и команда; свою заявку участник не решает.
 */
export default function ShelfRequestsQueue({ meId }) {
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/librarian/shelf-requests', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      if (res.ok) setItems(await res.json())
    } catch {}
  }, [])
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i) }, [load])

  const decide = async (it, action) => {
    let note
    if (action === 'reject') {
      note = window.prompt('Почему отказываем? (ученик увидит)', 'Сначала прочитай книгу') ?? null
      if (note === null) return
    }
    setBusy(it.id)
    try {
      const res = await fetch(`/api/librarian/shelf-requests/${it.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setItems(xs => xs.filter(x => x.id !== it.id))
      toast.success(action === 'approve' ? `«${it.book_title}» на полке у ${it.student_name}` : 'Отказано')
    } catch (e) { toast.error(e.message); load() } finally { setBusy(null) }
  }

  if (!items.length) return null
  return (
    <div className="mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <Library size={18} className="text-[var(--color-brand)]" />
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">На полку без отзыва: {items.length}</h3>
      </div>
      <p className="text-[12px] text-[var(--color-text-tertiary)] mb-3">
        Ученик говорит, что прочитал книгу, и просит поставить её в профиль — без отзыва и без монет. Одобряй, если знаешь, что он правда читал.
      </p>
      <div className="divide-y divide-[var(--color-border)] max-h-[360px] overflow-y-auto">
        {items.map(it => {
          const own = meId && it.user_id === meId
          return (
            <div key={it.id} className="flex items-center gap-3 py-2.5">
              <div className="w-8 h-11 rounded overflow-hidden shrink-0 bg-[var(--color-bg-soft)]">{it.book_cover && <img src={it.book_cover} alt="" className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-0 text-[13px]">
                <div className="font-medium truncate text-[var(--color-text-primary)]">
                  {it.student_name}{it.student_class ? ` · ${it.student_class}` : ''}
                  {it.pending_total > 1 && <span className="ml-1.5 text-[11px] font-normal text-[var(--color-text-tertiary)]">({it.pending_total} заявок)</span>}
                </div>
                <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
                  {it.book_title}{it.borrow_id ? ' · брал в библиотеке, отзыв не пишет' : ' · из каталога'}
                </div>
              </div>
              {own ? <span className="text-[12px] text-[var(--color-text-tertiary)]">Твоя заявка</span> : (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => decide(it, 'reject')} disabled={busy === it.id} title="Отказать"
                    className="w-8 h-8 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] flex items-center justify-center disabled:opacity-50"><X size={15} /></button>
                  <button onClick={() => decide(it, 'approve')} disabled={busy === it.id} title="Поставить на полку"
                    className="w-8 h-8 rounded-lg bg-[var(--color-success)] text-white flex items-center justify-center disabled:opacity-50"><Check size={15} /></button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
