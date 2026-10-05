'use client'

import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft, BookOpen, Quote, HelpCircle, Lightbulb,
  Calendar, FileText, CheckCircle, Star, Loader2, Sparkles
} from 'lucide-react'

const questions = [
  {
    n: 1,
    field: 'quote1',
    title: 'Две важные цитаты',
    desc: 'Выпиши 2 ключевые мысли автора и объясни своими словами, почему они важны',
    icon: Quote
  },
  {
    n: 2,
    field: 'quote2',
    title: 'Что удивило',
    desc: 'Какие идеи или концепции заставили задуматься?',
    icon: HelpCircle
  },
  {
    n: 3,
    field: 'life_example',
    title: 'Как это в твоей жизни',
    desc: 'Свяжи прочитанное со своим опытом или ситуациями в школе',
    icon: Lightbulb
  },
  {
    n: 4,
    field: 'apply_today',
    title: 'Что применишь уже сегодня',
    desc: 'Конкретный измеримый план на ближайшие дни',
    icon: Calendar
  },
  {
    n: 5,
    field: 'confusing',
    title: 'Новые факты',
    desc: 'Выпиши новую информацию или факты, о которых не знал',
    icon: FileText
  }
]

export default function ReportPage() {
  const [book, setBook] = useState(null)
  const [answers, setAnswers] = useState({
    quote1: '', quote2: '', life_example: '', apply_today: '', confusing: '', rating: 0
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const router = useRouter()
  const { borrowId } = useParams()

  useEffect(() => {
    const fetchBook = async () => {
      const token = localStorage.getItem('token')
      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        const found = data.active?.find(b => Number(b.borrow_id) === Number(borrowId))
        if (found) setBook(found)
      } catch (err) { console.error(err) }
    }
    fetchBook()
  }, [borrowId])

  const update = (field, value) => setAnswers(prev => ({ ...prev, [field]: value }))

  const canSubmit =
    Object.entries(answers).every(([k, v]) =>
      k === 'rating' ? v > 0 : (v?.trim()?.length >= 20)
    )

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookId: book.book_id, borrowId, ...answers })
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true })
        setTimeout(() => router.push('/profile'), 2500)
      } else {
        setResult({ error: data.error })
      }
    } catch (err) {
      setResult({ error: 'Не удалось отправить' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06070d] text-white pb-20">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#06070d]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 h-16 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-semibold text-[#94a3b8] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Назад
          </button>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-[#e8b94e]/10 border border-[#e8b94e]/20 rounded-full text-[10px] font-bold text-[#e8b94e] uppercase tracking-widest">
            <Sparkles size={10} /> Отчёт о прочитанном
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tighter mb-3 leading-tight">
            Книга — для <span className="text-gradient-gold">изменения мышления</span>
          </h1>
          <p className="text-[#94a3b8] max-w-md mx-auto">
            5 вопросов, чтобы перевести мысли из кратковременной в долговременную память
          </p>
        </motion.div>

        {/* Book card */}
        {book && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#11141f] border border-white/5 rounded-2xl p-5 flex gap-4 items-center mb-8"
          >
            <div className="w-20 h-28 rounded-lg overflow-hidden bg-[#0a0c17] shrink-0">
              {book.cover_url && <img src={book.cover_url} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#5a6383] mb-1">
                Отчёт по книге
              </div>
              <h3 className="font-display text-xl font-bold truncate">{book.title}</h3>
              <p className="text-sm text-[#94a3b8] mb-2">{book.author}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e8b94e]/15 border border-[#e8b94e]/30 text-[#e8b94e] text-[10px] font-bold uppercase tracking-wider">
                <BookOpen size={10} /> Читаю сейчас
              </span>
            </div>
          </motion.div>
        )}

        {/* Success */}
        {result?.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#4ecdc4]/10 border border-[#4ecdc4]/30 rounded-2xl p-8 text-center mb-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#4ecdc4] mx-auto mb-3 flex items-center justify-center">
              <CheckCircle size={32} className="text-[#06070d]" />
            </div>
            <h3 className="font-display font-bold text-2xl mb-2">Отчёт отправлен!</h3>
            <p className="text-[#94a3b8] text-sm">Учитель проверит и зачтёт книгу. Возвращаемся в профиль...</p>
          </motion.div>
        )}

        {/* Questions */}
        {!result?.success && questions.map((q, i) => {
          const Icon = q.icon
          const value = answers[q.field] || ''
          const charCount = value.length
          const isValid = charCount >= 20

          return (
            <motion.div
              key={q.n}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="bg-[#11141f] border border-white/5 rounded-2xl p-5 sm:p-6 mb-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8b94e]/10 border border-[#e8b94e]/20 text-[#e8b94e] flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#5a6383]">
                      Вопрос {q.n}
                    </span>
                    {isValid && (
                      <CheckCircle size={12} className="text-[#4ecdc4]" />
                    )}
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1">{q.title}</h3>
                  <p className="text-sm text-[#5a6383]">{q.desc}</p>
                </div>
              </div>

              <textarea
                value={value}
                onChange={e => update(q.field, e.target.value)}
                rows={4}
                placeholder="Минимум 20 символов..."
                className="w-full bg-[#0a0c17] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-[#3a4565] outline-none focus:border-[#e8b94e]/30 transition-all resize-none text-sm"
              />

              <div className="text-right mt-2">
                <span className={`text-xs ${isValid ? 'text-[#4ecdc4]' : 'text-[#5a6383]'}`}>
                  {charCount} символов {isValid && '✓'}
                </span>
              </div>
            </motion.div>
          )
        })}

        {/* Rating */}
        {!result?.success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#11141f] border border-white/5 rounded-2xl p-6 text-center mb-6"
          >
            <p className="text-xs uppercase tracking-widest font-bold text-[#5a6383] mb-4">
              Твоя оценка книги
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => update('rating', star)}
                  className={`text-4xl transition-colors ${
                    star <= answers.rating ? 'text-[#e8b94e]' : 'text-[#252a3d]'
                  }`}
                >
                  {star <= answers.rating ? '★' : '☆'}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Submit */}
        {!result?.success && (
          <>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#e8b94e]/30 transition-all"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>Сдать отчёт <CheckCircle size={18} /></>
              )}
            </button>

            {result?.error && (
              <div className="text-center mt-3 p-3 rounded-xl bg-[#ff5d8f]/10 border border-[#ff5d8f]/30 text-[#ff5d8f] text-sm">
                {result.error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}