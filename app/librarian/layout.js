'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookMarked, ArrowDownToLine, Search,
  Users, History, BarChart3, RefreshCw, LogOut, BookOpen, Bell
} from 'lucide-react'

const navItems = [
  { href: '/librarian', label: 'Дашборд', icon: LayoutDashboard, exact: true },
  { href: '/librarian/requests', label: 'Заявки учеников', icon: Bell },
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
      if (!['librarian'].includes(payload.role)) {
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-black/8 z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-5 border-b border-black/5">
            <Link href="/librarian" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1a56db] flex items-center justify-center">
                <BookOpen size={17} className="text-white" />
              </div>
              <div>
                <div className="font-semibold text-[15px] text-[#1d1d1f]">Bookify</div>
                <div className="text-[10px] uppercase tracking-wider text-[#1a56db] font-medium">Библиотека</div>
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
                      ? 'bg-[#1a56db] text-white'
                      : 'text-[#6e6e73] hover:bg-black/[0.04] hover:text-[#1d1d1f]'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-black/5">
            <div className="bg-[#f5f5f7] rounded-xl p-3 flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-[#1a56db] flex items-center justify-center font-semibold text-white text-[13px] shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] truncate text-[#1d1d1f]">{user?.name}</div>
                <div className="text-[11px] text-[#86868b] truncate">{user?.role === 'admin' ? 'Администратор' : 'Библиотекарь'}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/15 transition-colors text-[13px] font-medium"
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
        <div className="lg:hidden sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-[#f5f5f7]"
          >
            <div className="flex flex-col gap-1">
              <span className="w-4 h-[1.5px] bg-[#1d1d1f] rounded-full" />
              <span className="w-4 h-[1.5px] bg-[#1d1d1f] rounded-full" />
              <span className="w-4 h-[1.5px] bg-[#1d1d1f] rounded-full" />
            </div>
          </button>
          <span className="text-[14px] font-semibold text-[#1d1d1f]">Bookify · Библиотека</span>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}