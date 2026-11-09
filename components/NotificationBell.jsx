'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck } from 'lucide-react'
import { useT } from '../lib/i18n'

/**
 * Колокольчик с уведомлениями: «Отзыв одобрен», «Скоро вернуть книгу», «Приз выдан»…
 * Опрашивает сервер раз в минуту и при возвращении на вкладку.
 */
const ICONS = {
  review_approved: '✅', review_rejected: '✏️', prize_issued: '🎁', prize_cancelled: '↩️',
  book_issued: '📖', request_approved: '📬', request_rejected: '📭', due_soon: '⏰', overdue: '⚠️',
  bonus: '🪙', task: '📝', achievement: '🏅', extended: '📅', teacher: '🧑‍🏫', recommendation: '💡'
}

function ago(d, t, locale) {
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return t('только что')
  if (s < 3600) return t('{n} мин', { n: Math.floor(s / 60) })
  if (s < 86400) return t('{n} ч', { n: Math.floor(s / 3600) })
  return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export default function NotificationBell({ align = 'left', up = false, className = '' }) {
  const [data, setData] = useState({ unread: 0, items: [] })
  const { t, locale } = useT()
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  const load = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setData(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [load])

  useEffect(() => {
    if (!open) return
    const onDown = e => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const markAll = async () => {
    setData(d => ({ unread: 0, items: d.items.map(i => ({ ...i, read_at: i.read_at || new Date().toISOString() })) }))
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: '{}'
      })
    } catch {}
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && data.unread > 0) setTimeout(markAll, 1500) // дать увидеть, что новое
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={data.unread ? `Уведомления: ${data.unread} новых` : 'Уведомления'}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)] transition-colors"
      >
        <Bell size={18} />
        <AnimatePresence>
          {data.unread > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold flex items-center justify-center"
            >
              {data.unread > 9 ? '9+' : data.unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`absolute z-[70] ${up ? 'bottom-full mb-2' : 'mt-2'} w-[340px] max-w-[calc(100vw-24px)] rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">{t('Уведомления')}</span>
              <button onClick={markAll} className="text-[12px] font-medium text-[var(--color-brand)] flex items-center gap-1">
                <CheckCheck size={13} /> {t('Прочитать все')}
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {data.items.length === 0 ? (
                <p className="text-[13px] text-[var(--color-text-tertiary)] text-center py-10">{t('Пока тихо')}</p>
              ) : data.items.map(n => {
                const body = (
                  <div className={`flex gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0 ${n.read_at ? '' : 'bg-[var(--color-brand-soft)]'}`}>
                    <span className="text-[18px] leading-none mt-0.5">{ICONS[n.kind] || '🔔'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">{n.title}</div>
                      {n.body && <div className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">{n.body}</div>}
                      <div className="text-[11px] text-[var(--color-text-tertiary)] mt-1">{ago(n.created_at, t, locale)}</div>
                    </div>
                  </div>
                )
                return n.link
                  ? <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block hover:bg-[var(--color-bg-soft)]">{body}</Link>
                  : <div key={n.id}>{body}</div>
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
