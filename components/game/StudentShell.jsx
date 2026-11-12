'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Library, UserRound, ShoppingBag, Trophy, Gamepad2, LogOut, BookMarked, ArrowUpRight, Quote, Users2, GraduationCap
} from 'lucide-react'
import { ThemeToggle } from '../ThemeContext'
import { GameProvider, useGame } from './GameContext'
import { parseJwt } from '../../lib/jwt'
import { useTeamMe } from '../../lib/useTeamMe'
import { useMyAvatar } from '../../lib/useMyAvatar'
import NotificationBell from '../NotificationBell'
import { useT, LangSwitch } from '../../lib/i18n'

// Меню сгруппировано по смыслу: читать → играть → я
const NAV_GROUPS = [
  {
    title: 'Читать',
    items: [
      { href: '/library', label: 'Каталог', short: 'Книги', icon: Library },
      { href: '/quotes', label: 'Цитаты', short: 'Цитаты', icon: Quote }
    ]
  },
  {
    title: 'Игра',
    items: [
      { href: '/shop', label: 'Магазин призов', short: 'Магазин', icon: ShoppingBag, badge: 'shop' },
      { href: '/leaderboard', label: 'Лидеры', short: 'Лидеры', icon: Trophy },
      { href: '/game', label: 'Как это работает', short: 'Правила', icon: Gamepad2 }
    ]
  },
  {
    title: 'Я',
    items: [{ href: '/profile', label: 'Мой профиль', short: 'Профиль', icon: UserRound }]
  }
]
// Учитель участвует наравне с учениками + раздел «Мой класс»
const TEACHER_GROUPS = [
  NAV_GROUPS[0],
  NAV_GROUPS[1],
  { title: 'Учитель', items: [{ href: '/teacher', label: 'Мой класс', short: 'Класс', icon: GraduationCap }] },
  NAV_GROUPS[2]
]

// Нижняя панель на телефоне — плоский список в привычном порядке
const NAV = [
  NAV_GROUPS[0].items[0], NAV_GROUPS[2].items[0], NAV_GROUPS[1].items[0],
  NAV_GROUPS[1].items[1], NAV_GROUPS[0].items[1], NAV_GROUPS[1].items[2]
]

/**
 * Оболочка ученического раздела: боковое меню на компьютере,
 * нижняя панель на телефоне, игровой баланс всегда на виду.
 */
export default function StudentShell({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const payload = token ? parseJwt(token) : null
    if (!payload) {
      localStorage.removeItem('token')
      router.replace('/login')
      return
    }
    setUser(payload)
    setChecked(true)
  }, [router])

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[var(--color-brand)] rounded-full animate-spin" />
      </div>
    )
  }

  // Учителя тоже играют: монеты, призы, достижения
  const isStudent = user?.role === 'student' || user?.role === 'teacher'

  return (
    <GameProvider enabled={isStudent}>
      <div className="min-h-screen">
        <Sidebar user={user} isStudent={isStudent} />
        <div className="lg:pl-[256px] pb-20 lg:pb-0 min-w-0">
          {children}
        </div>
        <BottomNav isStudent={isStudent} isTeacher={user?.role === 'teacher'} />
        {/* На телефоне колокольчик — плавающая кнопка над нижней панелью */}
        <div className="lg:hidden fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-3 z-50 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
          <NotificationBell align="right" up />
        </div>
      </div>
    </GameProvider>
  )
}

function useActive() {
  const pathname = usePathname() || ''
  return href => pathname === href || pathname.startsWith(href + '/') ||
    (href === '/library' && pathname.startsWith('/books/'))
}

