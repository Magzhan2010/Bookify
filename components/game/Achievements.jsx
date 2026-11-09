'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { useT } from '../../lib/i18n'

/**
 * Достижения ученика и серия чтения (недели подряд с прочитанной книгой или отзывом).
 * userId — чужой профиль (для библиотекаря и учителя); без него — свой.
 */
export default function Achievements({ userId, compact = false }) {
  const [data, setData] = useState(null)
  const { t } = useT()

  useEffect(() => {
    let alive = true
    fetch(`/api/profile/achievements${userId ? `?user=${userId}` : ''}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive) setData(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [userId])

  if (!data) return null
  const earned = data.achievements.filter(a => a.earned).length
  const streak = data.stats.current_streak

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.4 }}
      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] p-6 sm:p-7 mb-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">{t('Достижения')}</h3>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mt-0.5">{t('Открыто {a} из {b}', { a: earned, b: data.achievements.length })}</p>
        </div>
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl ${streak > 0 ? 'bg-[#fff4e5] dark:bg-[#3a2a12]' : 'bg-[var(--color-bg-soft)]'}`}>
          <motion.span
            animate={streak > 0 ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className={streak > 0 ? 'text-[#f97316]' : 'text-[var(--color-text-tertiary)]'}
          >
            <Flame size={24} />
          </motion.span>
          <div>
            <div className="text-[20px] font-bold leading-none text-[var(--color-text-primary)] tabular-nums">
              {t('{n} нед.', { n: streak })}
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
              {t('серия чтения · рекорд {n}', { n: data.stats.best_streak })}
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-9'}`}>
        {data.achievements.map((a, i) => (
          <motion.div
            key={a.code}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            title={`${t(a.title)} — ${t(a.hint)}`}
            className="flex flex-col items-center text-center"
          >
            <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center text-[26px] transition-all ${
              a.earned
                ? 'bg-gradient-to-br from-[#fff4d6] to-[#ffe0a8] shadow-[0_6px_16px_rgba(201,138,18,0.25)]'
                : 'bg-[var(--color-bg-soft)] grayscale opacity-40'
            }`}>
              {a.icon}
            </div>
            <div className={`text-[11px] font-semibold mt-1.5 leading-tight ${a.earned ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>
              {t(a.title)}
            </div>
            {!a.earned && a.target > 1 && (
              <div className="w-10 h-1 rounded-full bg-[var(--color-bg-soft)] mt-1 overflow-hidden">
                <div className="h-full bg-[var(--color-brand)]" style={{ width: `${Math.round((a.value / a.target) * 100)}%` }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
