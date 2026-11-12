'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Video, Mic, Check, Clock } from 'lucide-react'
import { Button, Modal } from './ui'

/**
 * На полке, под книгой с одобренным отзывом: «+ Видео» и «+ TEDx» — когда ученик их сделал,
 * хоть через неделю. Монеты — после проверки командой.
 */
export default function BonusButtons({ book, onDone }) {
  const [kind, setKind] = useState(null)
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  if (!book.review_ok) return null
  const send = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/profile/bonus', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowId: book.borrow_id, kind, link, note })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success('Отправлено на проверку', { description: 'Монеты придут, когда команда посмотрит' })
      setKind(null); setLink(''); setNote(''); onDone?.()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  const chip = (k, Icon, label, pts, state) => state === 'done' ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)] text-[11px] font-semibold"><Check size={11} /> {label}</span>
  ) : state === 'pending' ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-warning)]/10 text-[var(--color-warning)] text-[11px] font-semibold"><Clock size={11} /> {label}</span>
  ) : (
    <button onClick={() => setKind(k)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] text-[11px] font-semibold transition-colors">
      <Icon size={11} /> {label} +{pts}
    </button>
  )
  const input = 'w-full h-11 px-3.5 rounded-xl bg-[var(--color-bg-soft)] text-[14px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20'

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {chip('video', Video, 'Видео', 10, book.video_state)}
        {chip('tedx', Mic, 'TEDx', 15, book.tedx_state)}
      </div>
      <Modal open={!!kind} onClose={() => setKind(null)} size="sm"
        title={kind === 'video' ? 'Видео о книге' : 'Выступление на TEDx'}
        description={kind === 'video' ? `Сними короткое видео о «${book.title}» и вставь ссылку — команда посмотрит и начислит +10.` : `Расскажи, когда выступал с темой «${book.title}» — команда подтвердит и начислит +15.`}>
        <form onSubmit={send} className="space-y-3">
          <input type="url" required={kind === 'video'} placeholder={kind === 'video' ? 'Ссылка на видео' : 'Ссылка (если есть)'} value={link} onChange={e => setLink(e.target.value)} className={input} />
          <input placeholder={kind === 'video' ? 'Комментарий (по желанию)' : 'Когда и где выступал'} required={kind === 'tedx'} value={note} maxLength={300} onChange={e => setNote(e.target.value)} className={input} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setKind(null)}>Отмена</Button>
            <Button type="submit" loading={busy}>Отправить</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
