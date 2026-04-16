'use client'

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from 'sonner'; // Подключаем уведомления

const Admin = () => {
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [genre, setGenre] = useState('')
    const [year, setYear] = useState('')
    const [description, setDescription] = useState('')
    const [image, setImage] = useState('')
  const [books, setBooks] = useState([])
    const [download, setDownload] = useState('')
  
  // НОВОЕ: Состояние загрузки для защиты от спама
  const [submitLoading, setSubmitLoading] = useState(false)

    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('token')
        if(!token) return router.push('/login')
        try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            if (payload.role !== 'admin') {
                router.push('/login')
            }
        } catch(e) {
            router.push('/login')
        }
    }, [])

    const fetchBooks = async () => {
        try {
            const res = await fetch("/api/books", {
                method:"GET",
                headers: { "Content-Type": "application/json"},
            })
            const data = await res.json()
            setBooks(data)
        } catch(err) {
            console.error(err)
        }
    }

    useEffect(() => {
        fetchBooks()
    }, [])

    const handleSubmit = async(e) => {
    e.preventDefault();
    const token = localStorage.getItem('token')
    
    // Защита от пустой формы
    if (!title || !author) {
      return toast.error("Заполните минимум название и автора!");
    }

    setSubmitLoading(true) // БЛОКИРУЕМ КНОПКУ

    try {
      const res = await fetch('/api/books', {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, author, genre, year, description, cover_url:image, file: download })
      })
      const data = await res.json()
      
      if (data.success) {
        setTitle(''); setAuthor(''); setGenre('')
        setYear(''); setDescription(''); setImage(''); setDownload('')
        
        fetchBooks();
        
        toast.success("Книга добавлена!", {
          description: `"${title}" теперь в архиве.`,
          style: { background: '#0d1a2e', border: '1px solid #162236', color: '#fff' }
        });
      } else {
        toast.error("Ошибка добавления");
      }
    } catch(err) {
      toast.error("Ошибка сети");
    } finally {
      setSubmitLoading(false) // РАЗБЛОКИРУЕМ КНОПКУ
    }
  }
    
    const handleGetOut = () => {
        localStorage.removeItem('token')
        router.push('/')
    }

    const handleDelete = async(id, bookTitle) => {
        // ВЫСПЛЫВАЮЩЕЕ ПРЕДУПРЕЖДЕНИЕ (чтобы не удалить случайно)
        if(!confirm(`Вы точно хотите удалить "${bookTitle}"? Это действие нельзя отменить.`)) return;

        const token = localStorage.getItem('token')		
        try {
            const res = await fetch(`/api/books/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            })
            if (!res.ok) return toast.error("Ошибка удаления");
            const data = await res.json()
            if (data.success) {
                setBooks(prev => prev.filter(b => b.id !== id));
                toast.success("Книга удалена", {
                    style: { background: '#0d1a2e', border: '1px solid #162236', color: '#fff' }
                });
            }
        } catch(err) {
            toast.error("Ошибка сети");
        }
    }


    return (
  <div className="min-h-screen bg-[#080c14] text-white font-montserrat pb-20">
    
    {/* HEADER */}
    <div className="border-b border-white/5 bg-[#0d1a2e]/30 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto py-5 px-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-2 h-8 bg-blue-600 rounded-full" />
          <h1 className="text-2xl font-bold tracking-tight">
            Панель <span className="text-blue-500">Управления</span>
          </h1>
        </div>
        
        {/* Сгруппировали кнопки */}
        <div className="flex items-center gap-3">
          <button
            className="bg-[#162236] hover:bg-sky-500/20 hover:text-sky-400 text-[#4a6080] transition-all py-2 px-5 rounded-xl border border-white/5 font-medium text-sm" 
            onClick={() => router.push('/admin/dashboard')}
          >
            📊 Отчеты
          </button>
          <button className="bg-[#162236] hover:bg-sky-500/20 hover:text-sky-400 text-[#4a6080] transition-all py-2 px-5 rounded-xl border border-white/5 font-medium text-sm" 
            onClick={() => router.push('/library')}>Главная страница</button>
          <button 
            className="bg-[#162236] hover:bg-red-500/20 hover:text-red-400 text-[#4a6080] transition-all py-2 px-5 rounded-xl border border-white/5 font-medium text-sm" 
            onClick={handleGetOut}
          >
            Выйти
          </button>
        </div>
      </div>
    </div>

    <div className="max-w-[1200px] mx-auto px-8 pt-12">
      
      {/* ФОРМА ДОБАВЛЕНИЯ */}
      <section className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-xl font-semibold">Добавить новую книгу</h2>
          <div className="h-[1px] flex-1 bg-white/5" />
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0d1a2e] border border-white/5 rounded-[32px] p-8 md:p-10 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#4a6080] ml-1">Название книги *</label>
              <input type="text" required onChange={e => setTitle(e.target.value)} value={title} placeholder="Напр: Великий Гэтсби" 
                className="w-full bg-[#080c14] border border-white/5 rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 focus:ring-4 ring-blue-500/10 transition-all"/>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#4a6080] ml-1">Автор *</label>
              <input type="text" required onChange={e => setAuthor(e.target.value)} value={author} placeholder="Ф. Скотт Фицджеральд"
                className="w-full bg-[#080c14] border border-white/5 rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 focus:ring-4 ring-blue-500/10 transition-all"/>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#4a6080] ml-1">Жанр</label>
              <input type="text" onChange={e => setGenre(e.target.value)} value={genre} placeholder="Классика, Драма"
                className="w-full bg-[#080c14] border border-white/5 rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 focus:ring-4 ring-blue-500/10 transition-all"/>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#4a6080] ml-1">Год издания</label>
              <input type="text" onChange={e => setYear(e.target.value)} value={year} placeholder="1925"
                className="w-full bg-[#080c14] border border-white/5 rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 focus:ring-4 ring-blue-500/10 transition-all"/>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-widest text-[#4a6080] ml-1">Описание сюжета</label>
              <textarea rows="3" onChange={e => setDescription(e.target.value)} value={description} placeholder="Краткое содержание книги..."
                className="w-full bg-[#080c14] border border-white/5 rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 focus:ring-4 ring-blue-500/10 transition-all resize-none"/>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#4a6080] ml-1">URL обложки (ссылка)</label>
              <input type="text" onChange={e => setImage(e.target.value)} value={image} placeholder="https://image-link.com"
                className="w-full bg-[#080c14] border border-white/5 rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 focus:ring-4 ring-blue-500/10 transition-all"/>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-[#4a6080] ml-1">URL PDF файла</label>
              <input type="text" onChange={e => setDownload(e.target.value)} value={download} placeholder="https://pdf-link.com"
                className="w-full bg-[#080c14] border border-white/5 rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 focus:ring-4 ring-blue-500/10 transition-all"/>
            </div>

          </div>
          
          <button 
            type="submit" 
            disabled={submitLoading}
            className={`w-full mt-10 font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 ${
              submitLoading 
                ? 'bg-blue-800 text-blue-300 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:scale-[1.01] active:scale-[0.99] shadow-blue-500/20'
            }`}
          >
            {submitLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                Регистрация в базе...
              </>
            ) : (
              'Зарегистрировать книгу в базе'
            )}
          </button>
        </form>
      </section>

      {/* СПИСОК КНИГ */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold">Архив книг ({books.length})</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {books.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-[#0d1a2e]/50 border border-dashed border-white/5 rounded-3xl">
               <p className="text-[#4a6080]">Библиотека пока пуста. Добавьте первую книгу выше!</p>
            </div>
          ) : (
            books.map(book => (
              <div key={book.id} className="group bg-[#0d1a2e] rounded-[24px] overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-300">
                <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => router.push(`/books/${book.id}`)}>
                  <img src={book.cover_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  {/* ЗАМЕНИЛИ СТАТУС "В НАЛИЧИИ" НА ЖАНР (гораздо полезнее для админа) */}
                  {book.genre && (
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-blue-500/80 text-white backdrop-blur-sm">
                        {book.genre}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-lg leading-tight mb-1 truncate">{book.title}</h3>
                  <p className="text-[#4a6080] text-sm mb-4">{book.author}</p>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(book.id, book.title); }}
                    className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-xs font-bold transition-all border border-red-500/20"
                  >
                    Удалить из базы
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  </div>
)
}

export default Admin