'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BookPlus, Check, X } from 'lucide-react'

/**
 * Заявки «читаю свою книгу»: подтвердить, что книга у ученика есть.
 * С момента подтверждения пошёл отсчёт чтения; поправить название/автора/страницы можно прямо здесь.
 */
export default function OwnBookQueue({ meId }) {
  const [items, setItems] = useState([])
  const [edit, setEdit] = useState({})
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/librarian/own-books', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      if (res.ok) setItems(await res.json())
    } catch {}
  }, [])
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i) }, [load])

  const decide = async (it, action) => {
    let note
    if (action === 'reject') {
      note = window.prompt('Почему не подтверждаем? (ученик увидит)', 'Покажи книгу в библиотеке')
      if (note === null) return
    }
    setBusy(it.id)
    try {
      const res = await fetch(`/api/librarian/own-books/${it.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note, ...(edit[it.id] || {}) })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setItems(xs => xs.filter(x => x.id !== it.id))
      toast.success(action === 'approve' ? `${it.student_name} начал читать «${(edit[it.id]?.title) || it.title}»` : 'Не подтверждено')
    } catch (e) { toast.error(e.message); load() } finally { setBusy(null) }
  }
  const set = (id, k, v) => setEdit(e => ({ ...e, [id]: { ...(e[id] || {}), [k]: v } }))

  if (!items.length) return null
  const inp = 'bg-[var(--color-bg-soft)] rounded-lg px-2 py-1 text-[12px] outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20'
  return (
    <div className="mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <BookPlus size={18} className="text-[var(--color-brand)]" />
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Своя книга — подтвердить старт: {items.length}</h3>
      </div>
      <p className="text-[12px] text-[var(--color-text-tertiary)] mb-3">
        Подтверждай, только если видел книгу у ученика. Чтение засчитается с этой минуты, «Дочитал» — не раньше чем через пару дней, потом отзыв по общим правилам.
      </p>
      <div className="divide-y divide-[var(--color-border)] max-h-[420px] overflow-y-auto">
        {items.map(it => {
          const own = meId && it.user_id === meId
          const e = edit[it.id] || {}
          return (
            <div key={it.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="w-10 h-14 rounded overflow-hidden shrink-0 bg-[var(--color-bg-soft)]">{it.photo && <img src={it.photo} alt="" className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-[220px] text-[13px] space-y-1">
                <div className="font-medium text-[var(--color-text-primary)]">
                  {it.student_name}{it.student_class ? ` · ${it.student_class}` : ''}{it.student_role === 'teacher' ? ' · учитель' : ''}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <input aria-label="Название" className={`${inp} flex-1 min-w-[140px]`} value={e.title ?? it.title} onChange={ev => set(it.id, 'title', ev.target.value)} />
                  <input aria-label="Автор" className={`${inp} w-32`} value={e.author ?? it.author} onChange={ev => set(it.id, 'author', ev.target.value)} />
                  <input aria-label="Страниц" inputMode="numeric" className={`${inp} w-16`} value={e.pages ?? it.pages} onChange={ev => set(it.id, 'pages', ev.target.value.replace(/\D/g, '').slice(0, 4))} />
                </div>
                {it.library_book_id && <div className="text-[11px] text-[#c97a00]">Такая книга есть в библиотеке — проверь, что у ученика свой экземпляр</div>}
              </div>
              {own ? <span className="text-[12px] text-[var(--color-text-tertiary)]">Твоя заявка</span> : (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => decide(it, 'reject')} disabled={busy === it.id} aria-label="Не подтверждать"
                    className="w-8 h-8 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] flex items-center justify-center disabled:opacity-50"><X size={15} /></button>
                  <button onClick={() => decide(it, 'approve')} disabled={busy === it.id} aria-label="Подтвердить: книга у ученика есть"
                    className="h-8 px-3 rounded-lg bg-[var(--color-success)] text-white text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50"><Check size={14} /> Видел книгу</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
