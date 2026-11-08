'use client'

import { usePathname } from 'next/navigation'

/**
 * Где открыта страница-инструмент: в панели библиотекаря или на командной
 * платформе. Одни и те же страницы (книги, ученики, цитаты, аналитика)
 * работают в обоих местах — ссылки строятся от base.
 */
export function useArea() {
  const pathname = usePathname() || ''
  const team = pathname === '/team' || pathname.startsWith('/team/')
  return { team, base: team ? '/team' : '/librarian' }
}
