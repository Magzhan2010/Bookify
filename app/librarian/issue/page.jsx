'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Search, BookMarked, Check, User, Calendar, X, BookOpen } from 'lucide-react'

export default function IssuePage() {
  const [step, setStep] = useState(1) // 1: студент, 2: книга, 3: подтверждение
  const [studentQuery, setStudentQuery] = useState('')
  const [studentResults, setStudentResults] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [bookQuery, setBookQuery] = useState('')
  const [bookResults, setBookResults] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const searchRef = useRef(null)

  // Student search with debounce
  useEffect(() => {
    if (!studentQuery.trim()) {
      setStudentResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/librarian/students?q=${encodeURIComponent(studentQuery)}&active=true`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        // Если ничего не нашлось — попробуем без фильтра active
        if (data.length === 0) {
          const r2 = await fetch(`/api/librarian/students?q=${encodeURIComponent(studentQuery)}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          setStudentResults(await r2.json())
        } else {
          setStudentResults(data)
        }
      } catch (err) {
        console.error(err)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [studentQuery])

  // Book search
  useEffect(() => {
    if (!bookQuery.trim()) {
      setBookResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(bookQuery)}`)
        setBookResults(await res.json())
      } catch (err) {
        console.error(err)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [bookQuery])

  const handleIssue = async () => {
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/issue', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentIdentifier: selectedStudent.id,
          bookId: selectedBook.id,
          dueDate,
          notes
        })
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(data)
        toast.success(`Книга выдана: ${data.book.title}`, {
          description: `${data.student.name} должна вернуть до ${new Date(data.due_date).toLocaleDateString('ru-RU')}`
        })
        // Reset
        setTimeout(() => {
          resetForm()
        }, 2500)
      } else {
        toast.error(data.error || 'Не удалось выдать книгу')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setStudentQuery('')
    setStudentResults([])
    setSelectedStudent(null)
    setBookQuery('')
    setBookResults([])
    setSelectedBook(null)
    setNotes('')
    setSuccess(null)
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    setDueDate(d.toISOString().split('T')[0])
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
          Выдать <span className="text-gradient-gold">книгу</span>
        </h1>
        <p className="text-[#94a3b8]">Три простых шага: ученик → книга → подтверждение</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                step >= s
                  ? 'bg-gradient-to-br from-[#e8b94e] to-[#c89538] text-[#06070d] shadow-lg shadow-[#e8b94e]/20'
                  : 'bg-white/5 text-[#5a6383]'
              }`}
            >
              {step > s ? <Check size={14} /> : s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-1 rounded-full transition-all ${step > s ? 'bg-[#e8b94e]' : 'bg-white/5'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#11141f] border border-[#4ecdc4]/30 rounded-2xl p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4ecdc4] to-[#2d9b94] mx-auto mb-4 flex items-center justify-center"
            >
              <Check size={36} className="text-[#06070d]" strokeWidth={3} />
            </motion.div>
            <h2 className="font-display font-bold text-2xl mb-2">Книга выдана!</h2>
            <p className="text-[#94a3b8] mb-1">
              <span className="text-white font-semibold">{success.student.name}</span> взял(а)
            </p>
            <p className="text-lg font-bold text-gradient-gold mb-4">«{success.book.title}»</p>
            <p className="text-sm text-[#5a6383]">
              Вернуть до {new Date(success.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-[#11141f] border border-white/5 rounded-2xl p-6 sm:p-8"
          >
            {/* STEP 1: STUDENT */}
            {step === 1 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#60a5fa]/10 text-[#60a5fa] flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-xl">Кому выдаём?</h2>
                    <p className="text-sm text-[#5a6383]">Найди ученика по имени, email или классу</p>
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6383]" />
                  <input
                    ref={searchRef}
                    type="text"
                    autoFocus
                    placeholder="Например: Айдана или 10-А"
                    value={studentQuery}
                    onChange={e => setStudentQuery(e.target.value)}
                    className="w-full bg-[#0a0c17] border border-white/10 pl-12 pr-4 py-4 rounded-xl text-white placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/40 focus:bg-[#11141f] transition-all"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {studentResults.length === 0 && studentQuery.length > 0 && (
                    <div className="text-center py-8 text-[#5a6383] text-sm">
                      Никого не нашли. Попробуй другое имя или email.
                    </div>
                  )}
                  {studentQuery.length === 0 && (
                    <div className="text-center py-12 text-[#5a6383] text-sm">
                      👆 Начни вводить имя ученика
                    </div>
                  )}
                  {studentResults.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedStudent(s); setStep(2) }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-[#e8b94e]/10 hover:border-[#e8b94e]/30 border border-white/5 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#60a5fa] to-[#1a56db] flex items-center justify-center font-bold text-white shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold">{s.name}</div>
                        <div className="text-xs text-[#5a6383]">
                          {s.class_name || '—'} · {s.email}
                        </div>
                      </div>
                      {s.currently_holding > 0 && (
                        <div className="text-right shrink-0">
                          <div className="text-xs text-[#4ecdc4] font-bold">{s.currently_holding} на руках</div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: BOOK */}
            {step === 2 && selectedStudent && (
              <div>
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#60a5fa] to-[#1a56db] flex items-center justify-center font-bold text-white text-sm">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{selectedStudent.name}</div>
                    <div className="text-xs text-[#5a6383]">{selectedStudent.class_name || '—'}</div>
                  </div>
                  <button onClick={() => { setSelectedStudent(null); setStep(1) }} className="text-[#5a6383] hover:text-[#ff5d8f]">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-4 mt-6">
                  <div className="w-10 h-10 rounded-xl bg-[#e8b94e]/10 text-[#e8b94e] flex items-center justify-center">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-xl">Какую книгу?</h2>
                    <p className="text-sm text-[#5a6383]">Найди книгу в каталоге</p>
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6383]" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Название или автор"
                    value={bookQuery}
                    onChange={e => setBookQuery(e.target.value)}
                    className="w-full bg-[#0a0c17] border border-white/10 pl-12 pr-4 py-4 rounded-xl text-white placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/40 focus:bg-[#11141f] transition-all"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {bookResults.length === 0 && bookQuery.length > 0 && (
                    <div className="text-center py-8 text-[#5a6383] text-sm">
                      Книга не найдена
                    </div>
                  )}
                  {bookQuery.length === 0 && (
                    <div className="text-center py-12 text-[#5a6383] text-sm">
                      👆 Начни вводить название книги
                    </div>
                  )}
                  {bookResults.map(b => {
                    const available = (b.available_copies ?? 1) > 0
                    return (
                      <button
                        key={b.id}
                        onClick={() => available && (setSelectedBook(b), setStep(3))}
                        disabled={!available}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${
                          available
                            ? 'bg-white/5 hover:bg-[#e8b94e]/10 hover:border-[#e8b94e]/30 border-white/5'
                            : 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="w-10 h-14 rounded bg-[#0a0c17] overflow-hidden shrink-0">
                          {b.cover_url && <img src={b.cover_url} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate">{b.title}</div>
                          <div className="text-xs text-[#5a6383] truncate">{b.author}</div>
                          {b.genre && <div className="text-xs text-[#e8b94e] mt-1">{b.genre}</div>}
                        </div>
                        {!available && (
                          <div className="text-xs font-bold text-[#ff5d8f] shrink-0">НЕТ</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: CONFIRM */}
            {step === 3 && selectedStudent && selectedBook && (
              <div>
                <h2 className="font-display font-bold text-xl mb-6">Подтверди выдачу</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                    <User size={18} className="text-[#60a5fa]" />
                    <div className="flex-1">
                      <div className="text-xs text-[#5a6383] uppercase tracking-wider font-bold">Ученик</div>
                      <div className="font-bold">{selectedStudent.name}</div>
                      <div className="text-xs text-[#5a6383]">{selectedStudent.class_name} · {selectedStudent.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                    <BookOpen size={18} className="text-[#e8b94e]" />
                    <div className="flex-1">
                      <div className="text-xs text-[#5a6383] uppercase tracking-wider font-bold">Книга</div>
                      <div className="font-bold">{selectedBook.title}</div>
                      <div className="text-xs text-[#5a6383]">{selectedBook.author}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#5a6383] uppercase tracking-wider font-bold mb-2">
                      <Calendar size={12} className="inline mr-1" /> Вернуть до
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full bg-[#0a0c17] border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-[#e8b94e]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#5a6383] uppercase tracking-wider font-bold mb-2">
                      Заметка (опционально)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Например: для урока литературы"
                      className="w-full bg-[#0a0c17] border border-white/10 px-4 py-3 rounded-xl text-white placeholder-[#5a6383] outline-none focus:border-[#e8b94e]/40 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-semibold text-sm"
                  >
                    Назад
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleIssue}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-[#06070d]/30 border-t-[#06070d] rounded-full animate-spin" />
                    ) : (
                      <><BookMarked size={18} /> Выдать</>
                    )}
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}