'use client'

/**
 * Badge — метка статуса.
 * tone: neutral | brand | success | warning | danger
 */

const TONES = {
  neutral: 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]',
  brand: 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]',
  success: 'bg-[var(--color-success)]/12 text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]/12 text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]/12 text-[var(--color-danger)]'
}

export default function Badge({ tone = 'neutral', icon: Icon, className = '', children }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-1
        rounded-[var(--radius-sm)] text-[12px] font-medium
        ${TONES[tone] || TONES.neutral} ${className}
      `}
    >
      {Icon && <Icon size={12} className="shrink-0" />}
      {children}
    </span>
  )
}