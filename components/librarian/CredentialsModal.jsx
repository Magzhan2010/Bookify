'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, Eye, EyeOff, Search } from 'lucide-react'
import { Button, Modal, Skeleton } from '../ui'

/**
 * «Логины и пароли»: выданные школой пароли учеников списком — для листочков и подсказок.
 * Только библиотекарь и тимлид; каждый просмотр записывается.
 */
export default function CredentialsModal({ open, onClose }) {
  const [rows, setRows] = useState(null)
  const [cls, setCls] = useState('')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (!open) return
    setRows(null); setShown(false)
    fetch('/api/librarian/students/credentials', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Ошибка'); setRows(d) })
      .catch(e => { toast.error(e.message); setRows([]) })
  }, [open])

  const classes = useMemo(() => [...new Set((rows || []).map(r => r.class_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true })), [rows])
  const list = (rows || []).filter(r => (!cls || r.class_name === cls) && (!q || `${r.name} ${r.email}`.toLowerCase().includes(q.toLowerCase())))

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1200) } catch { toast.error('Не удалось скопировать') }
  }
  const copyAll = () => copy(['Имя\tКласс\tЛогин\tПароль', ...list.map(r => `${r.name}\t${r.class_name || ''}\t${r.email}\t${r.password || ''}`)].join('\n'), 'all')

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Логины и пароли"
      description="Пароли, которые выдала школа. Пароли участников команды и те, что человек поставил себе сам, не показываются. Каждый просмотр записывается."
      footer={<>
        <Button variant="secondary" icon={copied === 'all' ? Check : Copy} disabled={!list.length} onClick={copyAll}>Скопировать для таблицы</Button>
        <Button onClick={onClose}>Готово</Button>
      </>}>
      {!rows ? <Skeleton className="h-64 rounded-2xl" /> : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Имя или почта" aria-label="Поиск"
                className="w-full h-10 pl-8 pr-3 rounded-xl bg-[var(--color-bg-soft)] text-[13px] outline-none" />
            </div>
            <select value={cls} onChange={e => setCls(e.target.value)} aria-label="Класс" className="h-10 px-3 rounded-xl bg-[var(--color-bg-soft)] text-[13px] outline-none">
              <option value="">Все классы</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button variant="secondary" size="sm" icon={shown ? EyeOff : Eye} onClick={() => setShown(s => !s)}>{shown ? 'Скрыть пароли' : 'Показать пароли'}</Button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {list.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-3.5 py-2 text-[13px]">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}<span className="text-[var(--color-text-tertiary)] font-normal">{r.role === 'teacher' ? ' · учитель' : r.class_name ? ` · ${r.class_name}` : ''}</span></div>
                  <button onClick={() => copy(r.email, `e${r.id}`)} className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-brand)] truncate max-w-full text-left">
                    {copied === `e${r.id}` ? 'скопировано' : r.email}
                  </button>
                </div>
                {r.password ? (
                  <button onClick={() => copy(r.password, `p${r.id}`)} title="Скопировать пароль"
                    className="shrink-0 font-mono text-[13px] px-2.5 py-1 rounded-lg bg-[var(--color-bg-soft)] hover:bg-[var(--color-brand-soft)]">
                    {copied === `p${r.id}` ? 'скопировано' : shown ? r.password : '••••••'}
                  </button>
                ) : <span className="shrink-0 text-[11px] text-[var(--color-text-tertiary)]">{r.note}</span>}
              </div>
            ))}
            {!list.length && <p className="text-center text-[13px] text-[var(--color-text-tertiary)] py-8">Никого не нашли</p>}
          </div>
        </div>
      )}
    </Modal>
  )
}
