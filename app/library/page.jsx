'use client'

import { useRouter } from "next/navigation";
import Navbar from "../component/NavBar";
import { useEffect, useState, useRef } from "react";
import Books from "../component/books";
import SkeletonGrid from "../component/skeleton";

const Library = () => {
  const router = useRouter()
  const [books, setBooks] = useState([])
  const [activeGenre, setActiveGenre] = useState('Все')
  const [loading, setLoading] = useState(true)
  
  // Данные профиля
  const [myFinishedId, setMyFinishedId] = useState([])
  const [myReadingId, setMyReadingId] = useState([])
  const [myShelf, setMyShelf] = useState(0)

  // Данные для БЕСКОНЕЧНОГО СКРОЛЛА
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef(null) // Это и есть наш "радар"

  const genres = ["Все", ...new Set(books.map(b => b.genre))]
  const filtered = activeGenre === 'Все' ? books : books.filter(b => b.genre === activeGenre)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    try { JSON.parse(atob(token.split('.')[1])) } 
    catch (e) { localStorage.removeItem('token'); router.push('/') }
  }, [router])

  // ФУНКЦИЯ ЗАГРУЗКИ КНИГ (теперь умеет догружать)
  const fetchBooks = async (pageNum, isNewSearch = false) => {
    try {
      if (isNewSearch) setLoading(true)
      
      // ОБЯЗАТЕЛЬНО ПЕРЕДАЕМ НОМЕР СТРАНИЦЫ
      const res = await fetch(`/api/books?page=${pageNum}`)
      const data = await res.json()
      
      // Если пришло меньше 2 книг (потому что limit=2), значит база кончилась!
      if (data.length < 2) {
        setHasMore(false)
      }

      if (isNewSearch) {
        setBooks(data) // Первая загрузка - просто заменяем
      } else {
        setBooks(prev => [...prev, ...data]) // Догрузка - приклеиваем в конец!
      }
      
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Загрузка профиля (один раз при старте)
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
        setMyShelf(myFinishedId.length || 0) // Твоя починка
      } catch (err) { console.error(err) }
    }
    fetchProfile()
  }, [])

  // ПЕРВАЯ ЗАГРУЗКА (Страница 1)
  useEffect(() => {
    fetchBooks(1, true)
  }, [])

  // НАСТРОЙКА РАДАРА (Следит за концом списка)
  useEffect(() => {
    if (loading || !hasMore) return // Если грузится или книги кончились - спим

    const currentRef = observerRef.current
    const observer = new IntersectionObserver((entries) => {
      // Если невидимый блок появился на экране
      if (entries[0].isIntersecting) {
        setPage(prev => prev + 1) // Увеличиваем страницу
      }
    }, { threshold: 1.0 })

    if (currentRef) observer.observe(currentRef)

    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [loading, hasMore])

  // ПОДГРУЗКА НОВЫХ КНИГ (Срабатывает когда меняется страница)
  useEffect(() => {
    if (page > 1) {
      fetchBooks(page, false)
    }
  }, [page])


  return (
    <main className="min-h-screen bg-[#080c14] text-white pb-20">
      <Navbar />

      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { label: "Всего книг", value: books.length || 0, color: "from-white to-white/60" },
            { label: "Прочитал", value: myShelf, color: "from-green-400 to-emerald-600" },
          ].map((stat, i) => (
            <div key={i} className="relative group overflow-hidden bg-[#0d1a2e]/40 border border-white/5 p-6 rounded-3xl backdrop-blur-sm">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
              <p className={`text-4xl font-black mb-1 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
              <p className="text-sm font-medium text-[#4a6080] uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Категории</h2>
            <span className="text-sm text-[#4a6080]">{filtered.length} книг найдено</span>
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
            {genres.map(genre => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                  activeGenre === genre
                    ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20 text-white"
                    : "bg-[#0d1a2e] border-white/5 text-[#4a6080] hover:border-white/20 hover:text-white"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          {loading ? (
            <SkeletonGrid />
          ) : filtered.length > 0 ? (
            <>
              {/* КОМПОНЕНТ КНИГ */}
              <Books books={filtered} myFinishedId={myFinishedId} myReadingId={myReadingId} />
              
              {/* ВОТ ОН - НЕВИДИМЫЙ РАДАР В САМОМ НИЗУ! */}
              <div ref={observerRef} className="h-10 w-full flex justify-center items-center mt-10">
                {page > 1 && hasMore && (
                  <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                )}
              </div>
              
              {/* СООБЩЕНИЕ КОНЦА СПИСКА */}
              {!hasMore && books.length > 0 && (
                <p className="text-center text-[#4a6080] py-10 text-sm">Вы достигли конца списка 📚</p>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-[#0d1a2e]/20 rounded-3xl border border-dashed border-white/10">
              <p className="text-[#4a6080]">В этой категории пока нет книг...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default Library;