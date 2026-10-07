'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Database, CheckCircle, AlertCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react'

export default function SetupPage() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [result, setResult] = useState(null)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/setup')
      setStatus(await res.json())
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
        setResult({ type: 'success', message: 'Таблицы созданы' })
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
    <div className="min-h-screen bg-[var(--color-bg-soft)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--color-bg-card)] ring-1 ring-[var(--color-border)]">
            <Image src="/lb_logo.png" width={56} height={56} alt="DLS" className="object-contain" />
          </div>
          <div className="text-left">
            <div className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">Bookify</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] font-medium">DLS Library</div>
          </div>
        </Link>

        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] p-9 shadow-[var(--shadow-soft)]">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-brand-soft)] mb-3">
              <Database size={26} className="text-[var(--color-brand)]" />
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)]">Статус системы</h1>
            <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">Проверка подключения к базе данных</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[var(--color-text-secondary)] text-[14px]">
              <Loader2 size={16} className="animate-spin" /> Проверяю БД
            </div>
          ) : status?.ready ? (
            <>
              <div className="p-4 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-[var(--color-success)]" size={16} />
                  <span className="font-semibold text-[14px] text-[var(--color-text-primary)]">БД готова к работе</span>
                </div>
                <div className="text-[12px] text-[var(--color-text-secondary)] space-y-0.5">
                  <div>📊 Таблиц: <strong className="text-[var(--color-text-primary)]">{status.tables}</strong></div>
                  <div>👤 Пользователей: <strong className="text-[var(--color-text-primary)]">{status.users}</strong></div>
                  <div>📚 Книг: <strong className="text-[var(--color-text-primary)]">{status.books}</strong></div>
                </div>
              </div>

              {status.users === 0 && (
                <div className="mb-4 p-4 rounded-xl bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/30">
                  <div className="text-[13px] font-semibold text-[var(--color-brand)] mb-2">Первый запуск</div>
                  <p className="text-[12px] text-[var(--color-text-primary)] leading-[1.5]">
                    Зарегистрируйте библиотекаря: используйте email вида <code className="bg-[var(--color-bg-card)] px-1.5 py-0.5 rounded text-[11px]">@dls.school</code> — это автоматически даст права библиотекаря.
                  </p>
                </div>
              )}

              <Link
                href="/login"
                className="w-full py-3 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[14px] font-medium flex items-center justify-center gap-2 transition-colors"
              >
                Войти <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-[var(--color-danger)]" size={16} />
                  <span className="font-semibold text-[14px] text-[var(--color-danger)]">БД недоступна</span>
                </div>
                <p className="text-[12px] text-[var(--color-text-secondary)] mb-2">{status?.error}</p>
              </div>

              {status?.tables === 0 && (
                <button
                  onClick={handleSetup}
                  disabled={seeding}
                  className="w-full mb-3 py-3 rounded-xl bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} Создать таблицы
                </button>
              )}

              <div className="p-4 rounded-xl bg-[var(--color-bg-soft)]">
                <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mb-2">Что делать</p>
                <ol className="text-[13px] text-[var(--color-text-primary)] space-y-1.5 list-decimal list-inside">
                  <li>Создай БД на <a href="https://neon.tech" target="_blank" className="text-[var(--color-brand)] underline">neon.tech</a></li>
                  <li>Скопируй Connection String в <code className="text-[11px] bg-[var(--color-bg-card)] px-1.5 py-0.5 rounded">.env.local</code></li>
                  <li>Перезапусти <code className="text-[11px] bg-[var(--color-bg-card)] px-1.5 py-0.5 rounded">npm run dev</code></li>
                </ol>
              </div>

              <button
                onClick={checkStatus}
                className="w-full mt-4 py-3 rounded-xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-border)] text-[var(--color-text-primary)] text-[14px] font-medium transition-colors"
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
                  ? 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)]'
                  : 'bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)]'
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