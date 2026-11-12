'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Video, Mic, Check, X, ExternalLink } from 'lucide-react'

/** Заявки на бонус: ученик снял видео о книге или выступил на TEDx. */
export default function BonusQueue({ meId }) {
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/librarian/bonus-requests', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      if (res.ok) setItems(await res.json())
    } catch {}
  }, [])
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i) }, [load])

  const decide = async (it, action) => {
    let note
    if (action === 'reject') {
      note = window.prompt('Почему не засчитываем? (ученик увидит)', it.kind === 'video' ? 'Видео не открывается или не о книге' : 'Выступление не подтверждено')
      if (note === null) return
    }
    setBusy(it.id)
    try {
      const res = await fetch(`/api/librarian/bonus-requests/${it.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setItems(xs => xs.filter(x => x.id !== it.id))
      toast.success(action === 'approve' ? `${it.student_name}: +${d.points}` : 'Не засчитано')
    } catch (e) { toast.error(e.message); load() } finally { setBusy(null) }
  }

  if (!items.length) return null
  return (
    <div className="mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <Video size={18} className="text-[var(--color-brand)]" />
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Видео и TEDx: {items.length}</h3>
      </div>
      <div className="divide-y divide-[var(--color-border)] max-h-[360px] overflow-y-auto">
        {items.map(it => {
          const own = meId && it.user_id === meId
          const Icon = it.kind === 'video' ? Video : Mic
          return (
            <div key={it.id} className="flex items-center gap-3 py-2.5">
              <Icon size={16} className="shrink-0 text-[var(--color-text-tertiary)]" />
              <div className="flex-1 min-w-0 text-[13px]">
                <div className="font-medium truncate text-[var(--color-text-primary)]">
                  {it.student_name}{it.student_class ? ` · ${it.student_class}` : ''} — {it.kind === 'video' ? 'видео +10' : 'TEDx +15'}
                </div>
                <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
                  «{it.book_title}»{it.note ? ` · ${it.note}` : ''}
                </div>
                {it.link && (
                  <a href={it.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-medium">
                    Открыть <ExternalLink size={11} />
                  </a>
                )}
              </div>
              {own ? <span className="text-[12px] text-[var(--color-text-tertiary)]">Твоя заявка</span> : (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => decide(it, 'reject')} disabled={busy === it.id} aria-label="Не засчитывать"
                    className="w-8 h-8 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] flex items-center justify-center disabled:opacity-50"><X size={15} /></button>
                  <button onClick={() => decide(it, 'approve')} disabled={busy === it.id} aria-label="Начислить"
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
