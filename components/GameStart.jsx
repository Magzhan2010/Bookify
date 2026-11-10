'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flag, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Modal } from './ui'
import { useTeamMe } from '../lib/useTeamMe'
import { parseJwt } from '../lib/jwt'

const TZ = 5 * 3600000 // время школы, UTC+5

function fmt(v) {
  return new Date(v).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })
}

async function call(method, body) {
  const res = await fetch('/api/team/settings', {
    method,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера')
  return data
}

/**
 * Кнопка «Старт игры»: показывает дату и даёт её поменять (библиотекарь и тимлид).
 * Всё, что раньше этой даты, не считается: сданные книги не требуют отзыва и не дают монет.
 * Данные не удаляются — меняется только точка отсчёта.
 */
export default function GameStart({ onChanged, className = '' }) {
  const me = useTeamMe()
  const [value, setValue] = useState(undefined)
  const [open, setOpen] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  const load = useCallback(() => call('GET').then(d => setValue(d.game_start)).catch(() => setValue(null)), [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const role = parseJwt(localStorage.getItem('token') || '')?.role
    setCanEdit(role === 'librarian' || !!me?.is_lead)
  }, [me])

  if (value === undefined) return null
  return (
    <>
      <button
        type="button"
        onClick={() => canEdit && setOpen(true)}
        title={canEdit ? 'Изменить дату старта игры' : undefined}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-bg-card)] border text-[13px] font-medium transition-colors ${
          value ? 'border-[var(--color-border)]' : 'border-[#c97a00]/50 text-[#c97a00]'
        } ${canEdit ? 'hover:border-[var(--color-border-strong)]' : 'cursor-default'} ${className}`}
      >
        <Flag size={14} className={value ? 'text-[var(--color-brand)]' : ''} />
        {value ? `Старт игры: ${fmt(value)}` : 'Старт игры не задан'}
        {canEdit && <span className="text-[var(--color-text-tertiary)]">· изменить</span>}
      </button>
      <StartModal open={open} current={value} onClose={() => setOpen(false)}
        onDone={v => { setValue(v); setOpen(false); onChanged?.(v) }} />
    </>
  )
}

function StartModal({ open, current, onClose, onDone }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('00:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const local = new Date((current ? new Date(current).getTime() : Date.now()) + TZ).toISOString()
    setDate(local.slice(0, 10)); setTime(current ? local.slice(11, 16) : '00:00')
  }, [open, current])

  const save = async body => {
    setSaving(true)
    try {
      const d = await call('PATCH', body)
      toast.success('Старт игры сохранён — счётчики пересчитаны')
      onDone(d.game_start)
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  const input = 'w-full h-11 px-3.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/50'
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Старт игры"
      description="Всё, что было раньше, не считается: сданные книги не требуют отзыва и не дают монет. Данные не удаляются — меняется только точка отсчёта.">
      <div className="space-y-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => save({ now: true })}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-brand-soft)] text-left hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Zap size={20} className="text-[var(--color-brand)] shrink-0" />
          <span>
            <span className="block text-[14px] font-semibold text-[var(--color-text-primary)]">Начать с этой минуты</span>
            <span className="block text-[12px] text-[var(--color-text-secondary)]">Все счётчики «без отзыва» обнулятся</span>
          </span>
        </button>
        <div className="text-center text-[12px] text-[var(--color-text-tertiary)]">или выбрать дату и время</div>
        <form onSubmit={e => { e.preventDefault(); save({ gameStart: date, time }) }} className="space-y-4">
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={input} aria-label="Дата" />
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className={input} aria-label="Время" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
            <Button type="submit" loading={saving}>Сохранить</Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
