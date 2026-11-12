'use client'

import { usePathname } from 'next/navigation'

// Разделы с нижним меню на телефоне — футер поднимаем над ним
const WITH_BOTTOM_NAV = ['/library', '/quotes', '/shop', '/leaderboard', '/game', '/profile', '/teacher', '/books', '/match']

/** Подпись разработчика внизу каждой страницы. */
export default function DevCredit() {
  const path = usePathname() || '/'
  if (path.startsWith('/tv')) return null
  const lifted = WITH_BOTTOM_NAV.some(p => path === p || path.startsWith(p + '/'))
  return (
    <footer
      className={`mt-auto w-full border-t border-[var(--color-border)] bg-[var(--color-bg-soft)] py-4 px-4 text-center text-[12px] text-[var(--color-text-tertiary)] ${
        lifted ? 'pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-4' : ''
      }`}
    >
      Bookify · Divergents Leadership School · developed by{' '}
      <a href="https://github.com/Magzhan2010" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
        Zhenis Magzhan
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z"></path>
        </svg>
        <span className="sr-only">GitHub</span>
      </a>
    </footer>
  )
}
