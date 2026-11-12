'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Eye, Copy, Check, KeyRound } from 'lucide-react'

/** Карточка «Логин и пароль» на странице ученика (библиотекарь и тимлид). */
export default function StudentCredentials({ student }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(null)

  const reveal = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/librarian/students/${student.id}/credentials`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setData(d)
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const copy = async (t, k) => { try { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 1200) } catch {} }

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5">
      <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3"><KeyRound size={15} /> Логин и пароль</h3>
      <div className="space-y-2 text-[13px]">
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--color-bg-soft)]">
          <span className="text-[var(--color-text-tertiary)]">Логин</span>
          <button onClick={() => copy(student.email, 'e')} className="font-medium truncate flex items-center gap-1.5">{student.email} {copied === 'e' ? <Check size={12} /> : <Copy size={12} className="opacity-50" />}</button>
        </div>
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--color-bg-soft)]">
          <span className="text-[var(--color-text-tertiary)]">Пароль</span>
          {data?.password ? (
            <button onClick={() => copy(data.password, 'p')} className="font-mono font-semibold flex items-center gap-1.5">{data.password} {copied === 'p' ? <Check size={12} /> : <Copy size={12} className="opacity-50" />}</button>
          ) : data ? (
            <span className="text-[12px] text-[var(--color-text-tertiary)] text-right">{data.note}</span>
          ) : (
            <button onClick={reveal} disabled={busy} className="flex items-center gap-1.5 font-medium text-[var(--color-brand)] disabled:opacity-50"><Eye size={13} /> Показать</button>
          )}
        </div>
      </div>
    </div>
  )
}
