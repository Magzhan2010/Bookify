'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookMarked, ArrowDownToLine, Search,
  Users, History, BarChart3, RefreshCw, LogOut, BookOpen, Library
} from 'lucide-react'

const navItems = [
  { href: '/librarian', label: 'Дашборд', icon: LayoutDashboard, exact: true },
  { href: '/librarian/requests', label: 'Заявки учеников', icon: BookMarked },
  { href: '/librarian/issue', label: 'Выдать книгу', icon: BookOpen },
  { href: '/librarian/returns', label: 'Принять возврат', icon: ArrowDownToLine },
  { href: '/librarian/lookup', label: 'У кого книга?', icon: Search },
  { href: '/librarian/students', label: 'Ученики', icon: Users },
  { href: '/librarian/history', label: 'История', icon: History },
  { href: '/librarian/analytics', label: 'Аналитика', icon: BarChart3 }
]

export default function LibrarianLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    import('../../lib/jwt').then(({ parseJwt }) => {
      const payload = parseJwt(token)
      if (!payload) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }
      if (!['librarian'].includes(payload.role)) {
        router.push('/login')
        return
      }
      setUser(payload)
      setReady(true)
    }).catch(() => {
      router.push('/login')
    })
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-card)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-brand)]/30 border-t-[#1a56db] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-5 border-b border-[var(--color-border)]">
            <Link href="/librarian" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] flex items-center justify-center">
                <BookOpen size={17} className="text-white" />
              </div>
              <div>
                <div className="font-semibold text-[15px] text-[var(--color-text-primary)]">Bookify</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-brand)] font-medium">Библиотека</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
            {navItems.map(item => {
              const Icon = item.icon
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-all ${
                    active
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-black/[0.04] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-[var(--color-border)]">
            <div className="bg-[var(--color-bg-soft)] rounded-xl p-3 flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-[var(--color-brand)] flex items-center justify-center font-semibold text-white text-[13px] shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] truncate text-[var(--color-text-primary)]">{user?.name}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">Библиотекарь</div>
              </div>
            </div>
            <Link
              href="/library"
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors text-[13px] font-medium mb-2"
            >
              <Library size={14} /> Открыть каталог
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15 transition-colors text-[13px] font-medium"
            >
              <LogOut size={14} /> Выйти
            </button>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 lg:ml-0">
        <div className="lg:hidden sticky top-0 z-30 bg-[var(--color-bg-card)]/85 backdrop-blur-xl border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-[var(--color-bg-soft)]"
          >
            <div className="flex flex-col gap-1">
              <span className="w-4 h-[1.5px] bg-[#1d1d1f] rounded-full" />
              <span className="w-4 h-[1.5px] bg-[#1d1d1f] rounded-full" />
              <span className="w-4 h-[1.5px] bg-[#1d1d1f] rounded-full" />
            </div>
          </button>
          <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">Bookify · Библиотека</span>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}