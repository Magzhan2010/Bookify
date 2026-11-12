'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BookPlus, Camera, Clock, CheckCircle2, X, Loader2 } from 'lucide-react'
import { Button, Modal } from './ui'

/** Сжимает фото до 600 px по большей стороне (JPEG) — чтобы заявка была лёгкой. */
async function compress(file) {
  const img = await createImageBitmap(file)
  const k = Math.min(1, 600 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.72)
}

const fmt = d => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

/**
 * «Своя книга»: читаю книгу, которой нет в библиотеке.
 * Заявка → библиотекарь/команда подтверждают, что книга есть → чтение пошло → «Дочитал» не раньше срока → отзыв.
 */
export default function OwnBooks({ onChanged }) {
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', author: '', pages: '' })
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/own-books', { headers: auth() })
      if (res.ok) setData(await res.json())
    } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/profile/own-books', {
        method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pages: parseInt(form.pages), photo })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success('Заявка отправлена', { description: 'Покажи книгу библиотекарю или команде — они подтвердят старт' })
      setOpen(false); setForm({ title: '', author: '', pages: '' }); setPhoto(null); load()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const finish = async b => {
    try {
      const res = await fetch('/api/profile/own-books/finish', {
        method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ borrowId: b.borrow_id })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success('Поздравляем! Теперь напиши отзыв', { description: 'Книга во вкладке «Ждут отзыва»' })
      load(); onChanged?.()
    } catch (err) { toast.error(err.message) }
  }
  const cancel = async r => {
    const res = await fetch(`/api/profile/own-books?id=${r.id}`, { method: 'DELETE', headers: auth() })
    if (res.ok) load(); else toast.error('Не удалось')
  }

  const reading = data?.reading || []
  const requests = data?.requests || []
  const input = 'w-full h-11 px-3.5 rounded-xl bg-[var(--color-bg-soft)] text-[14px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20'

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--color-brand-soft)]">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">Читаешь свою книгу?</div>
          <div className="text-[12px] text-[var(--color-text-secondary)]">Книги нет в библиотеке — добавь её, и за отзыв тоже будут монеты</div>
        </div>
        <Button size="sm" icon={BookPlus} onClick={() => setOpen(true)}>Своя книга</Button>
      </div>

      {requests.map(r => (
        <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[13px]">
          {r.status === 'pending' ? <Clock size={16} className="text-[var(--color-warning)] shrink-0" /> : <X size={16} className="text-[var(--color-danger)] shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{r.title} <span className="font-normal text-[var(--color-text-tertiary)]">· {r.author}</span></div>
            <div className="text-[12px] text-[var(--color-text-tertiary)]">
              {r.status === 'pending' ? 'Ждёт подтверждения — покажи книгу библиотекарю или команде' : `Не подтвердили${r.note ? `: ${r.note}` : ''}`}
            </div>
          </div>
          <button onClick={() => cancel(r)} className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)]">{r.status === 'pending' ? 'Отменить' : 'Скрыть'}</button>
        </div>
      ))}

      {reading.map(b => {
        const ready = Date.now() >= new Date(b.can_finish_at).getTime()
        return (
          <div key={b.borrow_id} className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <div className="w-10 h-14 rounded-lg overflow-hidden bg-[var(--color-bg-soft)] shrink-0">{b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover" />}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold truncate">{b.title}</div>
              <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">Своя книга · {b.pages} стр. · читаю с {fmt(b.borrowed_at)}</div>
            </div>
            {ready ? (
              <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => finish(b)}>Дочитал</Button>
            ) : (
              <span className="text-[12px] text-[var(--color-text-tertiary)] text-right shrink-0">«Дочитал»<br />с {fmt(b.can_finish_at)}</span>
            )}
          </div>
        )
      })}

      <Modal open={open} onClose={() => setOpen(false)} size="md" title="Своя книга"
        description="Библиотекарь или команда подтвердят, что книга у тебя есть. Чтение засчитывается с этой минуты: «Дочитал» можно нажать не раньше, чем через несколько дней (зависит от толщины книги). Потом — отзыв и монеты, как за библиотечную.">
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Название книги" value={form.title} maxLength={200} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={input} />
          <input required placeholder="Автор" value={form.author} maxLength={120} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className={input} />
          <input required inputMode="numeric" placeholder="Сколько страниц" value={form.pages} onChange={e => setForm(f => ({ ...f, pages: e.target.value.replace(/\D/g, '').slice(0, 4) }))} className={input} />
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { try { setPhoto(await compress(f)) } catch { toast.error('Не получилось открыть фото') } } }} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-brand)]/50 text-left">
            {photo ? <img src={photo} alt="" className="w-12 h-16 object-cover rounded-md" /> : <Camera size={20} className="text-[var(--color-brand)]" />}
            <span className="text-[13px] text-[var(--color-text-secondary)]">{photo ? 'Фото обложки добавлено — нажми, чтобы заменить' : 'Фото обложки (по желанию — так подтвердят быстрее)'}</span>
          </button>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" loading={busy}>Отправить</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
