'use client'

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Маленькая компонент для крутящейся иконки, чтобы не дублировать код
const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
  </svg>
);

const Book = () => {
  const [book, setBook] = useState(null);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [borrowError, setBorrowError] = useState('');
  const { id } = useParams();
  const [comment, setComment] = useState([]);
  const [content, setContent] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [myBorrowId, setMyBorrowId] = useState(null);
  const [myDeadline, setMyDeadLine] = useState(null);
  const router = useRouter();
  
  // НОВЫЕ СОСТОЯНИЯ ДЛЯ ЗАЩИТЫ ОТ СПАМА
  const [favLoading, setFavLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    const fetchBooks = async () => {
      const token = localStorage.getItem('token');
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(window.atob(base64));
        setUserRole(payload.role);
        if (token) {
          const profileRes = await fetch('/api/profile', {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const dataProfile = await profileRes.json();
          const myBook = dataProfile.active?.find(b => Number(b.book_id) === Number(id));
          if (myBook) {
            setMyBorrowId(myBook.borrow_id);
            setMyDeadLine(myBook.deadline);
          }
        }
      } catch (err) {
        console.error(err.message);
      }
      
      const res = await fetch(`/api/books/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      setBook(data);
      
      const fetchComments = await fetch(`/api/comments?bookId=${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      const dataComments = await fetchComments.json();
      setComment(dataComments);
    };
    fetchBooks();
  }, [id]);
  
  const handleBorrow = async () => {
    setBorrowLoading(true);
    setBorrowError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Нужна авторизация");
        return;
      }

      const res = await fetch(`/api/books/borrow/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bookId: id })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Чтение начато!", {
          description: "У тебя 14 дней на отчет!",
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        });
        setMyBorrowId(data.borrowId);
        setMyDeadLine(data.deadline);
      } else {
        setBorrowError(data.error);
        toast.error(data.error || "Ошибка бронирования");
      }
    } catch (err) {
      setBorrowError("Ошибка сети");
      toast.error("Ошибка сети");
    } finally {
      setBorrowLoading(false);
    }
  };

  const handleComment = async () => {
    if (!content.trim()) {
      toast.error("Комментарий не может быть пустым"); // Защита от пустого комментария
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;
    
    setCommentLoading(true); // БЛОКИРУЕМ
    try {
      const commentFetch = await fetch("/api/comments", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content: content, bookId: id })
      });
      const data = await commentFetch.json();
      if (commentFetch.ok) {
        setComment(prev => [data.newComment, ...prev]);
        setContent('');
        toast.success("Комментарий добавлен!");
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Ошибка отправки комментария");
    } finally {
      setCommentLoading(false); // РАЗБЛОКИРУЕМ
    }
  };

  const handleFavorities = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error("Войдите в систему", {
        description: "Чтобы добавлять книги в избранное, нужно авторизоваться."
      });
      return;
    }

    setFavLoading(true); // БЛОКИРУЕМ
    try {
      const res = await fetch('/api/favorites', {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bookId: id })
      });

      if (res.ok) {
        toast.success("Готово!", {
          description: "Книга теперь в вашем списке избранного",
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          style: {
            background: '#0d1a2e',
            border: '1px solid #162236',
            color: '#fff',
          },
        });
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Ошибка при добавлении");
      }
    } catch (err) {
      toast.error("Ошибка сети", {
        description: "Не удалось связаться с сервером"
      });
    } finally {
      setFavLoading(false); // РАЗБЛОКИРУЕМ
    }
  };

  const handlePin = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: id })
    });
    const data = await res.json();
    setComment(prev => prev.map(item => item.id === data.updatedComment.id ? data.updatedComment : item));
  };

  return (
    <div className="bg-[#0d1a2e]/50 border border-[#162236] rounded-3xl p-4 md:p-12 backdrop-blur-sm ">
      {book && (
        <button 
          onClick={() => window.history.back()} 
          className="text-[#4a6070] hover:text-white transition-colors mb-8 flex items-center gap-2"
        >
          ← Назад к списку
        </button>
      )}

      {!book ? (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
      ) : (
        <div className="flex flex-col items-center lg:flex-row gap-20 ">
          <div className="relative w-full max-w-[280px] aspect-[2/3] flex-shrink-0 mx-auto lg:mx-0">

            <Image
              src={book.cover_url}
              fill
              alt={book.title}
              className="rounded-lg shadow-2xl border border-[#162236] object-cover"
              priority
            />
          </div>
          <div className="flex-1 font-montserrat">

            <h1 className="text-2xl md:text-4xl font-bold leading-tight text-white">{book.title}</h1>
            <p className="text-blue-500/80 text-xl font-semibold mt-2 mb-8">{book.author}</p>
            <p className="text-md md:text-lg leading-relaxed text-[#cbd5e1] mb-12 max-w-4xl">
              {book.description}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-8 mb-12">
              {book.file && (
                <a 
                  href={book.file} 
                  target="_blank" 
                  className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold transition-all text-center"
                >
                  Скачать PDF
                </a>
              )}
              <button 
                onClick={handleFavorities}
                disabled={favLoading}
                className="border border-[#162236] bg-[#0d1a2e] px-6 py-3 rounded-xl font-bold hover:bg-[#162236] transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {favLoading ? <Spinner /> : "❤️"} В избранное
              </button>
              {myBorrowId ? (
                <button
                  onClick={() => router.push(`/report/${myBorrowId}`)}
                  className="px-10 py-3 rounded-xl font-bold transition-all bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20"
                >
                  ✅ Сдать отчет
                </button>
              ) : (
                <button
                  onClick={handleBorrow}
                  disabled={borrowLoading}
                  className="w-full sm:w-auto px-10 py-3 rounded-xl font-bold transition-all bg-gradient-to-r from-[#1a56db] to-[#60a5fa] text-white hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                >
                  {borrowLoading ? <><Spinner /> Обработка...</> : "📖 Начать чтение"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 text-sm border-t border-[#162236] pt-10">
              <div>
                <p className="text-[#4a6080] mb-1">Категория</p>
                <p className="font-medium text-lg text-white">{book.genre}</p>
              </div>
              <div>
                <p className="text-[#4a6080] mb-1">Год издания</p>
                <p className="font-medium text-lg text-white">{book.year}</p>
              </div>
              <div>
                <p className="text-[#4a6080] mb-1">Статус</p>
                <p className={`font-medium text-lg ${myBorrowId ? 'text-orange-400' : 'text-green-500'}`}>
                  {myBorrowId ? '📖 Ты читаешь' : 'Готова к чтению'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-16 border-t border-[#162236] pt-10">
        <h3 className="text-2xl font-bold text-white mb-8">Комментарии</h3>
        <div className="mb-10 bg-[#0d1a2e] p-6 rounded-2xl border border-[#162236]">
          <textarea 
            placeholder="Напишите честный отзыв о книге..." 
            onChange={e => setContent(e.target.value)} 
            value={content} 
            className="w-full bg-[#162236] border border-[#24334a] rounded-xl p-4 text-white placeholder-[#4a6080] focus:outline-none focus:border-blue-500 transition-all min-h-[120px] resize-none"
          />
          <div className="flex justify-end mt-4">
            <button 
              onClick={handleComment} 
              disabled={commentLoading || !content.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {commentLoading ? <Spinner /> : "Отправить"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {comment.map(item => (
            <div 
              key={item.id} 
              className={`relative p-6 rounded-2xl transition-all border ${
                item.is_pinned 
                  ? 'bg-blue-600/5 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.05)]' 
                  : 'bg-[#0d1a2e]/40 border-[#162236] hover:border-[#24334a]'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {item.user_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white flex items-center gap-2">
                      {item.user_name}
                      {item.is_pinned && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider">📌 Закреплено</span>}
                    </p>
                    <p className="text-xs text-[#4a6080]">Недавно</p>
                  </div>
                </div>
                {userRole === 'admin' && (
                  <button 
                    onClick={() => handlePin(item.id)}
                    className="text-[#4a6080] hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-blue-500/10"
                    title="Закрепить/Открепить"
                  >
                    <span className={`text-lg ${item.is_pinned ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>
                      📌
                    </span>
                  </button>
                )}
              </div>

              <p className="text-[#cbd5e1] leading-relaxed pl-13">
                {item.content}
              </p>
            </div>
          ))}

          {comment.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-[#162236] rounded-3xl">
              <p className="text-[#4a6080]">Здесь пока пусто. Станьте первым!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Book;