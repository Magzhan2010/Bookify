'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Tv, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react'
import { Modal, Button } from '../ui'

/** Кнопка «Экран для холла»: ссылка для DLS TV (лидеры месяца, цитата дня, новые книги). */
export default function TvLink() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const call = async (method = 'GET') => {
    const res = await fetch('/api/librarian/tv-link', { method, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'Ошибка')
    setUrl(window.location.origin + d.path)
  }

  const show = async () => {
    setOpen(true)
    try { await call() } catch (e) { toast.error(e.message) }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { toast.error('Не удалось скопировать') }
  }

  const renew = async () => {
    if (!confirm('Сделать новую ссылку? Старая на телевизоре перестанет работать.')) return
    try { await call('POST'); toast.success('Новая ссылка готова') } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <button onClick={show} className="px-4 py-2 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[13px] font-medium flex items-center gap-2 hover:border-[var(--color-border-strong)]">
        <Tv size={14} /> Экран для холла
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Экран для холла (DLS TV)"
        description="Лидеры месяца, лучший класс, цитата дня и новые книги. Сцены сменяются сами, данные обновляются каждые 5 минут.">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-[var(--color-bg-soft)] text-[12px] font-mono break-all text-[var(--color-text-primary)]">{url || '…'}</div>
          <div className="flex flex-wrap gap-2">
            <Button icon={copied ? Check : Copy} onClick={copy} disabled={!url}>{copied ? 'Скопировано' : 'Скопировать'}</Button>
            <a href={url || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-bg-soft)] text-[14px] font-medium hover:bg-[var(--color-border)]">
              <ExternalLink size={15} /> Открыть
            </a>
            <Button variant="ghost" icon={RefreshCw} onClick={renew}>Новая ссылка</Button>
          </div>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">
            Откройте ссылку в браузере телевизора и включите полный экран (F11). Ссылку не публикуйте — по ней видны имена учеников.
          </p>
        </div>
      </Modal>
    </>
  )
}
