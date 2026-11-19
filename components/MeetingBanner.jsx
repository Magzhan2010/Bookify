'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, MapPin, Check, X } from 'lucide-react'
import { useT } from '../lib/i18n'

/**
 * Плашка «Собрание» над страницей: ближайшее собрание, куда тебя позвали,
 * обратный отсчёт и ответ «Приду / Не смогу». Обновляется раз в минуту.
 */
const TZ = 'Asia/Almaty'
const hhmm = d => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
const dayKey = d => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ })

function whenText(d, t, locale) {
  const ms = new Date(d) - Date.now()
  if (ms <= 0) return t('уже идёт')
  const min = Math.round(ms / 60000)
  if (min < 60) return t('через {n} мин', { n: Math.max(1, min) })
  if (dayKey(d) === dayKey(Date.now())) return t('сегодня в {t}', { t: hhmm(d) })
  if (dayKey(d) === dayKey(Date.now() + 86400000)) return t('завтра в {t}', { t: hhmm(d) })
  return new Date(d).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }) + ', ' + hhmm(d)
}

export default function MeetingBanner({ className = '' }) {
  const { t, locale } = useT()
  const [items, setItems] = useState([])
  const [, tick] = useState(0)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/meetings', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setItems((await res.json()).mine || [])
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const a = setInterval(load, 60000)
    const b = setInterval(() => tick(x => x + 1), 30000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(a); clearInterval(b); window.removeEventListener('focus', onFocus) }
  }, [load])

  const upcoming = items.filter(m => !m.cancelled_at &&
    new Date(m.starts_at) > Date.now() - 30 * 60000 &&
    new Date(m.starts_at) < Date.now() + 7 * 86400000)
  const m = upcoming[0]

  const answer = async response => {
    setBusy(true)
    setItems(list => list.map(x => x.id === m.id ? { ...x, response } : x))
    setEditing(false)
    try {
      await fetch(`/api/meetings/${m.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      })
    } catch {}
    setBusy(false)
  }

  const urgent = m && new Date(m.starts_at) - Date.now() < 15 * 60000
  const showButtons = m && (!m.response || editing)

  return (
    <AnimatePresence>
      {m && (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className={`relative overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[0_10px_30px_rgba(31,42,92,0.08)] ${className}`}
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#1a56db] to-[#1f2a5c]" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pl-5 pr-4 py-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a56db] to-[#1f2a5c] text-white flex flex-col items-center justify-center shrink-0">
              <Megaphone size={15} />
              <span className="text-[11px] font-semibold tabular-nums leading-none mt-1">{hhmm(m.starts_at)}</span>
              {urgent && (
                <span className="absolute -top-1 -right-1 flex w-3.5 h-3.5">
                  <span className="absolute inset-0 rounded-full bg-[#ffc93c] animate-ping opacity-75" />
                  <span className="relative w-3.5 h-3.5 rounded-full bg-[#ffc93c] border-2 border-[var(--color-bg-card)]" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 basis-[200px]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand)]">
                {t('Собрание')} · {whenText(m.starts_at, t, locale)}
                {upcoming.length > 1 && <span className="text-[var(--color-text-tertiary)]"> · {t('ещё {n}', { n: upcoming.length - 1 })}</span>}
              </div>
              <div className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">{m.title}</div>
              <div className="text-[12px] text-[var(--color-text-secondary)] flex items-center gap-1 flex-wrap">
                <MapPin size={12} className="shrink-0" /> {m.place}
                {m.created_by_name && <span className="text-[var(--color-text-tertiary)]">· {t('зовёт {name}', { name: m.created_by_name })}</span>}
              </div>
              {m.note && <div className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 line-clamp-2">{m.note}</div>}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {showButtons ? (
                <>
                  <button disabled={busy} onClick={() => answer('yes')}
                    className="h-9 px-4 rounded-full bg-[var(--color-brand)] text-white text-[13px] font-semibold flex items-center gap-1.5 hover:brightness-110 active:scale-[0.97] transition">
                    <Check size={14} /> {t('Приду')}
                  </button>
                  <button disabled={busy} onClick={() => answer('no')}
                    className="h-9 px-4 rounded-full bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] text-[13px] font-semibold flex items-center gap-1.5 hover:text-[var(--color-text-primary)] active:scale-[0.97] transition">
                    <X size={14} /> {t('Не смогу')}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)}
                  className={`h-9 px-3.5 rounded-full text-[13px] font-semibold flex items-center gap-1.5 ${
                    m.response === 'yes' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]'}`}
                  title={t('Изменить ответ')}>
                  {m.response === 'yes' ? <><Check size={14} /> {t('Ты придёшь')}</> : <><X size={14} /> {t('Ты не придёшь')}</>}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
