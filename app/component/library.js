'use client'

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle, Filter, Sparkles, Search } from 'lucide-react'

import Navbar from "../component/NavBar"
import Books from "../component/books"
import SkeletonGrid from "../component/skeleton"

const Library = () => {
  const router = useRouter()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalBooks, setTotalBooks] = useState(0)
  const [myFinishedId, setMyFinishedId] = useState([])
  const [myReadingId, setMyReadingId] = useState([])
  const [myShelf, setMyShelf] = useState(0)
  const [allGenres, setAllGenres] = useState(['Все'])

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef(null)
  const searchParams = useSearchParams()
  const genreFromUrl = searchParams.get('genre') || 'Все'

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    try {
      JSON.parse(atob(token.split('.')[1]))
    } catch (e) {
      localStorage.removeItem('token')
      router.push('/')
    }
  }, [router])

  // Fetch books
  const fetchBooks = async (pageNum, isNewSearch = false) => {
    try {
      if (isNewSearch) setLoading(true)
      const res = await fetch(`/api/books?page=${pageNum}&genre=${encodeURIComponent(genreFromUrl)}`)
      const data = await res.json()

      if (isNewSearch) {
        setBooks(data)
      } else {
        setBooks(prev => {
          const existingIds = new Set(prev.map(b => b.id))
          const newOnly = data.filter(b => !existingIds.has(b.id))
          return [...prev, ...newOnly]
        })
      }

      if (data.length < 12) setHasMore(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Total count
  useEffect(() => {
    const fetchTotal = async () => {
      try {
        const res = await fetch(`/api/books?countOnly=true&genre=${encodeURIComponent(genreFromUrl)}`)
        const data = await res.json()
        setTotalBooks(parseInt(data.total) || 0)
      } catch (err) { console.error(err) }
    }
    fetchTotal()
  }, [genreFromUrl])

  // Profile + genres
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

    const fetchGenres = async () => {
      try {
        const res = await fetch('/api/books?allGenres=true')
        const data = await res.json()
        const raw = data.map(g => typeof g === 'object' ? g.genre : g)
        const uniqueGenres = [...new Set(raw.filter(Boolean))]
        setAllGenres(['Все', ...uniqueGenres])
      } catch (err) { console.error(err) }
    }

    fetchProfile()
    fetchGenres()
  }, [])

  // Reset on genre change
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    setBooks([])
    fetchBooks(1, true)
  }, [genreFromUrl])

  // Infinite scroll
  useEffect(() => {
    if (loading || !hasMore) return
    const currentRef = observerRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 1.0 }
    )
    if (currentRef) observer.observe(currentRef)
    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [loading, hasMore])

  useEffect(() => {
    if (page > 1) fetchBooks(page)
  }, [page])

  return (
    <main className="min-h-screen text-white pb-20">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">

        {/* Hero */}
        <section className="pt-12 md:pt-16 pb-8 md:pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-[#e8b94e]/10 border border-[#e8b94e]/20 rounded-full text-[10px] font-bold text-[#e8b94e] uppercase tracking-widest">
              <Sparkles size={10} /> {totalBooks} книг в каталоге
            </div>
            <h1 className="font-display text-4xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-4">
              Каталог <span className="text-gradient-gold">DLS</span>
            </h1>
            <p className="text-[#94a3b8] text-lg max-w-xl leading-relaxed">
              Найди книгу, которая изменит твою жизнь. Бронируй в один клик, читай с удовольствием.
            </p>
          </motion.div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-8">
          {[
            { icon: BookOpen, label: 'Всего книг', value: totalBooks, color: '#e8b94e' },
            { icon: BookOpen, label: 'Сейчас читаю', value: myReadingId.length, color: '#4ecdc4' },
            { icon: CheckCircle, label: 'Прочитано', value: myShelf, color: '#60a5fa' }
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#11141f] border border-white/5 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#e8b94e]/20 transition-all"
              >
                <div
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"
                  style={{ background: stat.color }}
                />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${stat.color}15`, color: stat.color }}
                >
                  <Icon size={18} />
                </div>
                <div className="text-3xl sm:text-4xl font-display font-black">{stat.value}</div>
                <div className="text-xs uppercase tracking-wider text-[#5a6383] font-semibold mt-1">{stat.label}</div>
              </motion.div>
            )
          })}
        </div>

        {/* Genre filter */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Filter size={16} className="text-[#e8b94e]" /> Жанры
            </h2>
            <span className="text-sm text-[#5a6383]">
              {genreFromUrl === 'Все' ? `${totalBooks} книг` : `${totalBooks} в жанре`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pb-2">
            {allGenres.map(genre => (
              <button
                key={genre}
                onClick={() => router.push("/library?genre=" + encodeURIComponent(genre))}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  genreFromUrl === genre
                    ? 'bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] shadow-lg shadow-[#e8b94e]/20'
                    : 'bg-white/5 text-[#94a3b8] hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Books */}
        <div className="relative">
          {books.length === 0 && loading ? (
            <SkeletonGrid />
          ) : (
            <>
              <Books
                books={books}
                myFinishedId={myFinishedId}
                myReadingId={myReadingId}
                genreKey={genreFromUrl}
              />

              <div ref={observerRef} className="h-20 w-full flex justify-center items-center">
                {hasMore && (
                  <div className="w-8 h-8 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
                )}
              </div>

              {!hasMore && books.length > 0 && (
                <div className="flex items-center justify-center gap-4 py-16">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#5a6383]/30" />
                  <p className="text-[#5a6383] text-sm font-medium tracking-widest uppercase">
                    Конец каталога 📚
                  </p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#5a6383]/30" />
                </div>
              )}
            </>
          )}

          {!loading && books.length === 0 && (
            <div className="text-center py-20 bg-[#11141f] border border-dashed border-white/10 rounded-2xl">
              <Search size={32} className="text-[#5a6383] mx-auto mb-3" />
              <p className="text-[#94a3b8] font-semibold mb-1">Книг не найдено</p>
              <p className="text-sm text-[#5a6383]">Попробуй другой жанр</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default Library