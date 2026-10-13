'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, X, LogOut, BookMarked } from 'lucide-react'
import { ThemeToggle } from '../../components/ThemeContext'

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
    if (!token) return
    // Безопасный парсинг — не падает на невалидном токене
    import('../../lib/jwt').then(({ parseJwt }) => {
      const payload = parseJwt(token)
      if (payload) {
        setUser(payload)
      } else {
        localStorage.removeItem('token')
      }
    }).catch(() => {
      localStorage.removeItem('token')
    })
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

  const isStaff = user?.role === 'librarian'

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--color-bg-overlay)] backdrop-blur-xl border-b border-[var(--color-border)]'
          : 'bg-[var(--color-bg-overlay)] backdrop-blur-md border-b border-transparent'
      }`}
    >
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 h-14 md:h-16 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/bookify-mark.svg" width={32} height={32} alt="Bookify" className="rounded-lg shrink-0" />
          <div className="font-semibold text-[16px] tracking-tight text-[var(--color-text-primary)]">Bookify</div>
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

          {/* Переключатель темы — на видном месте, справа в шапке */}
          <ThemeToggle size="md" className="ml-1" />

          {user ? (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={handleProfile}
                className="w-9 h-9 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center font-semibold text-[14px] hover:bg-[var(--color-brand-hover)] transition-colors"
              >
                {avatarLetter}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)] transition-colors"
                title="Выйти"
                aria-label="Выйти"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-[14px] font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand)] transition-colors"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white text-[14px] font-medium transition-colors"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          <ThemeToggle size="md" />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2.5 rounded-xl hover:bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] transition-colors"
            aria-label="Меню"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : (
              <div className="flex flex-col gap-[5px]">
                <span className="w-5 h-[1.5px] bg-current rounded-full" />
                <span className="w-5 h-[1.5px] bg-current rounded-full" />
                <span className="w-5 h-[1.5px] bg-current rounded-full" />
              </div>
            )}
          </button>
        </div>
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
            className="lg:hidden fixed top-[100px] left-0 right-0 bottom-0 bg-[var(--color-bg)] z-40 overflow-y-auto p-6 flex flex-col gap-3"
          >
            {user && (
              <button
                onClick={handleProfile}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-left transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center font-semibold text-lg">
                  {avatarLetter}
                </div>
                <div>
                  <div className="font-semibold text-[15px]">{user.name}</div>
                  <div className="text-[12px] text-[var(--color-text-tertiary)]">{user.email}</div>
                </div>
              </button>
            )}

            <MobileLink href="/library" icon={<BookMarked size={18} />} router={router} label="Каталог" />

            {isStaff && (
              <MobileLink href="/librarian" icon={<BookMarked size={18} />} router={router} label="Библиотека" />
            )}

            {user && (
              <button
                onClick={handleLogout}
                className="mt-2 flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15 transition-colors"
              >
                <LogOut size={18} /> Выйти
              </button>
            )}

            {!user && (
              <div className="flex gap-2 mt-2">
                <Link href="/login" className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-center font-medium text-[var(--color-text-primary)]">Войти</Link>
                <Link href="/register" className="flex-1 py-3 rounded-xl bg-[var(--color-brand)] text-white text-center font-medium">Регистрация</Link>
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
        ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)]'
    }`}
  >
    {icon}
    {label}
  </Link>
)

const MobileLink = ({ href, icon, label, router }) => (
  <button
    onClick={() => router.push(href)}
    className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-left font-medium transition-colors"
  >
    <span className="text-[var(--color-brand)]">{icon}</span> {label}
  </button>
)

const SearchBox = ({ query, setQuery, loading, result, router, compact }) => (
  <div className="relative w-full">
    <div className="relative">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none" />
      <input
        type="text"
        className={`w-full bg-[var(--color-bg-soft)] border border-transparent pl-10 pr-3.5 ${compact ? 'py-2 text-sm' : 'py-2.5'} rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-brand)]/30 focus:bg-[var(--color-bg-card)] focus:ring-4 focus:ring-[var(--color-brand)]/10 transition-all`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Поиск книг…"
      />
      {loading && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--color-brand)]/30 border-t-[var(--color-brand)] rounded-full animate-spin" />
      )}
    </div>
    <AnimatePresence>
      {result.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="absolute top-full mt-2 left-0 right-0 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden z-50 shadow-[var(--shadow-elevated)]"
        >
          <div className="p-2 max-h-72 overflow-y-auto">
            {result.map(book => (
              <button
                key={book.id}
                onClick={() => { router.push(`/books/${book.id}`); setQuery('') }}
                className="w-full flex items-center gap-3 p-2 hover:bg-[var(--color-bg-soft)] rounded-xl transition-colors text-left text-[var(--color-text-primary)]"
              >
                <div className="relative w-8 h-11 rounded-[3px] overflow-hidden bg-[var(--color-bg-soft)] shrink-0">
                  {book.cover_url && (
                    <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="32px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{book.title}</p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{book.author}</p>
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