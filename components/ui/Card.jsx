'use client'

/**
 * Card — единая поверхность.
 * padding: none | sm | md | lg
 */

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
}

export default function Card({
  padding = 'md',
  hover = false,
  className = '',
  children,
  ...props
}) {
  return (
    <div
      className={`
        bg-[var(--color-bg-card)] border border-[var(--color-border)]
        rounded-[var(--radius-lg)] ${PADDING[padding] || PADDING.md}
        ${hover
          ? 'transition-all hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-2)]'
          : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}