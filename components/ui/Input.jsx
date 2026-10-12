'use client'

import { useId } from 'react'

/**
 * Input — единое поле ввода.
 * Сам подставляет id, связывает label через htmlFor и помечает aria-invalid.
 */

export default function Input({
  label,
  hint,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  containerClassName = '',
  ...props
}) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1.5"
        >
          {label}
          {props.required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none"
          />
        )}
        <input
          id={id}
          type={type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`
            w-full h-11 bg-[var(--color-bg-soft)] text-[var(--color-text-primary)]
            placeholder-[var(--color-text-tertiary)] text-[14px]
            border rounded-[var(--radius-md)] transition-all
            outline-none focus:bg-[var(--color-bg-card)]
            focus:border-[var(--color-brand)]/50
            focus:ring-4 focus:ring-[var(--color-brand)]/10
            disabled:opacity-50
            ${Icon ? 'pl-11 pr-3.5' : 'px-3.5'}
            ${error
              ? 'border-[var(--color-danger)]/60'
              : 'border-transparent hover:border-[var(--color-border)]'}
            ${className}
          `}
          {...props}
        />
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[12px] text-[var(--color-text-tertiary)]">
          {hint}
        </p>
      )}
    </div>
  )
}