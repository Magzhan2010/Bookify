'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Читаем сохранённую тему или системную
    const saved = localStorage.getItem('bookify-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = saved || (prefersDark ? 'dark' : 'light')

    setTheme(initial)
    applyTheme(initial)
    setMounted(true)

    // Следим за системной темой
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      if (!localStorage.getItem('bookify-theme')) {
        const newTheme = e.matches ? 'dark' : 'light'
        setTheme(newTheme)
        applyTheme(newTheme)
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const applyTheme = (t) => {
    const html = document.documentElement
    if (t === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next)
    localStorage.setItem('bookify-theme', next)
  }

  // Подавляем flash на SSR
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

const THEME_SIZES = {
  sm: { box: 'h-9 w-9', icon: 18, radius: 'rounded-lg' },
  md: { box: 'h-11 w-11', icon: 22, radius: 'rounded-xl' },
  lg: { box: 'h-12 w-12', icon: 26, radius: 'rounded-2xl' }
}

export function ThemeToggle({ size = 'md', className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const s = THEME_SIZES[size] || THEME_SIZES.md
  const isLight = theme === 'light'

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? 'Включить тёмную тему' : 'Включить светлую тему'}
      aria-label={isLight ? 'Включить тёмную тему' : 'Включить светлую тему'}
      className={`${s.box} ${s.radius} flex items-center justify-center shrink-0
        bg-[var(--color-bg-soft)] border border-[var(--color-border)]
        text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
        hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-brand-soft)]
        active:scale-95 transition-all duration-200 ${className}`}
    >
      {isLight ? (
        // Луна — значит «переключить на тёмную»
        <svg
          width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Солнце — значит «переключить на светлую»
        <svg
          width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4.5" />
          <line x1="12" y1="1.5" x2="12" y2="3.5" />
          <line x1="12" y1="20.5" x2="12" y2="22.5" />
          <line x1="4.6" y1="4.6" x2="6" y2="6" />
          <line x1="18" y1="18" x2="19.4" y2="19.4" />
          <line x1="1.5" y1="12" x2="3.5" y2="12" />
          <line x1="20.5" y1="12" x2="22.5" y2="12" />
          <line x1="4.6" y1="19.4" x2="6" y2="18" />
          <line x1="18" y1="6" x2="19.4" y2="4.6" />
        </svg>
      )}
    </button>
  )
}