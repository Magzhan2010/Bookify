'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, X, LogOut, BookMarked, Shield, BarChart3 } from 'lucide-react'

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
      } catch (e) { console.error('Token error') }
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const searchFetch = async () => {
      if (!query.trim()) {
        setResult([])
        return
      }
      try {
        setLoading(true)
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
        setResult(await res.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    const t = setTimeout(searchFetch, 250)
    return () => clearTimeout(t)
  }, [query])

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
          ? 'bg-white/85 backdrop-blur-xl border-b border-black/5'
          : 'bg-white/70 backdrop-blur-md border-b border-transparent'
      }`}
    >
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 h-14 md:h-16 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white ring-1 ring-black/5">
            <Image src="/lb_logo.png" width={32} height={32} alt="DLS" className="object-contain" />
          </div>
          <div className="font-semibold text-[16px] tracking-tight">Bookify</div>
        </Link>

        <div className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-md mx-6">
          <SearchBox query={query} setQuery={setQuery} loading={loading} result={result} router={router} />
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {isStaff && (
            <NavLink
              href="/librarian"
              icon={<BookMarked size={15} />}
              label="Библиотека"
              active={pathname.startsWith('/librarian')}
            />
          )}
          {user?.role === 'admin' && (
            <NavLink
              href="/admin"
              icon={<Shield size={15} />}
              label="Админ"
              active={pathname.startsWith('/admin')}
            />
          )}
          {user?.role === 'teacher' && (
            <NavLink
              href="/teacher"
              icon={<BarChart3 size={15} />}
              label="Аналитика"
              active={pathname.startsWith('/teacher')}
            />
          )}

          {user ? (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={handleProfile}
                className="w-9 h-9 rounded-full bg-[#1a56db] text-white flex items-center justify-center font-semibold text-[14px] hover:bg-[#1849b8] transition-colors"
              >
                {avatarLetter}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors"
                title="Выйти"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-[14px] font-medium text-[#1d1d1f] hover:text-[#1a56db] transition-colors"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[14px] font-medium transition-colors"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-black/[0.04] transition-colors"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={20} /> : (
            <div className="flex flex-col gap-[5px]">
              <span className="w-5 h-[1.5px] bg-[#1d1d1f] rounded-full" />
              <span className="w-5 h-[1.5px] bg-[#1d1d1f] rounded-full" />
              <span className="w-5 h-[1.5px] bg-[#1d1d1f] rounded-full" />
            </div>
          )}
        </button>
      </div>

      <div className="lg:hidden px-4 pb-3">
        <SearchBox query={query} setQuery={setQuery} loading={loading} result={result} router={router} compact />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="lg:hidden fixed top-[100px] left-0 right-0 bottom-0 bg-white z-40 overflow-y-auto p-6 flex flex-col gap-3"
          >
            {user && (
              <button
                onClick={handleProfile}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#f5f5f7] hover:bg-[#ececec] text-[#1d1d1f] text-left"
              >
                <div className="w-11 h-11 rounded-full bg-[#1a56db] text-white flex items-center justify-center font-semibold text-lg">
                  {avatarLetter}
                </div>
                <div>
                  <div className="font-semibold text-[15px]">{user.name}</div>
                  <div className="text-[12px] text-[#86868b]">{user.email}</div>
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
              <MobileLink href="/teacher" icon={<BarChart3 size={18} />} router={router} label="Аналитика" />
            )}

            {user && (
              <button
                onClick={handleLogout}
                className="mt-2 flex items-center gap-3 p-4 rounded-2xl bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/15"
              >
                <LogOut size={18} /> Выйти
              </button>
            )}

            {!user && (
              <div className="flex gap-2 mt-2">
                <Link href="/login" className="flex-1 py-3 rounded-xl border border-black/10 text-center font-medium text-[#1d1d1f]">Войти</Link>
                <Link href="/register" className="flex-1 py-3 rounded-xl bg-[#1a56db] text-white text-center font-medium">Регистрация</Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

const NavLink = ({ href, icon, label, active }) => (
  <Link
    href={href}
    className={`px-3 py-2 text-[14px] font-medium rounded-lg flex items-center gap-1.5 transition-all ${
      active
        ? 'bg-[#1a56db]/10 text-[#1a56db]'
        : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04]'
    }`}
  >
    {icon}
    {label}
  </Link>
)

const MobileLink = ({ href, icon, label, router }) => (
  <button
    onClick={() => router.push(href)}
    className="flex items-center gap-3 p-4 rounded-2xl bg-[#f5f5f7] hover:bg-[#ececec] text-[#1d1d1f] text-left font-medium"
  >
    <span className="text-[#1a56db]">{icon}</span> {label}
  </button>
)

const SearchBox = ({ query, setQuery, loading, result, router, compact }) => (
  <div className="relative w-full">
    <div className="relative">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none" />
      <input
        type="text"
        className={`w-full bg-[#f5f5f7] border border-transparent pl-10 pr-3.5 ${compact ? 'py-2 text-sm' : 'py-2.5'} rounded-xl text-[#1d1d1f] placeholder-[#86868b] outline-none focus:border-[#1a56db]/30 focus:bg-white focus:ring-4 focus:ring-[#1a56db]/10 transition-all`}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {loading && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
      )}
    </div>
    <AnimatePresence>
      {result.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="absolute top-full mt-2 left-0 right-0 bg-white border border-black/10 rounded-2xl overflow-hidden z-50 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          <div className="p-2 max-h-72 overflow-y-auto">
            {result.map(book => (
              <button
                key={book.id}
                onClick={() => { router.push(`/books/${book.id}`); setQuery('') }}
                className="w-full flex items-center gap-3 p-2 hover:bg-[#f5f5f7] rounded-xl transition-colors text-left"
              >
                <div className="relative w-8 h-11 rounded-[3px] overflow-hidden bg-[#f5f5f7] shrink-0">
                  {book.cover_url && (
                    <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="32px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{book.title}</p>
                  <p className="text-[11px] text-[#86868b] truncate">{book.author}</p>
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