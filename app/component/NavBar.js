'use client'
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const Navbar = () => {
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState([])
  const [loading, setLoading] = useState(false)
  const [is_open, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Как только путь изменился, выключаем анимацию загрузки
    setLoading(false)
  }, [pathname])
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (e) { console.error("Token error"); }
    }

  }, []);

  const firstWord = user?.name?.charAt(0).toUpperCase()

  const handleGetOut = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  // Поиск
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

    
    const timeoutId = setTimeout(searchFetch, 300)
    return () => clearTimeout(timeoutId)
  }, [query])
  const handleDashboard =  () => {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/')
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.role !== 'admin') {
      router.push('/')
    }
    router.push('/admin/dashboard')
  }
  const handleAdmin =  () => {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/')
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.role !== 'admin') {
      router.push('/')
    }
    router.push('/admin')
  }
  const handleProfile = () => {
    setLoading(true)
    router.push('/profile')
  }

  return (
    <header className='sticky top-0 z-[100] w-full bg-[#080c14]/80 backdrop-blur-md border-b border-white/5 py-3 px-6 md:px-12 flex justify-between items-center'>
      
      <div className='flex gap-3 items-center cursor-pointer group' onClick={() => router.push('/')}>
        <div className="relative overflow-hidden rounded-xl bg-blue-500/10 p-1 group-hover:bg-blue-500/20 transition-colors">
          <Image src="/lb_logo.png" width={50} height={50} alt='Bookify' className="object-contain"/>
        </div>
        <h1 className='text-xl md:text-3xl font-bold tracking-tight'>
          Book<span className='bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent'>ify</span>
        </h1>
      </div>

      <div className='flex items-center gap-6'>
        
        <div className="relative hidden md:block">
          <div className="relative group">
            {user?.role === 'admin' && (
              <div>
                <button className="bg-[#162236] hover:bg-sky-500/20 hover:text-sky-400 text-[#4a6080] transition-all py-2 px-5 rounded-xl border border-white/5 font-medium text-md mr-5" 
                onClick={() => handleDashboard()}>Dashboard</button>
                <button onClick={() => handleAdmin()}>Admin</button>
              </div>
            )}
            <input 
              type="text" 
              placeholder="Найти сокровище..." 
              className='bg-[#0d1a2e]/50 border border-white/10 px-4 py-2 text-sm placeholder-[#4a6080] outline-none rounded-2xl focus:border-blue-500/50 focus:bg-[#0d1a2e] w-72 lg:w-96 transition-all' 
              onChange={e => setQuery(e.target.value)} 
              value={query}
            />
            {loading && <div className="absolute right-4 top-2.5 w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>}
          </div>

          {result.length > 0 && (
            <div className="absolute top-12 right-0 w-full bg-[#0d1a2e] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="p-2">
                {result.map(book => (
                  <div 
                    key={book.id} 
                    className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" 
                    onClick={() => {
                      router.push(`/books/${book.id}`)
                      setQuery('')
                    }}
                  >
                    <Image src={book.cover_url} width={40} height={56} alt={book.title} className="object-cover rounded-md shadow-lg"/>
                    <div>
                        <p className="text-sm font-semibold text-white truncate w-48 lg:w-64">{book.title}</p>
                        <p className="text-xs text-[#4a6080]">{book.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 border-l border-white/10 pl-6">
          <div 
            className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#1a56db] to-[#60a5fa] 
              flex items-center justify-center font-bold text-white shadow-lg transition-all cursor-pointer
              ${loading ? 'opacity-70 pointer-events-none' : 'hover:scale-105'}`} 
            onClick={() => handleProfile()}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              firstWord
            )}
          </div>
          <button 
            onClick={() => router.push('/donate')}
            className="text-[#4a6080] hover:text-pink-400 text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            ❤️ <span className="hidden sm:inline">Поддержать</span>
          </button>
          <button 
            className="text-[#4a6080] hover:text-red-400 text-sm font-medium transition-colors" 
            onClick={handleGetOut}
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar;