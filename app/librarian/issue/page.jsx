'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Search, BookMarked, Check, User, Calendar, X, BookOpen } from 'lucide-react'

export default function IssuePage() {
  const [step, setStep] = useState(1)
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
        if (data.length === 0) {
          const r2 = await fetch(`/api/librarian/students?q=${encodeURIComponent(studentQuery)}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          setStudentResults(await r2.json())
        } else {
          setStudentResults(data)
        }
      } catch (err) { console.error(err) }
    }, 250)
    return () => clearTimeout(t)
  }, [studentQuery])

  useEffect(() => {
    if (!bookQuery.trim()) {
      setBookResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(bookQuery)}`)
        setBookResults(await res.json())
      } catch (err) { console.error(err) }
    }, 250)
    return () => clearTimeout(t)
  }, [bookQuery])

  const handleIssue = async () => {
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/issue', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
        toast.success(`Книга выдана: ${data.book.title}`)
        setTimeout(() => resetForm(), 2500)
      } else {
        toast.error(data.error || 'Не удалось выдать')
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
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-2 text-[#1d1d1f]">
          Выдать книгу
        </h1>
        <p className="text-[15px] text-[#6e6e73]">Три шага: ученик → книга → подтверждение</p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-[14px] transition-all ${
                step >= s ? 'bg-[#1a56db] text-white' : 'bg-white border border-black/10 text-[#86868b]'
              }`}
            >
              {step > s ? <Check size={14} /> : s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-0.5 rounded-full transition-all ${step > s ? 'bg-[#1a56db]' : 'bg-[#e5e7eb]'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-[#34c759]/30 rounded-2xl p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-[#34c759] mx-auto mb-4 flex items-center justify-center"
            >
              <Check size={36} className="text-white" strokeWidth={3} />
            </motion.div>
            <h2 className="text-2xl font-semibold mb-2 text-[#1d1d1f]">Книга выдана</h2>
            <p className="text-[#6e6e73] mb-1">
              <span className="text-[#1d1d1f] font-medium">{success.student.name}</span> взял
            </p>
            <p className="text-[18px] font-semibold text-[#1a56db] mb-4">«{success.book.title}»</p>
            <p className="text-[13px] text-[#86868b]">
              Вернуть до {new Date(success.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-black/8 rounded-2xl p-6 sm:p-8"
          >
            {step === 1 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#1a56db]/10 text-[#1a56db] flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#1d1d1f]">Кому выдаём?</h2>
                    <p className="text-[13px] text-[#86868b]">Найди ученика</p>
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" />
                  <input
                    ref={searchRef}
                    type="text"
                    autoFocus
                    value={studentQuery}
                    onChange={e => setStudentQuery(e.target.value)}
                    className="w-full bg-[#f5f5f7] border border-transparent pl-11 pr-4 py-3.5 rounded-xl text-[#1d1d1f] outline-none focus:border-[#1a56db]/30 focus:bg-white focus:ring-4 focus:ring-[#1a56db]/10 transition-all text-[15px]"
                  />
                </div>

                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {studentResults.length === 0 && studentQuery.length > 0 && (
                    <div className="text-center py-8 text-[#86868b] text-[13px]">Никого не нашли</div>
                  )}
                  {studentQuery.length === 0 && (
                    <div className="text-center py-12 text-[#86868b] text-[13px]">Начни вводить имя</div>
                  )}
                  {studentResults.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedStudent(s); setStep(2) }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#f5f5f7] hover:bg-white hover:border-[#1a56db]/30 border border-transparent transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#1a56db] flex items-center justify-center font-semibold text-white shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[14px] text-[#1d1d1f]">{s.name}</div>
                        <div className="text-[12px] text-[#86868b]">{s.class_name || '—'} · {s.email}</div>
                      </div>
                      {s.currently_holding > 0 && (
                        <div className="text-right shrink-0">
                          <div className="text-[11px] text-[#ff9500] font-semibold">{s.currently_holding} на руках</div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && selectedStudent && (
              <div>
                <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-[#f5f5f7]">
                  <div className="w-10 h-10 rounded-xl bg-[#1a56db] flex items-center justify-center font-semibold text-white text-[14px]">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[14px] text-[#1d1d1f]">{selectedStudent.name}</div>
                    <div className="text-[12px] text-[#86868b]">{selectedStudent.class_name || '—'}</div>
                  </div>
                  <button onClick={() => { setSelectedStudent(null); setStep(1) }} className="text-[#86868b] hover:text-[#1d1d1f]">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-5 mt-6">
                  <div className="w-10 h-10 rounded-xl bg-[#1a56db]/10 text-[#1a56db] flex items-center justify-center">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#1d1d1f]">Какую книгу?</h2>
                    <p className="text-[13px] text-[#86868b]">Найди в каталоге</p>
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" />
                  <input
                    type="text"
                    autoFocus
                    value={bookQuery}
                    onChange={e => setBookQuery(e.target.value)}
                    className="w-full bg-[#f5f5f7] border border-transparent pl-11 pr-4 py-3.5 rounded-xl text-[#1d1d1f] outline-none focus:border-[#1a56db]/30 focus:bg-white focus:ring-4 focus:ring-[#1a56db]/10 transition-all text-[15px]"
                  />
                </div>

                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {bookResults.length === 0 && bookQuery.length > 0 && (
                    <div className="text-center py-8 text-[#86868b] text-[13px]">Не нашли</div>
                  )}
                  {bookQuery.length === 0 && (
                    <div className="text-center py-12 text-[#86868b] text-[13px]">Начни вводить название</div>
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
                            ? 'bg-[#f5f5f7] hover:bg-white hover:border-[#1a56db]/30 border-transparent'
                            : 'bg-[#f5f5f7] border-transparent opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="w-10 h-14 rounded bg-white overflow-hidden shrink-0">
                          {b.cover_url && <img src={b.cover_url} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[14px] truncate text-[#1d1d1f]">{b.title}</div>
                          <div className="text-[12px] text-[#86868b] truncate">{b.author}</div>
                          {b.genre && <div className="text-[11px] text-[#1a56db] mt-0.5">{b.genre}</div>}
                        </div>
                        {!available && <div className="text-[11px] font-semibold text-[#ff3b30] shrink-0">НЕТ</div>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 3 && selectedStudent && selectedBook && (
              <div>
                <h2 className="text-[18px] font-semibold mb-5 text-[#1d1d1f]">Подтверди выдачу</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f5f5f7]">
                    <User size={16} className="text-[#1a56db]" />
                    <div className="flex-1">
                      <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-medium">Ученик</div>
                      <div className="font-semibold text-[14px] text-[#1d1d1f]">{selectedStudent.name}</div>
                      <div className="text-[12px] text-[#86868b]">{selectedStudent.class_name} · {selectedStudent.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f5f5f7]">
                    <BookOpen size={16} className="text-[#1a56db]" />
                    <div className="flex-1">
                      <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-medium">Книга</div>
                      <div className="font-semibold text-[14px] text-[#1d1d1f]">{selectedBook.title}</div>
                      <div className="text-[12px] text-[#86868b]">{selectedBook.author}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] text-[#86868b] uppercase tracking-wider font-medium mb-1.5">
                      <Calendar size={11} className="inline mr-1" /> Вернуть до
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full bg-[#f5f5f7] border border-transparent px-4 py-3 rounded-xl text-[#1d1d1f] outline-none focus:border-[#1a56db]/30 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] text-[#86868b] uppercase tracking-wider font-medium mb-1.5">
                      Заметка (опционально)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full bg-[#f5f5f7] border border-transparent px-4 py-3 rounded-xl text-[#1d1d1f] outline-none focus:border-[#1a56db]/30 focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-3 rounded-xl bg-[#f5f5f7] hover:bg-[#ececec] text-[#1d1d1f] font-medium text-[14px]"
                  >
                    Назад
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleIssue}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[15px] font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><BookMarked size={16} /> Выдать</>
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