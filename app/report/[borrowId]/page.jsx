'use client'

import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft, BookOpen, Quote, HelpCircle, Lightbulb,
  Calendar, FileText, CheckCircle, Star, Loader2, Sparkles
} from 'lucide-react'

const questions = [
  { n: 1, field: 'quote1', title: 'Две важные цитаты', desc: 'Выпиши 2 ключевые мысли автора и объясни своими словами, почему они важны', icon: Quote },
  { n: 2, field: 'quote2', title: 'Что удивило', desc: 'Какие идеи или концепции заставили задуматься?', icon: HelpCircle },
  { n: 3, field: 'life_example', title: 'Как это в твоей жизни', desc: 'Свяжи прочитанное со своим опытом или ситуациями в школе', icon: Lightbulb },
  { n: 4, field: 'apply_today', title: 'Что применишь уже сегодня', desc: 'Конкретный измеримый план на ближайшие дни', icon: Calendar },
  { n: 5, field: 'confusing', title: 'Новые факты', desc: 'Выпиши новую информацию или факты, о которых не знал', icon: FileText }
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

  const canSubmit = Object.entries(answers).every(([k, v]) =>
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
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] pb-20">
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-[820px] mx-auto px-4 sm:px-6 h-14 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[14px] font-medium text-[#6e6e73] hover:text-[#1a56db] transition-colors"
          >
            <ArrowLeft size={15} /> Назад
          </button>
        </div>
      </div>

      <div className="max-w-[820px] mx-auto px-4 sm:px-6 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-[#1a56db]/10 rounded-full text-[11px] font-medium text-[#1a56db]">
            <Sparkles size={11} /> Отчёт о прочитанном
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] mb-3 leading-tight text-[#1d1d1f]">
            Книга — для <span className="text-[#1a56db]">изменения мышления</span>
          </h1>
          <p className="text-[15px] text-[#6e6e73] max-w-md mx-auto leading-[1.5]">
            5 вопросов, чтобы перевести мысли из кратковременной в долговременную память
          </p>
        </motion.div>

        {book && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-black/8 rounded-2xl p-5 flex gap-4 items-center mb-8"
          >
            <div className="w-20 h-28 rounded-xl overflow-hidden bg-[#f5f5f7] shrink-0">
              {book.cover_url && <img src={book.cover_url} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-medium text-[#86868b] mb-1">
                Отчёт по книге
              </div>
              <h3 className="text-[19px] font-semibold truncate text-[#1d1d1f]">{book.title}</h3>
              <p className="text-[14px] text-[#6e6e73] mb-2">{book.author}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1a56db]/10 text-[#1a56db] text-[11px] font-medium">
                <BookOpen size={10} /> Читаю сейчас
              </span>
            </div>
          </motion.div>
        )}

        {result?.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#34c759]/10 border border-[#34c759]/30 rounded-2xl p-8 text-center mb-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#34c759] mx-auto mb-3 flex items-center justify-center">
              <CheckCircle size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-[22px] font-semibold mb-2">Отчёт отправлен</h3>
            <p className="text-[14px] text-[#6e6e73]">Учитель проверит и зачтёт книгу</p>
          </motion.div>
        )}

        {!result?.success && questions.map((q, i) => {
          const Icon = q.icon
          const value = answers[q.field] || ''
          const charCount = value.length
          const isValid = charCount >= 20

          return (
            <motion.div
              key={q.n}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="bg-white border border-black/8 rounded-2xl p-5 sm:p-6 mb-4"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#1a56db]/10 text-[#1a56db] flex items-center justify-center shrink-0">
                  <Icon size={17} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-[#86868b]">
                      Вопрос {q.n}
                    </span>
                    {isValid && <CheckCircle size={12} className="text-[#34c759]" />}
                  </div>
                  <h3 className="text-[16px] font-semibold mb-1 text-[#1d1d1f]">{q.title}</h3>
                  <p className="text-[13px] text-[#86868b]">{q.desc}</p>
                </div>
              </div>

              <textarea
                value={value}
                onChange={e => update(q.field, e.target.value)}
                rows={4}
                className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-4 py-3 text-[#1d1d1f] outline-none focus:border-[#1a56db]/30 focus:bg-white transition-all resize-none text-[14px]"
              />

              <div className="text-right mt-2">
                <span className={`text-[11px] ${isValid ? 'text-[#34c759]' : 'text-[#86868b]'}`}>
                  {charCount} символов {isValid && '✓'}
                </span>
              </div>
            </motion.div>
          )
        })}

        {!result?.success && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-black/8 rounded-2xl p-6 text-center mb-6"
          >
            <p className="text-[11px] uppercase tracking-wider font-medium text-[#86868b] mb-4">
              Твоя оценка книги
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => update('rating', star)}
                  className={`text-3xl transition-colors ${
                    star <= answers.rating ? 'text-[#ff9500]' : 'text-[#d2d2d7]'
                  }`}
                >
                  {star <= answers.rating ? '★' : '☆'}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {!result?.success && (
          <>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="w-full py-3.5 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[16px] font-medium flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Сдать отчёт <CheckCircle size={16} /></>
              )}
            </button>

            {result?.error && (
              <div className="text-center mt-3 p-3 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] text-[13px]">
                {result.error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}