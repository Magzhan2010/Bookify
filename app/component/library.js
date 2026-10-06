'use client'

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, X, BookOpen, CheckCircle } from 'lucide-react'

import Navbar from "./NavBar"
import Books from "./books"
import SkeletonGrid from "./skeleton"

export default function Library() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Состояние
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalBooks, setTotalBooks] = useState(0)
  const [myFinishedId, setMyFinishedId] = useState([])
  const [myReadingId, setMyReadingId] = useState([])
  const [myShelf, setMyShelf] = useState(0)
  const [allGenres, setAllGenres] = useState(['Все'])

  // Текущий фильтр из URL (?genre=Психология)
  const activeGenre = searchParams.get('genre') || 'Все'

  // Поиск (отдельно от фильтра)
  const [search, setSearch] = useState('')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef(null)

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    try { JSON.parse(atob(token.split('.')[1])) } catch (e) {
      localStorage.removeItem('token'); router.push('/')
    }
  }, [router])

  // Профиль — для статуса чтения
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        setMyFinishedId((data.finished || []).map(b => Number(b.book_id)))
        setMyReadingId((data.active || []).map(b => Number(b.book_id)))
        setMyShelf(data.finished?.length || 0)
      } catch (err) {}
    }
    fetchProfile()
  }, [])

  // Список жанров для фильтров
  useEffect(() => {
    fetch('/api/books?allGenres=true')
      .then(r => r.json())
      .then(data => {
        const raw = data.map(g => typeof g === 'object' ? g.genre : g).filter(Boolean)
        setAllGenres(['Все', ...raw])
      })
      .catch(() => {})
  }, [])

  // Загрузка книг с фильтром жанра
  const fetchBooks = async (pageNum, isNewSearch) => {
    if (isNewSearch) setLoading(true)
    try {
      const genreParam = activeGenre === 'Все' ? '' : `&genre=${encodeURIComponent(activeGenre)}`
      const url = `/api/books?page=${pageNum}${genreParam}`
      const data = await (await fetch(url)).json()

      if (isNewSearch) {
        setBooks(data)
      } else {
        setBooks(prev => {
          const existingIds = new Set(prev.map(b => b.id))
          return [...prev, ...data.filter(b => !existingIds.has(b.id))]
        })
      }

      if (data.length < 12) setHasMore(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Загружаем при изменении фильтра
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    fetchBooks(1, true)
    // Обновляем total
    const genreParam = activeGenre === 'Все' ? '' : `&genre=${encodeURIComponent(activeGenre)}`
    fetch(`/api/books?countOnly=true${genreParam}`)
      .then(r => r.json())
      .then(d => setTotalBooks(parseInt(d.total) || 0))
      .catch(() => {})
  }, [activeGenre])

  // Сброс на первую страницу при смене фильтра
  useEffect(() => {
    setPage(1)
    setHasMore(true)
  }, [activeGenre])

  // Infinite scroll
  useEffect(() => {
    if (loading || !hasMore) return
    const currentRef = observerRef.current
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setPage(p => p + 1) },
      { threshold: 1.0 }
    )
    if (currentRef) observer.observe(currentRef)
    return () => { if (currentRef) observer.unobserve(currentRef) }
  }, [loading, hasMore])

  useEffect(() => {
    if (page > 1) fetchBooks(page)
  }, [page])

  // Клик по жанру — обновляет URL (без скролла)
  const handleGenreClick = (genre) => {
    const params = new URLSearchParams(searchParams.toString())
    if (genre === 'Все') {
      params.delete('genre')
    } else {
      params.set('genre', genre)
    }
    router.replace(`/library?${params.toString()}`, { scroll: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Популярные жанры (показываем только топ, остальные в "ещё")
  const generalGenres = ['Все', 'Художественная', 'Деловая', 'Психология', 'Учебная', 'Биография', 'Саморазвитие', 'Философия', 'Финансы', 'Наука', 'Научпоп', 'Искусство']
  const visibleGenres = generalGenres.filter(g => allGenres.includes(g))
  const overflowGenres = allGenres.filter(g => !generalGenres.includes(g))
  const [showAllGenres, setShowAllGenres] = useState(false)

  const stats = [
    { icon: BookOpen, label: 'Всего книг', value: totalBooks, color: 'var(--color-brand)' },
    { icon: BookOpen, label: 'Читаю сейчас', value: myReadingId.length, color: 'var(--color-warning)' },
    { icon: CheckCircle, label: 'Прочитано', value: myShelf, color: 'var(--color-success)' }
  ]

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] pb-20">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Hero */}
        <section className="pt-10 md:pt-14 pb-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-[12px] font-medium text-[var(--color-brand)] uppercase tracking-[0.15em] mb-3">
              {totalBooks} книг в каталоге
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.025em] mb-3 text-[var(--color-text-primary)]">
              Каталог DLS
            </h1>
            <p className="text-[17px] text-[var(--color-text-secondary)] max-w-xl leading-[1.5]">
              Используй фильтры ниже — книги остаются видимыми, просто меняется порядок
            </p>
          </motion.div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
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

        {/* Active filter + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] pl-10 pr-3 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand-soft)] transition-all"
              placeholder="Поиск по названию или автору..."
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {activeGenre !== 'Все' && (
            <button
              onClick={() => handleGenreClick('Все')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-[13px] font-medium whitespace-nowrap"
            >
              <span className="text-[10px] uppercase tracking-wider opacity-60">Фильтр:</span>
              <span>{activeGenre}</span>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Genre filters chips */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-[var(--color-text-tertiary)]" />
            <span className="text-[13px] text-[var(--color-text-secondary)] font-medium">Жанры</span>
            <span className="text-[11px] text-[var(--color-text-tertiary)]">·</span>
            <span className="text-[11px] text-[var(--color-text-tertiary)]">книги остаются, меняется фильтр</span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Топ жанры */}
            {(showAllGenres ? allGenres : visibleGenres).map(genre => {
              const active = activeGenre === genre
              return (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  key={genre}
                  onClick={() => handleGenreClick(genre)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-[var(--color-brand)] text-[var(--color-text-on-brand)] shadow-[0_2px_8px_rgba(26,86,219,0.25)]'
                      : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  {genre}
                </motion.button>
              )
            })}

            {/* Показать ещё */}
            {overflowGenres.length > 0 && (
              <button
                onClick={() => setShowAllGenres(!showAllGenres)}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition-colors"
              >
                {showAllGenres ? 'Свернуть ↑' : `Ещё ${overflowGenres.length} ↓`}
              </button>
            )}
          </div>
        </div>

        {/* Books grid */}
        {loading && books.length === 0 ? (
          <SkeletonGrid />
        ) : books.length === 0 ? (
          <div className="text-center py-20 bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl">
            <p className="text-[var(--color-text-secondary)] text-[14px]">Книг пока нет</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 text-[12px] text-[var(--color-text-tertiary)]">
              <span>Показано: <strong className="text-[var(--color-text-primary)]">{books.length}</strong> из <strong className="text-[var(--color-text-primary)]">{totalBooks}</strong></span>
              {activeGenre !== 'Все' && <span>фильтр: <strong className="text-[var(--color-brand)]">{activeGenre}</strong></span>}
            </div>
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
      </div>
    </main>
  )
}