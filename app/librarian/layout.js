'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookMarked, ArrowDownToLine, Search,
  Users, History, BarChart3, RefreshCw, LogOut, BookOpen
} from 'lucide-react'

const navItems = [
  { href: '/librarian', label: 'Дашборд', icon: LayoutDashboard, exact: true },
  { href: '/librarian/issue', label: 'Выдать книгу', icon: BookMarked },
  { href: '/librarian/returns', label: 'Принять возврат', icon: ArrowDownToLine },
  { href: '/librarian/lookup', label: 'У кого книга?', icon: Search },
  { href: '/librarian/students', label: 'Ученики', icon: Users },
  { href: '/librarian/history', label: 'История', icon: History },
  { href: '/librarian/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/librarian/sync', label: 'Импорт из Sheets', icon: RefreshCw }
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
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (!['librarian', 'admin'].includes(payload.role)) {
        router.push('/login')
        return
      }
      setUser(payload)
      setReady(true)
    } catch (e) {
      router.push('/login')
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#06070d] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06070d] text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#0a0c17]/80 backdrop-blur-2xl border-r border-[#1a1f30] z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-white/5">
            <Link href="/librarian" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8b94e] to-[#9c6f25] flex items-center justify-center shadow-lg shadow-[#e8b94e]/20">
                <BookOpen size={20} className="text-[#06070d]" />
              </div>
              <div>
                <div className="font-display font-bold leading-tight">Bookify</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#e8b94e] font-bold">Библиотека</div>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                    active
                      ? 'bg-gradient-to-r from-[#e8b94e]/15 to-transparent text-[#e8b94e]'
                      : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-[#e8b94e]' : ''} />
                  <span className="font-semibold">{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="active-pill"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[#e8b94e] shadow-lg shadow-[#e8b94e]/50"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User card */}
          <div className="p-4 border-t border-white/5">
            <div className="bg-white/5 rounded-2xl p-3 flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8b94e] to-[#9c6f25] flex items-center justify-center font-bold text-[#06070d] shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{user?.name}</div>
                <div className="text-xs text-[#5a6383] truncate">{user?.role === 'admin' ? 'Администратор' : 'Библиотекарь'}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-semibold"
            >
              <LogOut size={16} /> Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:ml-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-[#06070d]/85 backdrop-blur-xl border-b border-[#1a1f30] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/5"
          >
            <div className="flex flex-col gap-1">
              <span className="w-4 h-0.5 bg-white rounded-full" />
              <span className="w-4 h-0.5 bg-white rounded-full" />
              <span className="w-4 h-0.5 bg-white rounded-full" />
            </div>
          </button>
          <span className="font-display font-bold">Bookify <span className="text-[#e8b94e]">Librarian</span></span>
        </div>

        <div className="p-4 sm:p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}