'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, ListChecks, FileText, Users2, Activity, GraduationCap,
  BarChart3, Trophy, Library, Quote, LogOut, BookOpen, BookMarked, Menu, X, Crown, CalendarClock
} from 'lucide-react'
import { ThemeToggle } from '../../components/ThemeContext'
import { Avatar } from '../../components/team/ui'
import { TeamCtx } from '../../components/team/TeamContext'
import { fetchTeamMe, clearTeamMe } from '../../lib/useTeamMe'

const GROUPS = [
  {
    title: 'Работа',
    items: [
      { href: '/team', label: 'Обзор', icon: LayoutGrid, exact: true },
      { href: '/team/tasks', label: 'Задачи', icon: ListChecks },
      { href: '/team/reports', label: 'Отчёты', icon: FileText }
    ]
  },
  {
    title: 'Команда',
    items: [{ href: '/team/people', label: 'Команды и люди', icon: Users2 }]
  },
  {
    title: 'Ученики',
    items: [
      { href: '/team/monitoring', label: 'Мониторинг', icon: Activity },
      { href: '/team/students', label: 'Ученики', icon: GraduationCap },
      { href: '/team/analytics', label: 'Аналитика', icon: BarChart3 },
      { href: '/team/leaders', label: 'Лидеры', icon: Trophy }
    ]
  },
  {
    title: 'Библиотека',
    items: [
      { href: '/team/books', label: 'Книги', icon: Library },
      { href: '/team/loans', label: 'Книги на руках', icon: CalendarClock },
      { href: '/team/quotes', label: 'Цитаты', icon: Quote }
    ]
  }
]

export default function TeamLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState(undefined)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const value = await fetchTeamMe()
      if (!value) {
        router.replace(localStorage.getItem('token') ? '/library' : '/login')
        return
      }
      setMe(value)
    } catch {
      setMe(null)
    }
  }, [router])

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.replace('/login')
      return
    }
    refresh()
  }, [refresh, router])

  useEffect(() => { setOpen(false) }, [pathname])

  const logout = () => {
    clearTeamMe()
    localStorage.removeItem('token')
    router.push('/')
  }

  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-soft)]">
        <div className="w-7 h-7 border-2 border-[var(--color-text-primary)]/15 border-t-[var(--color-text-primary)] rounded-full animate-spin" />
      </div>
    )
  }
  if (me === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--color-bg-soft)] text-[14px] text-[var(--color-text-secondary)]">
        Не удалось загрузить платформу.
        <button onClick={refresh} className="px-4 py-2 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg-card)] font-medium">
          Повторить
        </button>
      </div>
    )
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-2">
        <Link href="/team" className="flex items-center gap-2.5 min-w-0">
          <Image src="/lb_logo.png" width={34} height={34} alt="" className="w-[34px] h-[34px] object-contain" />
          <div className="min-w-0 leading-tight">
            <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">Bookify Team</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)]">Платформа команды проекта</div>
          </div>
        </Link>
        <ThemeToggle size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map(group => (
          <div key={group.title} className="mt-4 first:mt-1">
            <div className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              {group.title}
            </div>
            {group.items.map(item => {
              const Icon = item.icon
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] font-medium transition-colors ${
                    active
                      ? 'text-[var(--color-bg-card)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-text-primary)]/[0.04]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="team-nav-active"
                      className="absolute inset-0 rounded-xl bg-[var(--color-text-primary)]"
                      transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                    />
                  )}
                  <Icon size={16} className="relative" />
                  <span className="relative">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--color-border)] space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar name={me.name} src={me.avatar_url} size={34} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate text-[var(--color-text-primary)]">{me.name}</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1 truncate">
              {me.is_lead && <Crown size={11} className="text-[#c97a00]" />}
              {me.is_lead ? 'Teamlead' : me.title || 'Участник'}
            </div>
          </div>
        </div>
        <Link href="/library" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-text-primary)]/[0.04]">
          <BookOpen size={15} /> Каталог для учеников
        </Link>
        {me.role === 'librarian' && (
          <Link href="/librarian" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-text-primary)]/[0.04]">
            <BookMarked size={15} /> Панель библиотекаря
          </Link>
        )}
        <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">
          <LogOut size={15} /> Выйти
        </button>
      </div>
    </div>
  )

  return (
    <TeamCtx.Provider value={{ me, refresh }}>
      <div className="min-h-screen bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] flex">
        <aside className="hidden lg:block sticky top-0 h-screen w-[248px] shrink-0 bg-[var(--color-bg-card)]/70 backdrop-blur-xl border-r border-[var(--color-border)]">
          {sidebar}
        </aside>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                className="fixed top-0 left-0 z-50 h-screen w-[264px] bg-[var(--color-bg-card)] border-r border-[var(--color-border)] lg:hidden"
              >
                <button onClick={() => setOpen(false)} aria-label="Закрыть меню" className="absolute top-4 right-3 p-2 rounded-lg text-[var(--color-text-secondary)]">
                  <X size={18} />
                </button>
                {sidebar}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 min-w-0">
          <div className="lg:hidden sticky top-0 z-30 bg-[var(--color-bg-card)]/80 backdrop-blur-xl border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3">
            <button onClick={() => setOpen(true)} aria-label="Меню" className="p-2 -ml-2 rounded-lg">
              <Menu size={18} />
            </button>
            <span className="text-[14px] font-semibold">Bookify Team</span>
          </div>
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </TeamCtx.Provider>
  )
}
