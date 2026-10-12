'use client'

import { Inbox, AlertCircle, SearchX } from 'lucide-react'
import Button from './Button'

/**
 * EmptyState — пустое состояние / ошибка / нет результатов.
 * variant: default | error | no-results
 */

const ICONS = {
  default: Inbox,
  error: AlertCircle,
  'no-results': SearchX
}

const COLORS = {
  default: 'text-[var(--color-text-tertiary)] bg-[var(--color-bg-soft)]',
  error: 'text-[var(--color-danger)] bg-[var(--color-danger)]/10',
  'no-results': 'text-[var(--color-text-tertiary)] bg-[var(--color-bg-soft)]'
}

export default function EmptyState({
  variant = 'default',
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
  className = ''
}) {
  const FallbackIcon = ICONS[variant] || Inbox

  return (
    <div
      className={`text-center py-12 px-6 border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] ${className}`}
    >
      <div
        className={`w-14 h-14 rounded-[var(--radius-lg)] mx-auto mb-4 flex items-center justify-center ${
          COLORS[variant] || COLORS.default
        }`}
      >
        {Icon ? <Icon size={24} /> : <FallbackIcon size={24} />}
      </div>

      {title && (
        <p className="text-[15px] font-medium text-[var(--color-text-primary)] mb-1">{title}</p>
      )}
      {description && (
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-5 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}