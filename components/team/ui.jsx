'use client'

/**
 * Небольшие кирпичики командной платформы. Стиль — спокойный, «как у Apple»:
 * много воздуха, мягкие поверхности, один акцент.
 */

import { motion } from 'framer-motion'

export const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent text-[14px] ' +
  'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none ' +
  'focus:border-[var(--color-brand)]/40 focus:bg-[var(--color-bg-card)] transition-colors'

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">{label}</span>}
      {children}
      {hint && <span className="block text-[11px] text-[var(--color-text-tertiary)] mt-1">{hint}</span>}
    </label>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-[var(--color-text-primary)] leading-[1.1]">
          {title}
        </h1>
        {subtitle && <p className="text-[14px] text-[var(--color-text-secondary)] mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Surface({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-[22px] bg-[var(--color-bg-card)] border border-[var(--color-border)] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function Stat({ label, value, hint, tone, icon: Icon, i = 0 }) {
  const toneCls = tone === 'danger'
    ? 'text-[var(--color-danger)]'
    : tone === 'success'
      ? 'text-[var(--color-success)]'
      : 'text-[var(--color-text-primary)]'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[20px] bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4 py-3.5"
    >
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
        {Icon && <Icon size={13} />} {label}
      </div>
      <div className={`mt-1 text-[26px] font-semibold tabular-nums tracking-tight ${toneCls}`}>{value ?? 0}</div>
      {hint && <div className="text-[11px] text-[var(--color-text-tertiary)]">{hint}</div>}
    </motion.div>
  )
}

export function Avatar({ name, src, size = 32, color }) {
  const letters = String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <span
      className="rounded-full shrink-0 inline-flex items-center justify-center font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: color || 'var(--color-brand)' }}
      aria-hidden
    >
      {letters || '?'}
    </span>
  )
}

export function AvatarStack({ people = [], max = 4, size = 26 }) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map(p => (
        <span key={p.id} title={p.name} className="ring-2 ring-[var(--color-bg-card)] rounded-full">
          <Avatar name={p.name} src={p.avatar_url} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="ring-2 ring-[var(--color-bg-card)] rounded-full bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] text-[11px] font-semibold inline-flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </div>
  )
}

export function Chip({ children, color, active, onClick, className = '' }) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors ${
        active
          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-card)]'
          : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]' + (onClick ? ' hover:text-[var(--color-text-primary)]' : '')
      } ${className}`}
    >
      {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
      {children}
    </Tag>
  )
}

/** Сегментированный переключатель (как в iOS). */
export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-[var(--color-bg-soft)] gap-0.5 overflow-x-auto max-w-full">
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`relative px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
              active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${options.map(x => x.value).join('-')}`}
                className="absolute inset-0 rounded-lg bg-[var(--color-bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">
              {o.label}
              {o.count != null && <span className="ml-1 text-[var(--color-text-tertiary)] tabular-nums">{o.count}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function timeAgo(value) {
  if (!value) return ''
  const diff = (Date.now() - new Date(value).getTime()) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн назад`
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function dueLabel(date) {
  if (!date) return null
  const d = new Date(String(date).slice(0, 10) + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((d - today) / 86400000)
  const text = days === 0 ? 'сегодня' : days === 1 ? 'завтра' : days === -1 ? 'вчера'
    : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return { text, overdue: days < 0, soon: days >= 0 && days <= 2 }
}

/** Запрос к API с токеном; бросает ошибку с текстом сервера. */
export async function api(url, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Ошибка сервера')
  return data
}
