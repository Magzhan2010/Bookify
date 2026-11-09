'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarPlus } from 'lucide-react'
import { Modal, Button } from '../ui'

/**
 * Кнопка «Продлить» + окно выбора срока. После успеха вызывает onExtended(новая_дата).
 * Используется у библиотекаря и на командной платформе.
 */
const PRESETS = [7, 14, 30]

const fmt = d => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

export default function ExtendDue({ loan, onExtended, size = 'sm', className = '' }) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState(7)
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  const base = Math.max(new Date(loan.due_date).getTime(), Date.now())
  const preview = date ? new Date(date + 'T12:00:00') : new Date(base + days * 86400000)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/librarian/borrows/${loan.id}/extend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(date ? { dueDate: date } : { days })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      toast.success(`Срок продлён до ${fmt(data.due_date)}`)
      onExtended?.(data.due_date)
      setOpen(false); setDate('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const btn = size === 'sm'
    ? 'px-3 py-1.5 rounded-lg text-[12px]'
    : 'px-4 py-2.5 rounded-xl text-[13px]'

  return (
    <>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        className={`shrink-0 font-medium flex items-center gap-1.5 bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors ${btn} ${className}`}
      >
        <CalendarPlus size={size === 'sm' ? 13 : 14} /> Продлить
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Продлить срок"
        description={`«${loan.book_title || loan.title}» · ${loan.student_name || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={save} loading={saving} icon={CalendarPlus}>Продлить</Button>
          </>
        }
      >
        <div className="text-[13px] text-[var(--color-text-secondary)]">
          Сейчас вернуть до: <b className="text-[var(--color-text-primary)]">{fmt(loan.due_date)}</b>
          {new Date(loan.due_date) < new Date() && <span className="text-[var(--color-danger)]"> · уже просрочено</span>}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {PRESETS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => { setDays(d); setDate('') }}
              className={`py-3 rounded-xl text-[14px] font-semibold transition-colors ${
                !date && days === d
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
              }`}
            >
              +{d} дней
            </button>
          ))}
        </div>

        <label className="block mt-4">
          <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">Или выбери дату</span>
          <input
            type="date"
            min={tomorrow}
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40"
          />
        </label>

        <div className="mt-4 p-3 rounded-xl bg-[var(--color-brand-soft)] text-[13px] text-[var(--color-brand)] font-medium">
          Новый срок: {preview.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
        </div>
      </Modal>
    </>
  )
}
