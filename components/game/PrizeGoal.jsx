'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Target, ArrowRight, PartyPopper } from 'lucide-react'
import PrizeVisual from './PrizeVisual'

const coins = n => {
  const a = Math.abs(n) % 100, b = a % 10
  if (a > 10 && a < 20) return 'монет'
  if (b === 1) return 'монета'
  if (b >= 2 && b <= 4) return 'монеты'
  return 'монет'
}

/** Цель-копилка в профиле: «до приза осталось N монет». */
export default function PrizeGoal() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/shop/goal', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) return null

  if (!data.goal) {
    return (
      <Link href="/shop" className="group mb-6 flex items-center gap-4 rounded-[24px] border border-dashed border-[var(--color-border-strong)] p-4 sm:p-5 hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-brand-soft)]/40 transition-colors">
        <span className="w-11 h-11 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center shrink-0"><Target size={20} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold">Цель-копилка</span>
          <span className="block text-[13px] text-[var(--color-text-tertiary)]">Выбери приз в магазине — здесь появится полоска, сколько осталось накопить.</span>
        </span>
        <ArrowRight size={18} className="text-[var(--color-text-tertiary)] group-hover:translate-x-0.5 group-hover:text-[var(--color-brand)] transition-all shrink-0" />
      </Link>
    )
  }

  const g = data.goal
  const have = data.balance?.available ?? 0
  const left = Math.max(0, g.price - have)
  const pct = Math.min(100, Math.round((have / g.price) * 100))
  const enough = left === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden mb-6 rounded-[28px] p-5 sm:p-6 text-white"
      style={{ background: 'linear-gradient(135deg, #1f2a5c 0%, #1a3a9c 100%)' }}
    >
      <div aria-hidden className="absolute -right-16 -top-20 w-64 h-64 rounded-full blur-3xl opacity-30" style={{ background: '#ffc93c' }} />
      <div className="relative flex items-center gap-4 sm:gap-6">
        <div className="w-[84px] sm:w-[104px] shrink-0 rounded-[20px] overflow-hidden bg-white/90 p-1">
          <PrizeVisual code={g.code} image={g.custom_image} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#ffc93c]">
            <Target size={13} /> Цель-копилка
          </div>
          <div className="mt-1 text-[20px] sm:text-[24px] font-semibold tracking-tight leading-tight truncate">{g.title}</div>
          <div className="mt-1 text-[14px] text-white/75">
            {enough
              ? <span className="inline-flex items-center gap-1.5 text-[#ffc93c] font-semibold"><PartyPopper size={15} /> Монет хватает — можно обменять!</span>
              : <>До приза осталось <b className="text-white">{left} {coins(left)}</b></>}
          </div>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="h-3 rounded-full bg-white/15 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #ffc93c, #ff9f43)', boxShadow: '0 0 16px rgba(255,201,60,0.6)' }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px] text-white/65 tabular-nums">
          <span>{have} из {g.price} {coins(g.price)} · {pct}%</span>
          <Link href="/shop" className="inline-flex items-center gap-1 font-semibold text-white hover:text-[#ffc93c] transition-colors">
            {enough ? 'Обменять' : 'Сменить цель'} <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
