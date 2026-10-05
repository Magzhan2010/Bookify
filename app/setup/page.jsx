'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Database, CheckCircle, AlertCircle, Loader2, ArrowRight, UserPlus, BookOpen } from 'lucide-react'

export default function SetupPage() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [result, setResult] = useState(null)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/setup')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      setStatus({ ready: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { checkStatus() }, [])

  const handleSetup = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/setup', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setResult({ type: 'success', message: `Готово! Создано пользователей: ${data.users_created}` })
        checkStatus()
      } else {
        setResult({ type: 'error', message: data.error })
      }
    } catch (err) {
      setResult({ type: 'error', message: err.message })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white ring-1 ring-black/5">
            <Image src="/lb_logo.png" width={56} height={56} alt="DLS" className="object-contain" />
          </div>
          <div className="text-left">
            <div className="text-xl font-semibold tracking-tight text-[#1d1d1f]">Bookify</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#86868b] font-medium">DLS Library</div>
          </div>
        </Link>

        <div className="bg-white border border-black/8 rounded-[24px] p-9 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1a56db]/10 mb-3">
              <Database size={26} className="text-[#1a56db]" />
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[#1d1d1f]">Настройка Bookify</h1>
            <p className="text-[14px] text-[#6e6e73] mt-1">Создаём таблицы и тестовые аккаунты</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[#6e6e73] text-[14px]">
              <Loader2 size={16} className="animate-spin" />
              Проверяю БД
            </div>
          ) : status?.ready ? (
            <>
              <div className="p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-[#34c759]" size={16} />
                  <span className="font-semibold text-[14px] text-[#34c759]">БД настроена</span>
                </div>
                <div className="text-[12px] text-[#6e6e73] space-y-0.5">
                  <div>📊 Таблиц: <strong className="text-[#1d1d1f]">{status.tables}</strong></div>
                  <div>👤 Пользователей: <strong className="text-[#1d1d1f]">{status.users}</strong></div>
                  <div>📚 Книг: <strong className="text-[#1d1d1f]">{status.books}</strong></div>
                </div>
              </div>

              {status.users === 0 && (
                <button
                  onClick={handleSetup}
                  disabled={seeding}
                  className="w-full py-3 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mb-3"
                >
                  {seeding ? <Loader2 size={14} className="animate-spin" /> : <><UserPlus size={14} /> Создать демо-аккаунты</>}
                </button>
              )}

              <Link
                href="/login"
                className="w-full py-3 rounded-xl bg-[#f5f5f7] hover:bg-[#ececec] text-[#1d1d1f] text-[14px] font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Войти <ArrowRight size={14} />
              </Link>

              {status.users > 0 && (
                <div className="mt-5 p-4 rounded-xl bg-[#f5f5f7]">
                  <p className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium mb-2">Тестовые аккаунты</p>
                  <div className="space-y-1.5 text-[12px] font-mono">
                    <div className="flex justify-between text-[#1d1d1f]">
                      <span>admin@dls.school.com</span><span className="text-[#86868b]">admin123</span>
                    </div>
                    <div className="flex justify-between text-[#1d1d1f]">
                      <span>aigerim@librarian.school.com</span><span className="text-[#86868b]">library123</span>
                    </div>
                    <div className="flex justify-between text-[#1d1d1f]">
                      <span>aidana@student.school.com</span><span className="text-[#86868b]">student123</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-[#ff3b30]" size={16} />
                  <span className="font-semibold text-[14px] text-[#ff3b30]">БД недоступна</span>
                </div>
                <p className="text-[12px] text-[#6e6e73] mb-2">{status?.error}</p>
              </div>

              <div className="p-4 rounded-xl bg-[#f5f5f7]">
                <p className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium mb-2">Что делать</p>
                <ol className="text-[13px] text-[#1d1d1f] space-y-1.5 list-decimal list-inside">
                  <li>Создай БД на <a href="https://neon.tech" target="_blank" className="text-[#1a56db] underline">neon.tech</a></li>
                  <li>Скопируй Connection String в <code className="text-[11px] bg-white px-1.5 py-0.5 rounded">.env.local</code></li>
                  <li>Перезапусти <code className="text-[11px] bg-white px-1.5 py-0.5 rounded">npm run dev</code></li>
                  <li>Вернись сюда</li>
                </ol>
              </div>

              <button
                onClick={checkStatus}
                className="w-full mt-4 py-3 rounded-xl bg-[#f5f5f7] hover:bg-[#ececec] text-[#1d1d1f] text-[14px] font-medium transition-colors"
              >
                Проверить снова
              </button>
            </>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-3 rounded-xl text-[13px] ${
                result.type === 'success'
                  ? 'bg-[#34c759]/10 border border-[#34c759]/20 text-[#34c759]'
                  : 'bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30]'
              }`}
            >
              {result.message}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}