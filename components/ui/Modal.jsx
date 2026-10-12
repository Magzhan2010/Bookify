'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Modal — окно с фокус-ловушкой, закрытием по Esc и по клику вне.
 * Заменяет нативный confirm() и самодельные оверлеи.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md'
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const onKey = e => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      // Фокус-ловушка: не даём уйти за пределы окна
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Фокус внутрь окна при открытии
    const t = setTimeout(() => {
      panelRef.current?.querySelector('input, button')?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      clearTimeout(t)
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
          onClick={e => {
            if (e.target === e.currentTarget) onClose?.()
          }}
        >
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Окно'}
            className={`w-full ${widths[size] || widths.md} bg-[var(--color-bg-card)]
              border border-[var(--color-border)] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)]
              shadow-[var(--shadow-3)] max-h-[90vh] flex flex-col`}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-3 p-5 pb-0">
                <div className="min-w-0">
                  {title && (
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-1 -mt-1 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)] transition-colors shrink-0"
                  aria-label="Закрыть"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="p-5 overflow-y-auto flex-1">{children}</div>

            {footer && (
              <div className="p-5 pt-0 flex gap-2 justify-end">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}