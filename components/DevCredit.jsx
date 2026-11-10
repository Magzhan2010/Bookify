'use client'

import { usePathname } from 'next/navigation'

// Разделы с нижним меню на телефоне — футер поднимаем над ним
const WITH_BOTTOM_NAV = ['/library', '/quotes', '/shop', '/leaderboard', '/game', '/profile', '/teacher', '/books']

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
      <span className="font-semibold text-[var(--color-text-secondary)]">Zhenis Magzhan</span>
    </footer>
  )
}
