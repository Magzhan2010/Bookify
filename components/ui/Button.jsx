'use client'

import { Loader2 } from 'lucide-react'

/**
 * Button — единая кнопка проекта.
 *
 * variant: primary | secondary | ghost | danger | success
 * size:    sm (36px) | md (44px) | lg (52px)
 *         md — базовый, зона нажатия не меньше 44px.
 */

const VARIANTS = {
  primary:
    'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] active:brightness-95 shadow-[var(--shadow-brand)]',
  secondary:
    'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]',
  ghost:
    'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]',
  danger:
    'bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15',
  success:
    'bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/15'
}

const SIZES = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 px-4 text-[14px] gap-2',
  lg: 'h-13 px-6 text-[15px] gap-2'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium
        rounded-[var(--radius-md)] transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[var(--color-brand)]/60 focus-visible:ring-offset-1
        disabled:opacity-45 disabled:cursor-not-allowed
        active:scale-[0.98]
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size] || SIZES.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : 16} className="shrink-0" />
      )}
      {children}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 14 : 16} className="shrink-0" />}
    </button>
  )
}