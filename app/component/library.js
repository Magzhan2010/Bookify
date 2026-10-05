'use client'

import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, CheckCircle, Sparkles, ChevronRight, Home, Filter
} from 'lucide-react'

import Navbar from "./NavBar"
import Books from "./books"
import SkeletonGrid from "./skeleton"

export default function Library() {
  const router = useRouter()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalBooks, setTotalBooks] = useState(0)
  const [myFinishedId, setMyFinishedId] = useState([])
  const [myReadingId, setMyReadingId] = useState([])
  const [myShelf, setMyShelf] = useState(0)

  // Wizard state: массив сегментов пути. [] = корень
  const [path, setPath] = useState([])
  const [pathBooks, setPathBooks] = useState([])
  const [pathTotal, setPathTotal] = useState(0)
  const [pathLoading, setPathLoading] = useState(false)
  const [mode, setMode] = useState('wizard') // 'wizard' | 'books'

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    try { JSON.parse(atob(token.split('.')[1])) } catch (e) {
      localStorage.removeItem('token')
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setMyFinishedId((data.finished || []).map(b => Number(b.book_id)))
        setMyReadingId((data.active || []).map(b => Number(b.book_id)))
        setMyShelf(data.finished?.length || 0)
      } catch (err) { console.error(err) }
    }
    fetchProfile()
  }, [])

  // Загружаем общую статистику для hero
  useEffect(() => {
    fetch('/api/books?countOnly=true')
      .then(r => r.json())
      .then(d => setTotalBooks(parseInt(d.total) || 0))
      .catch(() => {})
  }, [])

  // Загружаем категории для текущего уровня wizard
  useEffect(() => {
    const pathStr = path.join(' / ')
    setPathLoading(true)
    fetch(`/api/genres/sub?path=${encodeURIComponent(pathStr)}`)
      .then(r => r.json())
      .then(d => {
        setPathBooks(d.categories || [])
        setPathTotal((d.categories || []).reduce((s, c) => s + c.totalCount, 0))
        setPathLoading(false)
      })
      .catch(() => setPathLoading(false))
  }, [path])

  // Загружаем книги для выбранной ветки (нижний уровень)
  const fetchBooksForPath = async (currentPage, isNewPath) => {
    const pathSegments = path.map(encodeURIComponent)
    const url = `/api/genres/${pathSegments.join('/')}/books?page=${currentPage}&limit=12`
    setLoading(true)
    try {
      const res = await fetch(url)
      const data = await res.json()
      const newBooks = data.books || []

      if (isNewPath) {
        setBooks(newBooks)
      } else {
        setBooks(prev => {
          const existingIds = new Set(prev.map(b => b.id))
          return [...prev, ...newBooks.filter(b => !existingIds.has(b.id))]
        })
      }

      if (newBooks.length < 12) setHasMore(false)
      setTotalBooks(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Если mode = 'books', грузим книги
  useEffect(() => {
    if (mode !== 'books') return
    setPage(1)
    setHasMore(true)
    fetchBooksForPath(1, true)
  }, [mode, path])

  // Infinite scroll для книг
  useEffect(() => {
    if (mode !== 'books' || loading || !hasMore) return
    const currentRef = observerRef.current
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(p => p + 1)
      }
    }, { threshold: 1.0 })
    if (currentRef) observer.observe(currentRef)
    return () => { if (currentRef) observer.unobserve(currentRef) }
  }, [mode, loading, hasMore])

  useEffect(() => {
    if (mode === 'books' && page > 1) fetchBooksForPath(page)
  }, [page])

  // Клик по категории — спускаемся глубже или показываем книги
  const handleCategoryClick = (cat) => {
    if (cat.hasChildren && cat.totalCount > 0) {
      // Спускаемся глубже
      setPath([...path, cat.name])
      setMode('wizard')
    } else {
      // Если нет подкатегорий — показать книги
      setPath(path.length ? [...path, cat.name] : [cat.name])
      setMode('books')
    }
  }

  const handleBack = () => {
    if (mode === 'books') {
      // Возвращаемся к wizard на текущем пути
      setMode('wizard')
      return
    }
    if (path.length > 0) {
      setPath(path.slice(0, -1))
    }
  }

  const handleCrumbClick = (index) => {
    if (mode === 'books') {
      // Возвращаемся к wizard
      setMode('wizard')
    }
    if (index === -1) {
      setPath([])
    } else {
      setPath(path.slice(0, index + 1))
      setMode('wizard')
    }
  }

  const stats = [
    { icon: BookOpen, label: 'Всего книг', value: totalBooks, color: 'var(--color-brand)' },
    { icon: BookOpen, label: 'Сейчас читаю', value: myReadingId.length, color: 'var(--color-warning)' },
    { icon: CheckCircle, label: 'Прочитано', value: myShelf, color: 'var(--color-success)' }
  ]

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] pb-20">
      <Navbar />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Hero */}
        <section className="pt-10 md:pt-14 pb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-[12px] font-medium text-[var(--color-brand)] uppercase tracking-[0.15em] mb-3">
              {totalBooks} книг в каталоге
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.025em] mb-3 text-[var(--color-text-primary)]">
              Каталог DLS
            </h1>
            <p className="text-[18px] text-[var(--color-text-secondary)] max-w-xl leading-[1.5]">
              Выбери категорию по цепочке — от общего к частному
            </p>
          </motion.div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                     style={{ background: stat.color + '15', color: stat.color }}>
                  <Icon size={16} />
                </div>
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)]">{stat.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mt-1">{stat.label}</div>
              </motion.div>
            )
          })}
        </div>

        {/* Breadcrumbs */}
        <div className="mb-5 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleCrumbClick(-1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              path.length === 0 && mode === 'wizard'
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Home size={13} /> Все жанры
          </button>
          {path.map((segment, i) => (
            <div key={i} className="flex items-center gap-2">
              <ChevronRight size={13} className="text-[var(--color-text-tertiary)]" />
              <button
                onClick={() => handleCrumbClick(i)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  i === path.length - 1 && mode === 'wizard'
                    ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                    : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {segment}
              </button>
            </div>
          ))}
          {mode === 'books' && (
            <>
              <ChevronRight size={13} className="text-[var(--color-text-tertiary)]" />
              <span className="px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-[var(--color-brand)] text-[var(--color-text-on-brand)]">
                Книги
              </span>
            </>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* WIZARD MODE: показываем категории */}
          {mode === 'wizard' && (
            <motion.div
              key={'wizard-' + path.join('/')}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {pathLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-24 bg-[var(--color-bg-soft)] rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : pathBooks.length === 0 ? (
                <div className="text-center py-16 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
                  <p className="text-[var(--color-text-secondary)] text-[14px]">Нет категорий</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[13px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
                      {path.length === 0 ? 'Выбери тему' : `Подкатегории — ${path[path.length - 1]}`}
                    </h3>
                    <span className="text-[12px] text-[var(--color-text-tertiary)]">
                      {pathBooks.length} {pathBooks.length === 1 ? 'категория' : 'категорий'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {pathBooks.map((cat, i) => (
                      <motion.button
                        key={cat.fullPath}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={{ y: -2 }}
                        onClick={() => handleCategoryClick(cat)}
                        className="group bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 text-left hover:border-[var(--color-brand)]/40 hover:shadow-[var(--shadow-elevated)] transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-bold transition-all ${
                            cat.hasChildren ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]'
                          }`}>
                            {cat.name.charAt(0)}
                          </div>
                          {cat.hasChildren && (
                            <ChevronRight size={16} className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all" />
                          )}
                        </div>
                        <div className="font-semibold text-[14px] mb-1 text-[var(--color-text-primary)] truncate">{cat.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
                          <span className="text-[var(--color-brand)] font-bold">{cat.totalCount}</span>
                          <span>{cat.totalCount === 1 ? 'книга' : 'книг'}</span>
                          {cat.hasChildren && (
                            <>
                              <span>•</span>
                              <span>{cat.bookCount} напрямую</span>
                            </>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* BOOKS MODE: показываем книги */}
          {mode === 'books' && (
            <motion.div
              key={'books-' + path.join('/')}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {loading && books.length === 0 ? (
                <SkeletonGrid />
              ) : books.length === 0 ? (
                <div className="text-center py-16 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
                  <p className="text-[var(--color-text-secondary)] text-[14px]">Книг пока нет</p>
                </div>
              ) : (
                <>
                  <Books
                    books={books}
                    myFinishedId={myFinishedId}
                    myReadingId={myReadingId}
                  />
                  <div ref={observerRef} className="h-20 w-full flex justify-center items-center">
                    {hasMore && (
                      <div className="w-7 h-7 border-2 border-[var(--color-brand)]/30 border-t-[var(--color-brand)] rounded-full animate-spin" />
                    )}
                  </div>
                  {!hasMore && books.length > 0 && (
                    <div className="flex items-center justify-center gap-4 py-14">
                      <div className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--color-border)]" />
                      <p className="text-[var(--color-text-tertiary)] text-[12px] font-medium tracking-wider uppercase">
                        Конец каталога
                      </p>
                      <div className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--color-border)]" />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}