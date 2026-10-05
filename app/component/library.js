'use client'

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle, Filter, Search } from 'lucide-react'

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

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    setBooks([])
    fetchBooks(1, true)
  }, [genreFromUrl])

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
    <main className="min-h-screen bg-white text-[#1d1d1f] pb-20">
      <Navbar />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8">

        {/* Hero */}
        <section className="pt-10 md:pt-14 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-[12px] font-medium text-[#1a56db] uppercase tracking-[0.15em] mb-3">
              {totalBooks} книг в каталоге
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.025em] mb-3 text-[#1d1d1f]">
              Каталог DLS
            </h1>
            <p className="text-[18px] text-[#6e6e73] max-w-xl leading-[1.5]">
              Найди книгу, которая изменит твою жизнь. Бронируй в один клик.
            </p>
          </motion.div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: BookOpen, label: 'Всего книг', value: totalBooks, color: '#1a56db' },
            { icon: BookOpen, label: 'Сейчас читаю', value: myReadingId.length, color: '#ff9500' },
            { icon: CheckCircle, label: 'Прочитано', value: myShelf, color: '#34c759' }
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white border border-black/8 rounded-2xl p-4 sm:p-5"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${stat.color}12`, color: stat.color }}
                >
                  <Icon size={16} />
                </div>
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight">{stat.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium mt-1">{stat.label}</div>
              </motion.div>
            )
          })}
        </div>

        {/* Genre filter */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold flex items-center gap-2 text-[#1d1d1f]">
              <Filter size={14} className="text-[#1a56db]" /> Жанры
            </h2>
            <span className="text-[13px] text-[#86868b]">
              {genreFromUrl === 'Все' ? `${totalBooks} книг` : `${totalBooks} в жанре`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {allGenres.map(genre => (
              <button
                key={genre}
                onClick={() => router.push("/library?genre=" + encodeURIComponent(genre))}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  genreFromUrl === genre
                    ? 'bg-[#1a56db] text-white'
                    : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ececec]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

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
                  <div className="w-7 h-7 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
                )}
              </div>

              {!hasMore && books.length > 0 && (
                <div className="flex items-center justify-center gap-4 py-14">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-black/10" />
                  <p className="text-[#86868b] text-[13px] font-medium tracking-wider uppercase">
                    Конец каталога
                  </p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-black/10" />
                </div>
              )}
            </>
          )}

          {!loading && books.length === 0 && (
            <div className="text-center py-20 bg-white border border-dashed border-black/10 rounded-2xl">
              <Search size={28} className="text-[#86868b] mx-auto mb-3" />
              <p className="text-[#1d1d1f] font-semibold mb-1">Книг не найдено</p>
              <p className="text-[13px] text-[#86868b]">Попробуй другой жанр</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default Library