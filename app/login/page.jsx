'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Заполни email и пароль')

    setLoading(true)

    // Таймаут 12 секунд — потом сообщаем о проблеме сети
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      })
      clearTimeout(timeout)

      // Проверяем что ответ JSON
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        toast.error('Сервер вернул не JSON', {
          description: `HTTP ${res.status} — возможно БД не настроена`,
          duration: 8000
        })
        return
      }

      const data = await res.json()

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token)
        // Безопасный парсинг токена
        const { parseJwt } = await import('../../lib/jwt')
        const payload = parseJwt(data.token)
        if (!payload) {
          toast.error('Токен невалидный')
          return
        }
        toast.success(`С возвращением, ${payload.name}`)
        setTimeout(() => {
          if (payload.role === 'librarian') router.push('/librarian')
          else router.push('/library')
        }, 400)
      } else {
        const msg = data.error || `HTTP ${res.status} — Не удалось войти`
        toast.error(msg, { duration: 6000 })

        if (data.hint || /БД|setup|таблиц/i.test(msg)) {
          setTimeout(() => router.push('/setup'), 1500)
        }
      }
    } catch (err) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        toast.error('Сервер не отвечает', {
          description: 'Таймаут 12 сек. Проверь подключение к БД',
          duration: 8000
        })
      } else {
        toast.error('Ошибка сети', {
          description: err.message || 'Не удалось подключиться к серверу',
          duration: 8000
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-soft)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[420px]"
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
          <h1 className="text-[28px] font-semibold tracking-tight mb-1 text-[var(--color-text-primary)]">
            Войти в аккаунт
          </h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] mb-7">
            Чтобы продолжить читать
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] text-[var(--color-text-primary)] font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[var(--color-bg-soft)] border border-transparent pl-11 pr-4 py-3 rounded-xl text-[15px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] focus:bg-[var(--color-bg-card)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] text-[var(--color-text-primary)] font-medium mb-1.5">Пароль</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[var(--color-bg-soft)] border border-transparent pl-11 pr-4 py-3 rounded-xl text-[15px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] focus:bg-[var(--color-bg-card)] transition-all"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[15px] font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Войти <ArrowRight size={16} /></>}
            </motion.button>
          </form>

          <p className="text-center text-[14px] text-[var(--color-text-secondary)] mt-6">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-[var(--color-brand)] font-medium hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>

        <p className="text-center text-[12px] text-[var(--color-text-tertiary)] mt-6">
          Доступ только для учеников и сотрудников DLS
        </p>
      </motion.div>
    </div>
  )
}