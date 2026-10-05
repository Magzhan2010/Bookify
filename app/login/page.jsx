'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Заполни email и пароль')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()

      if (data.token) {
        localStorage.setItem('token', data.token)
        const payload = JSON.parse(atob(data.token.split('.')[1]))
        toast.success(`С возвращением, ${payload.name}`)
        setTimeout(() => {
          if (payload.role === 'admin') router.push('/admin')
          else if (payload.role === 'librarian') router.push('/librarian')
          else router.push('/library')
        }, 400)
      } else {
        toast.error(data.error || 'Не удалось войти', { duration: 6000 })
        if (data.hint || data.error?.includes('БД') || data.error?.includes('/setup')) {
          setTimeout(() => router.push('/setup'), 1500)
        }
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[420px]"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white ring-1 ring-black/5">
            <Image src="/lb_logo.png" width={56} height={56} alt="DLS" className="object-contain" />
          </div>
          <div className="text-left">
            <div className="text-xl font-semibold tracking-tight text-[#1d1d1f]">Bookify</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#86868b] font-medium">DLS Library</div>
          </div>
        </Link>

        {/* Card */}
        <div className="bg-white border border-black/8 rounded-[24px] p-9 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <h1 className="text-[28px] font-semibold tracking-tight mb-1 text-[#1d1d1f]">
            Войти в аккаунт
          </h1>
          <p className="text-[15px] text-[#6e6e73] mb-7">
            Чтобы продолжить читать
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] text-[#1d1d1f] font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border border-black/10 pl-10 pr-4 py-3 rounded-xl text-[15px] text-[#1d1d1f] outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] text-[#1d1d1f] font-medium mb-1.5">Пароль</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-black/10 pl-10 pr-4 py-3 rounded-xl text-[15px] text-[#1d1d1f] outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/10 transition-all"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a56db] hover:bg-[#1849b8] text-white text-[15px] font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Войти <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[14px] text-[#6e6e73] mt-6">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-[#1a56db] font-medium hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>

        <p className="text-center text-[12px] text-[#86868b] mt-6">
          Доступ только для учеников и сотрудников DLS
        </p>
      </motion.div>
    </div>
  )
}

export default Login