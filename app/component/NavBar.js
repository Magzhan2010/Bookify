'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, X, Heart, LogOut, User, BookMarked, Shield, BarChart3 } from 'lucide-react'

const Navbar = () => {
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState([])
  const [loading, setLoading] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMobileOpen(false)
    setResult([])
  }, [pathname])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser(payload)
      } catch (e) {
        console.error('Token error')
      }
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Search with debounce
  useEffect(() => {
    const searchFetch = async () => {
      if (!query.trim()) {
        setResult([])
        return
      }
      try {
        setLoading(true)
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResult(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    const t = setTimeout(searchFetch, 250)
    return () => clearTimeout(t)
  }, [query])

  // Body scroll lock for mobile menu
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const avatarLetter = user?.name?.charAt(0).toUpperCase() || '?'

  const handleLogout = () => {
    localStorage.removeItem('token')
    setMobileOpen(false)
    router.push('/')
  }

  const handleProfile = () => {
    setMobileOpen(false)
    router.push('/profile')
  }

  const isStaff = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'librarian'

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-[#06070d]/85 backdrop-blur-2xl border-b border-[#1a1f30]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 h-16 md:h-[72px] flex justify-between items-center">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-xl overflow-hidden ring-1 ring-[#e8b94e]/20 group-hover:ring-[#e8b94e]/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-[#e8b94e]/20 to-transparent" />
            <Image src="/lb_logo.png" width={44} height={44} alt="DLS" className="object-contain relative z-10"/>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg md:text-xl font-bold tracking-tight">
              Book<span className="text-gradient-gold">ify</span>
            </span>
              <span className="hidden sm:block text-[9px] uppercase tracking-[0.25em] text-[#5a6383] font-medium mt-0.5">
                DLS Library
              </span>
            </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-2 flex-1 justify-center">
          <SearchBox query={query} setQuery={setQuery} loading={loading} result={result} router={router} />
        </div>

        {/* Desktop right */}
        <div className="hidden lg:flex items-center gap-2">
          {isStaff && (
            <NavLink
              href="/librarian"
              icon={<BookMarked size={16} />}
              label="Библиотека"
              active={pathname.startsWith('/librarian')}
            />
          )}
          {user?.role === 'admin' && (
            <NavLink
              href="/admin"
              icon={<Shield size={16} />}
              label="Админ"
              active={pathname.startsWith('/admin')}
            />
          )}
          {user?.role === 'teacher' && (
            <NavLink
              href="/admin/dashboard"
              icon={<BarChart3 size={16} />}
              label="Отчёты"
              active={pathname.startsWith('/admin/dashboard')}
            />
          )}

          <Link
            href="/donate"
            className="px-3 py-2 text-sm font-medium text-[#94a3b8] hover:text-[#ff5d8f] transition-colors flex items-center gap-1.5"
          >
            <Heart size={14} className="text-[#ff5d8f]" /> Поддержать
          </Link>

          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={handleProfile}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8b94e] to-[#9c6f25] flex items-center justify-center font-bold text-[#06070d] shadow-lg shadow-[#e8b94e]/20 hover:scale-105 transition-transform"
              >
                {avatarLetter}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-[#5a6383] hover:text-[#ff5d8f] hover:bg-white/5 transition-colors"
                title="Выйти"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-[#94a3b8] hover:text-white transition-colors"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold text-sm hover:shadow-lg hover:shadow-[#e8b94e]/30 transition-all active:scale-95"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition-colors"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={22} /> : (
            <div className="flex flex-col gap-1">
              <span className="w-5 h-0.5 bg-white rounded-full" />
              <span className="w-5 h-0.5 bg-white rounded-full" />
              <span className="w-5 h-0.5 bg-white rounded-full" />
            </div>
          )}
        </button>
      </div>

      {/* Mobile search (always visible) */}
      <div className="lg:hidden px-4 pb-3">
        <SearchBox query={query} setQuery={setQuery} loading={loading} result={result} router={router} compact />
      </div>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed top-[120px] left-0 right-0 bottom-0 bg-[#06070d] z-40 overflow-y-auto p-6 flex flex-col gap-4"
          >
            {user && (
              <button
                onClick={handleProfile}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8b94e] to-[#9c6f25] flex items-center justify-center font-bold text-[#06070d] text-lg">
                  {avatarLetter}
                </div>
                <div>
                  <div className="font-bold text-white">{user.name}</div>
                  <div className="text-xs text-[#5a6383]">{user.email}</div>
                </div>
              </button>
            )}

            {isStaff && (
              <MobileLink href="/librarian" icon={<BookMarked size={18} />} router={router} label="Библиотека" />
            )}
            {user?.role === 'admin' && (
              <MobileLink href="/admin" icon={<Shield size={18} />} router={router} label="Админ-панель" />
            )}
            {user?.role === 'teacher' && (
              <MobileLink href="/admin/dashboard" icon={<BarChart3 size={18} />} router={router} label="Отчёты" />
            )}
            <MobileLink href="/donate" icon={<Heart size={18} />} router={router} label="Поддержать проект" />

            {user && (
              <button
                onClick={handleLogout}
                className="mt-2 flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <LogOut size={18} /> Выйти
              </button>
            )}

            {!user && (
              <div className="flex gap-2 mt-4">
                <Link href="/login" className="flex-1 py-3 rounded-xl border border-white/10 text-center font-semibold">Войти</Link>
                <Link href="/register" className="flex-1 py-3 rounded-xl bg-[#e8b94e] text-[#06070d] text-center font-bold">Регистрация</Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

const NavLink = ({ href, icon, label, active }) => {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium rounded-xl flex items-center gap-1.5 transition-all ${
        active
          ? 'bg-[#e8b94e]/10 text-[#e8b94e]'
          : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

const MobileLink = ({ href, icon, label, router }) => (
  <button
    onClick={() => router.push(href)}
    className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-left font-semibold text-white"
  >
    <span className="text-[#e8b94e]">{icon}</span> {label}
  </button>
)

const SearchBox = ({ query, setQuery, loading, result, router, compact }) => (
  <div className="relative w-full max-w-md">
    <div className="relative">
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6383]" />
      <input
        type="text"
        placeholder="Найти книгу..."
        className={`w-full bg-white/5 border border-white/10 pl-11 pr-4 ${
          compact ? 'py-2 text-sm' : 'py-2.5'
        } rounded-xl text-white placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/40 focus:bg-white/10 transition-all`}
        onChange={e => setQuery(e.target.value)}
        value={query}
      />
      {loading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
      )}
    </div>
    <AnimatePresence>
      {result.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="absolute top-full mt-2 left-0 right-0 bg-[#11141f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl shadow-black/50"
        >
          <div className="p-2 max-h-80 overflow-y-auto">
            {result.map(book => (
              <button
                key={book.id}
                onClick={() => { router.push(`/books/${book.id}`); setQuery('') }}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <div className="relative w-9 h-12 rounded overflow-hidden bg-white/5 shrink-0">
                  {book.cover_url && (
                    <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="36px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{book.title}</p>
                  <p className="text-xs text-[#5a6383] truncate">{book.author}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)

export default Navbar