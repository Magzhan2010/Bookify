'use client'

import { Eye, EyeOff } from 'lucide-react'

/** Кнопка «глаз» внутри поля пароля: показать / скрыть. Родитель — relative. */
export default function PasswordEye({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}
      aria-pressed={shown}
      tabIndex={0}
      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] active:scale-95 transition-all"
    >
      {shown ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  )
}
