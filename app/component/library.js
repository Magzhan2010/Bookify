'use client'

import { useRouter, useSearchParams } from "next/navigation";

import Navbar from "../component/NavBar";
import { useEffect, useState, useRef } from "react";
import Books from "../component/books";
import SkeletonGrid from "../component/skeleton";

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
    if (!token) { router.push('/login'); return }
    try { JSON.parse(atob(token.split('.')[1])) }
    catch (e) { localStorage.removeItem('token'); router.push('/') }
  }, [router])

  // Fetch books with deduplication
  const fetchBooks = async (pageNum, isNewSearch = false) => {
    try {
      if (isNewSearch) setLoading(true)

      const res = await fetch(`/api/books?page=${pageNum}&genre=${genreFromUrl}`)
      const data = await res.json()

      const sanitized = data.map(book => ({
        ...book,
        genre: typeof book.genre === 'object' ? book.genre.genre : book.genre
      }))

      if (isNewSearch) {
        setBooks(sanitized)
      } else {
        setBooks(prev => {
          const existingIds = new Set(prev.map(b => b.id))
          const newOnly = sanitized.filter(b => !existingIds.has(b.id))
          return [...prev, ...newOnly]
        })
      }

      if (data.length < 12) setHasMore(false)

    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch total count
  useEffect(() => {
    const fetchTotalBooks = async () => {
      const res = await fetch(`/api/books?countOnly=true&genre=${genreFromUrl}`)
      const data = await res.json()
      setTotalBooks(Number(data.total))
    }
    fetchTotalBooks()
  }, [genreFromUrl])

  // Fetch profile & genres
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const res = await fetch('/api/profile', {
          headers: { "Authorization": `Bearer ${token}` }
        })
        const data = await res.json()
        setMyFinishedId((data.finished || []).map(b => Number(b.book_id)))
        setMyReadingId((data.active || []).map(b => Number(b.book_id)))
        setMyShelf(data.finished?.length || 0)
      } catch (err) {
        console.error(err)
      }
    }

    const fetchGenres = async () => {
    try {
      const res = await fetch('/api/books?allGenres=true'); // Запрос уходит
      const data = await res.json();
      
      // Раньше тут приходили 12 книг, а теперь придет массив всех жанров из БД!
      const raw = data.map(g => {
        if (typeof g === 'object' && g !== null) return g.genre;
        return g;
      });

      const uniqueGenres = [...new Set(raw.filter(Boolean))];
      setAllGenres(["Все", ...uniqueGenres]); // Сразу все 5 жанров появятся
    } catch (err) {
      console.error("Genre fetch failed:", err);
    }
  };
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

  // Infinite scroll observer
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

  // Fetch next page
  useEffect(() => {
    if (page > 1) fetchBooks(page)
  }, [page])

  return (
    <main className="min-h-screen  text-white pb-20">
      <Navbar />

      <div className="max-w-[1200px] mx-auto px-6 md:px-10">

        {/* Hero */}
        <section className="pt-16 pb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Библиотека <br />
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent">
              Divergents School
            </span>
          </h1>
          <p className="text-lg text-[#94a3b8] max-w-xl leading-relaxed">
            Исследуй сотни книг, бронируй в один клик и развивайся вместе с нами.
            Твой путь к знаниям начинается здесь.
          </p>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { label: "Всего книг", value: totalBooks || 0, color: "from-white to-white/60" },
            { label: "Прочитал", value: myShelf, color: "from-green-400 to-emerald-600" },
          ].map((stat, i) => (
            <div
              key={i}
              className="relative group overflow-hidden bg-[#0d1a2e]/40 border border-white/5 p-6 rounded-3xl backdrop-blur-sm"
            >
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
              <p className={`text-4xl font-black mb-1 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
              <p className="text-sm font-medium text-[#4a6080] uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Genre filter */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Категории</h2>
            <span className="text-sm text-[#4a6080]">{totalBooks} книг найдено</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pb-4">
            {allGenres.map(genre => (
              <button
                key={genre}
                onClick={() => router.push("/library?genre=" + genre)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                  genreFromUrl === genre
                    ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20 text-white"
                    : "bg-[#0d1a2e] border-white/5 text-[#4a6080] hover:border-white/20 hover:text-white"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Books grid */}
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

              {/* Sentinel for infinite scroll */}
              <div ref={observerRef} className="h-20 w-full flex justify-center items-center">
                {hasMore && (
                  <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                )}
              </div>

              {/* End of list */}
              {!hasMore && books.length > 0 && (
                <div>
                  <div className="flex items-center justify-center gap-4 py-12">
                    <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#4a6080]/30" />
                    <p className="text-[#4a6080] text-sm font-medium tracking-widest uppercase">
                      Вы достигли конца списка 📚
                    </p>
                    <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#4a6080]/30" />
                  </div>

                  <footer className="relative z-10 border-t border-[#162236] bg-[#0b111b]/20 py-8 backdrop-blur-sm">
                    <div className="container mx-auto px-4 flex flex-col items-center gap-6">
                      <div className="group relative">
                        <div className="absolute -inset-2 rounded-full bg-[#4a6080]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <img
                          src="/lb_logo.png"
                          alt="dls-library logo"
                          className="relative opacity-80 hover:scale-110 transition-all duration-300"
                          width={55}
                          height={55}
                        />
                      </div>

                      <div className="text-center space-y-2">
                        <p className="text-[#4a6080] text-sm tracking-tight">
                          © 2026 <span className="text-[#6b85a8] font-semibold">Bookify</span>.
                          <span className="opacity-70 ml-1">Divergents Leadership School.</span>
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#25334a] font-bold">
                          Designed & Developed by
                          <span className="ml-2 text-[#4a6080] hover:text-blue-400 transition-colors cursor-pointer border-b border-transparent hover:border-blue-400/30 pb-0.5">
                            Magzhan
                          </span>
                        </p>
                      </div>
                    </div>
                  </footer>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default Library