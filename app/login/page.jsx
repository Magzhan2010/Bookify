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
        toast.success(`С возвращением, ${payload.name}!`)
        setTimeout(() => {
          if (payload.role === 'admin') router.push('/admin')
          else if (payload.role === 'librarian') router.push('/librarian')
          else router.push('/library')
        }, 400)
      } else {
        toast.error(data.error || 'Не удалось войти')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06070d] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#e8b94e]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4ecdc4]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-1 ring-[#e8b94e]/30">
            <div className="absolute inset-0 bg-gradient-to-br from-[#e8b94e]/20 to-transparent" />
            <Image src="/lb_logo.png" width={56} height={56} alt="DLS" className="object-contain relative z-10" />
          </div>
          <div className="text-left">
            <div className="font-display text-2xl font-black tracking-tight">
              Book<span className="text-gradient-gold">ify</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#5a6383] font-medium">
              DLS Library
            </div>
          </div>
        </Link>

        {/* Card */}
        <div className="bg-[#11141f]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h1 className="font-display text-2xl sm:text-3xl font-black mb-1">С возвращением</h1>
          <p className="text-[#94a3b8] text-sm mb-6">Войди, чтобы продолжить читать</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#5a6383] uppercase tracking-wider font-bold mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6383]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@school.com"
                  className="w-full bg-[#0a0c17] border border-white/10 pl-11 pr-4 py-3 rounded-xl text-white placeholder-[#3a4565] outline-none focus:border-[#e8b94e]/40 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#5a6383] uppercase tracking-wider font-bold mb-1.5">Пароль</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6383]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0a0c17] border border-white/10 pl-11 pr-4 py-3 rounded-xl text-white placeholder-[#3a4565] outline-none focus:border-[#e8b94e]/40 transition-all"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-[#e8b94e]/30 transition-all"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Войти <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[#5a6383] text-sm mt-6">
            Нет аккаунта? <Link href="/register" className="text-[#e8b94e] font-semibold hover:underline">Зарегистрироваться</Link>
          </p>
        </div>

        <p className="text-center text-[#3a4565] text-xs mt-6">
          Доступ только для учеников и сотрудников DLS
        </p>
      </motion.div>
    </div>
  )
}

export default Login