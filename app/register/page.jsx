'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !email || !password) return toast.error('Заполни все поля')
    if (password.length < 6) return toast.error('Пароль минимум 6 символов')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, className })
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Аккаунт создан')
        setTimeout(() => router.push('/login'), 800)
      } else {
        toast.error(data.error || 'Не удалось зарегистрироваться', {
          duration: 6000
        })
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
          <h1 className="text-[28px] font-semibold tracking-tight mb-1 text-[#1d1d1f]">
            Создать аккаунт
          </h1>
          <p className="text-[15px] text-[#6e6e73] mb-7">
            Присоединяйся к читателям DLS
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Field label="Имя" value={name} onChange={setName} />
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field label="Пароль" type="password" value={password} onChange={setPassword} />
            <Field label="Класс" value={className} onChange={setClassName} />

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a56db] hover:bg-[#1849b8] text-white text-[15px] font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Создать аккаунт <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[14px] text-[#6e6e73] mt-6">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-[#1a56db] font-medium hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

const Field = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-[13px] text-[#1d1d1f] font-medium mb-1.5">{label}</label>
    <input
      type={type}
      required={label !== 'Класс'}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-white border border-black/10 px-4 py-3 rounded-xl text-[15px] text-[#1d1d1f] outline-none focus:border-[#1a56db] focus:ring-4 focus:ring-[#1a56db]/10 transition-all"
    />
  </div>
)

export default Register