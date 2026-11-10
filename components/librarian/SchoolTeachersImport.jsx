'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button, Modal, Skeleton } from '../ui'

const STATUS = {
  create: { label: 'Создадим', cls: 'text-[var(--color-brand)]' },
  created: { label: 'Создан', cls: 'text-[var(--color-success)]' },
  approve: { label: 'Подтвердим', cls: 'text-[var(--color-brand)]' },
  approved: { label: 'Подтверждён', cls: 'text-[var(--color-success)]' },
  exists: { label: 'Уже есть', cls: 'text-[var(--color-text-tertiary)]' },
  student: { label: 'Аккаунт ученика', cls: 'text-[#c97a00]' },
  librarian: { label: 'Библиотекарь', cls: 'text-[var(--color-text-tertiary)]' },
  duplicate: { label: 'Повтор', cls: 'text-[var(--color-text-tertiary)]' }
}

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(d.error || 'Ошибка')
  return d
}

/** Загрузка учителей из школьной базы dls.edu.kz: предпросмотр → создание → список паролей. */
export default function SchoolTeachersImport({ open, onClose, onDone }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = async t => {
    setPreview(null); setError('')
    try {
      const d = await api(`/api/librarian/teachers/school${t ? `?tab=${encodeURIComponent(t)}` : ''}`)
      setPreview(d); setTab(d.tab || '')
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { if (open) { setDone(null); load('') } }, [open])

  const apply = async () => {
    setBusy(true)
    try {
      const d = await api('/api/librarian/teachers/school', 'POST', { tab, apply: true })
      setDone(d)
      const n = d.result.filter(r => r.status === 'created').length
      toast.success(n ? `Создано аккаунтов учителей: ${n}` : 'Новых учителей нет')
      onDone?.()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const created = done?.result.filter(r => r.status === 'created') || []
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(['Имя\tЛогин\tПароль', ...created.map(r => `${r.name}\t${r.email}\t${r.password}`)].join('\n'))
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { toast.error('Не удалось скопировать') }
  }

  const people = preview?.people || []
  const counts = people.reduce((m, p) => ({ ...m, [p.status]: (m[p.status] || 0) + 1 }), {})
  const willDo = (counts.create || 0) + (counts.approve || 0)
  const rows = done ? done.result : people

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Учителя из школьной базы"
      description="Bookify читает список учителей с dls.edu.kz и создаёт им аккаунты. Пароли придумает сам — раздай их учителям, потом они смогут сменить пароль в профиле."
      footer={done ? (
        <>
          {created.length > 0 && <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Скопировано' : 'Скопировать логины и пароли'}</Button>}
          <Button onClick={onClose}>Готово</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button loading={busy} disabled={!willDo} onClick={apply}>Создать ({willDo})</Button>
        </>
      )}
    >
      {error ? (
        <div className="p-4 rounded-2xl bg-[var(--color-danger)]/10 text-[13px] text-[var(--color-danger)] flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => load(tab)} className="shrink-0"><RefreshCw size={15} /></button>
        </div>
      ) : !preview ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : (
        <div className="space-y-4">
          {!done && (
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-[var(--color-text-secondary)]">Вкладка таблицы:</span>
              <select value={tab} onChange={e => { setTab(e.target.value); load(e.target.value) }}
                className="px-3 py-2 rounded-xl bg-[var(--color-bg-soft)] text-[13px] text-[var(--color-text-primary)] outline-none">
                {!preview.tab && <option value="">— выбери вкладку с учителями —</option>}
                {preview.tabs.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
          {preview.tab && !done && (
            <p className="text-[12px] text-[var(--color-text-tertiary)]">
              Колонки: имя — <b>{preview.mapping.name || [preview.mapping.last, preview.mapping.first].filter(Boolean).join(' + ') || 'не нашли'}</b>
              , почта — <b>{preview.mapping.email || 'нет (логин придумаем)'}</b>
              {preview.mapping.subject ? <>, предмет — <b>{preview.mapping.subject}</b></> : null}
            </p>
          )}
          {preview.tab && !people.length && (
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              В этой вкладке не нашли учителей. Заголовки: {preview.headers.slice(0, 8).join(', ') || '—'}
            </p>
          )}
          {!done && people.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(counts).map(([k, n]) => (
                <span key={k} className={`px-3 py-1.5 rounded-full bg-[var(--color-bg-soft)] text-[12px] font-semibold ${STATUS[k]?.cls}`}>{STATUS[k]?.label}: {n}</span>
              ))}
            </div>
          )}
          {rows.length > 0 && (
            <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                  <span className="flex-1 min-w-0 truncate font-medium">{r.name}{r.subject ? <span className="text-[var(--color-text-tertiary)] font-normal"> · {r.subject}</span> : null}</span>
                  <span className="hidden sm:block w-56 truncate text-[var(--color-text-tertiary)]">{r.email || 'логин придумаем'}</span>
                  {done && r.password && <span className="font-mono text-[12px]">{r.password}</span>}
                  <span className={`shrink-0 text-[12px] font-semibold ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label}</span>
                </div>
              ))}
            </div>
          )}
          {done && created.length > 0 && (
            <p className="text-[12px] text-[#c97a00] flex items-start gap-1.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Пароли показываются только сейчас — скопируй список, прежде чем закрыть окно.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
