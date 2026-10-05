'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Register() {
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
        toast.error(data.error || 'Не удалось зарегистрироваться', { duration: 6000 })
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
            Создать аккаунт
          </h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] mb-7">
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
              className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-[var(--color-text-on-brand)] text-[15px] font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Создать аккаунт <ArrowRight size={16} /></>}
            </motion.button>
          </form>

          <p className="text-center text-[14px] text-[var(--color-text-secondary)] mt-6">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-[var(--color-brand)] font-medium hover:underline">
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
    <label className="block text-[13px] text-[var(--color-text-primary)] font-medium mb-1.5">{label}</label>
    <input
      type={type}
      required={label !== 'Класс'}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[var(--color-bg-soft)] border border-transparent px-4 py-3 rounded-xl text-[15px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)] focus:bg-[var(--color-bg-card)] transition-all"
    />
  </div>
)