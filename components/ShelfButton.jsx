'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Library, Check, Loader2 } from 'lucide-react'

/**
 * «На мою полку»: книга просто стоит в профиле — без отзыва, без страниц, без монет.
 * Если книга уже прочитана по-настоящему или сейчас у ученика — кнопки нет.
 */
export default function ShelfButton({ bookId, onChange }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })
  useEffect(() => {
    if (!localStorage.getItem('token') || !bookId) return
    fetch(`/api/profile/shelf?bookId=${bookId}`, { headers: auth() })
      .then(r => (r.ok ? r.json() : null)).then(d => setState(d?.state || null)).catch(() => {})
  }, [bookId])

  if (!state || state === 'reading' || state === 'read') return null

  const add = async () => {
    setBusy(true)
    try {
      const body = state === 'returned' ? { bookId } : { bookId }
      const res = await fetch('/api/profile/shelf', { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setState('shelf'); onChange?.('shelf')
      toast.success('Книга на твоей полке', { description: 'Без отзыва и без монет' })
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/profile/shelf?bookId=${bookId}`, { method: 'DELETE', headers: auth() })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setState('none'); onChange?.('none')
      toast.success('Убрали с полки')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  if (state === 'returned') return null // для сданной книги — кнопка в профиле «Без отзыва — на полку»

  return state === 'shelf' ? (
    <button onClick={remove} disabled={busy} title="Убрать с полки"
      className="px-4 py-2.5 rounded-xl border text-[14px] font-medium flex items-center gap-2 transition-all bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)] disabled:opacity-50">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} На моей полке
    </button>
  ) : (
    <button onClick={add} disabled={busy}
      className="px-4 py-2.5 rounded-xl border text-[14px] font-medium flex items-center gap-2 transition-all bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] disabled:opacity-50">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Library size={14} />} На мою полку
    </button>
  )
}