function Sidebar({ user, isStudent }) {
  const { t } = useT()
  const router = useRouter()
  const isActive = useActive()
  const { summary } = useGame()
  const teamMe = useTeamMe()
  const myAvatar = useMyAvatar()

  const logout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[256px] z-40 flex-col bg-[var(--color-bg-card)] border-r border-[var(--color-border)]">
      <div className="flex items-center gap-1 pl-5 pr-3 h-16 border-b border-[var(--color-border)] shrink-0">
        <Link href="/library" className="flex items-center gap-2.5 flex-1 min-w-0">
          <Image src="/lb_logo.png" width={40} height={40} alt="Bookify" className="w-10 h-10 object-contain" />
          <div>
            <div className="font-semibold text-[15px] leading-tight text-[var(--color-text-primary)]">Bookify</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-brand)]">Read · Think · Lead</div>
          </div>
        </Link>
        <NotificationBell />
      </div>

      {isStudent && <PointsWidget summary={summary} />}

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {(user?.role === 'teacher' ? TEACHER_GROUPS : NAV_GROUPS).map(group => (
          <div key={group.title} className="mb-3 space-y-0.5">
            <div className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">{t(group.title)}</div>
            {group.items.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              const badge = item.badge === 'shop' && summary?.affordable_prizes > 0 ? summary.affordable_prizes : null
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                    active
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Icon size={17} />
                  <span className="flex-1">{t(item.label)}</span>
                  {badge && (
                    <span
                      title="Призов, на которые уже хватает баллов"
                      className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                        active ? 'bg-white text-[var(--color-brand)]' : 'bg-[#ffc93c] text-[#1f2a5c]'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}

        {teamMe && (
          <Link
            href="/team"
            className="mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-[var(--color-text-primary)] bg-[var(--color-text-primary)]/[0.05] hover:bg-[var(--color-text-primary)]/[0.08] transition-colors"
          >
            <Users2 size={17} />
            <span className="flex-1">{t('Командная платформа')}</span>
          </Link>
        )}

        {user?.role === 'librarian' && (
          <Link
            href="/librarian"
            className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-[var(--color-brand)] bg-[var(--color-brand)]/8 hover:bg-[var(--color-brand)]/12 transition-colors"
          >
            <BookMarked size={17} />
            <span className="flex-1">{t('Панель библиотекаря')}</span>
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-[var(--color-border)] space-y-2 shrink-0">
        <div className="flex items-center gap-2.5 px-2">
          <Link href="/profile" aria-label="Мой профиль" className="w-9 h-9 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center font-semibold text-[14px] shrink-0 overflow-hidden">
            {myAvatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={myAvatar} alt="" className="w-full h-full object-cover" />
              : user?.name?.charAt(0).toUpperCase() || '?'}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate text-[var(--color-text-primary)]">{user?.name}</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)]">
              {t(user?.role === 'librarian' ? 'Библиотекарь' : user?.role === 'teacher' ? 'Учитель' : 'Ученик')}
            </div>
          </div>
          <ThemeToggle size="sm" />
        </div>
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] text-[var(--color-text-tertiary)]">{t('Язык')}</span>
          <LangSwitch />
        </div>
        <div className="flex gap-2">
          <a
            href="https://dls.edu.kz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] hover:bg-[var(--color-bg-soft)] transition-colors"
          >
            {t('Сайт школы')} <ArrowUpRight size={12} />
          </a>
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium text-[var(--color-danger)] bg-[var(--color-danger)]/8 hover:bg-[var(--color-danger)]/14 transition-colors"
          >
            <LogOut size={13} /> {t('Выйти')}
          </button>
        </div>
      </div>
    </aside>
  )
}

/** Баланс, уровень и прогресс — главный «игровой» блок меню. */
function PointsWidget({ summary }) {
  const { t } = useT()
  if (!summary) {
    return <div className="mx-3 mt-3 h-[118px] rounded-2xl bg-[var(--color-bg-soft)] animate-pulse" />
  }
  const { balance, level, ranks } = summary
  return (
    <Link
      href="/profile#points"
      className="mx-3 mt-3 block rounded-2xl p-4 text-white bg-gradient-to-br from-[#1f2a5c] via-[#22348a] to-[#2f5bea] hover:brightness-110 transition"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">{t('Мои баллы')}</span>
        {ranks?.school_rank && (
          <span className="text-[11px] font-semibold text-[#ffc93c]">{t('#{n} в школе', { n: ranks.school_rank })}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-[34px] font-extrabold leading-none text-[#ffc93c]">{balance.available}</span>
        <span className="text-[12px] text-white/70">{t('монет')}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="font-semibold">{level.emoji} {t(level.title)}</span>
        {level.next && <span className="text-white/60">{t('ещё {n} до «{x}»', { n: level.toNext, x: t(level.next.title) })}</span>}
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/15 overflow-hidden">
        <div className="h-full rounded-full bg-[#ffc93c]" style={{ width: `${level.progress}%` }} />
      </div>
    </Link>
  )
}

function BottomNav({ isStudent, isTeacher }) {
  const { t } = useT()
  const isActive = useActive()
  const { summary } = useGame()
  const teamMe = useTeamMe()
  // Участникам платформы вместо «Правил» показываем вход в командную платформу
  const items = isTeacher
    ? [...NAV.slice(0, 5), TEACHER_GROUPS[2].items[0]]
    : teamMe
    ? [...NAV.slice(0, 5), { href: '/team', label: 'Команда', short: 'Команда', icon: Users2 }]
    : NAV
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-bg-card)]/95 backdrop-blur border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)]">
      <div className={`grid ${items.length === 5 ? 'grid-cols-5' : 'grid-cols-6'}`}>
        {items.map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          const showCoins = isStudent && item.href === '/profile' && summary
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
                active ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              <span className="relative">
                <Icon size={20} />
                {showCoins && (
                  <span className="absolute -top-2 -right-4 px-1 rounded-full bg-[#ffc93c] text-[#1f2a5c] text-[9px] font-bold leading-[14px]">
                    {summary.balance.available}
                  </span>
                )}
              </span>
              {t(item.short)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
