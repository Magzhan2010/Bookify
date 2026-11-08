'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Crown, BookOpen, School, Users } from 'lucide-react'
import { useGame } from '../../../components/game/GameContext'
import { levelFor } from '../../../lib/points'

const PODIUM = [
  { place: 2, height: 'h-24', color: '#c0c7d6', medal: '🥈' },
  { place: 1, height: 'h-32', color: '#ffc93c', medal: '🥇' },
  { place: 3, height: 'h-20', color: '#e3a06b', medal: '🥉' }
]

export default function LeaderboardPage() {
  const { summary } = useGame()
  const [cls, setCls] = useState('') // '' = вся школа
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const token = localStorage.getItem('token')
    const q = cls ? `?class=${encodeURIComponent(cls)}` : ''
    fetch(`/api/game/leaderboard${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (alive) setData(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [cls])

  const leaders = data?.leaders || []
  const top3 = leaders.filter(l => l.place <= 3).slice(0, 3)
  const rest = leaders.filter(l => !top3.includes(l))
  const me = data?.me
  const ranks = summary?.ranks

  return (
    <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-11 h-11 rounded-2xl bg-[#ffc93c] flex items-center justify-center">
          <Trophy size={22} className="text-[#1f2a5c]" />
        </div>
        <h1 className="text-[30px] sm:text-[36px] font-extrabold tracking-tight text-[var(--color-text-primary)]">Лидеры</h1>
      </div>
      <p className="text-[14px] text-[var(--color-text-secondary)] mb-6">
        Кто больше всех читает прямо сейчас. Считаются все заработанные монеты — покупки место не понижают.
      </p>

      {/* Моё место */}
      {ranks && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <MyPlace icon={School} label="Моё место в школе" place={ranks.school_rank} total={ranks.school_total} />
          <MyPlace icon={Users} label={`В классе ${ranks.class_name || '—'}`} place={ranks.class_rank} total={ranks.class_total} />
        </div>
      )}

      {/* Переключатель */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        <Chip active={!cls} onClick={() => setCls('')}>🏫 Вся школа</Chip>
        {(data?.classes || []).map(c => (
          <Chip key={c} active={cls === c} onClick={() => setCls(c)}>{c} класс</Chip>
        ))}
      </div>

      {loading && !data ? (
        <div className="h-64 rounded-3xl bg-[var(--color-bg-soft)] animate-pulse" />
      ) : leaders.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-[var(--color-border)]">
          <div className="text-[44px] mb-2">📚</div>
          <div className="font-semibold text-[var(--color-text-primary)]">Пока никто не заработал монет</div>
          <div className="text-[13px] text-[var(--color-text-tertiary)] mt-1">Прочитай книгу, напиши отзыв — и стань первым!</div>
        </div>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {/* Пьедестал */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mb-6">
            {PODIUM.map(p => {
              const l = top3.find(x => x.place === p.place) || (p.place === 1 ? top3[0] : null)
              if (!l) return <div key={p.place} />
              return (
                <motion.div
                  key={`${cls}-${p.place}`}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: p.place === 1 ? 0.25 : p.place === 2 ? 0.1 : 0.4, type: 'spring', stiffness: 200, damping: 18 }}
                  className="flex flex-col items-center text-center"
                >
                  {p.place === 1 && <Crown size={26} className="text-[#ffc93c] mb-1 coin-float" fill="#ffc93c" />}
                  <Avatar name={l.name} size={p.place === 1 ? 64 : 52} ring={p.color} highlight={l.id === me} />
                  <div className="mt-2 text-[13px] sm:text-[14px] font-bold text-[var(--color-text-primary)] line-clamp-1 max-w-full">{l.name}</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">{l.class_name ? `${l.class_name} кл.` : ''}</div>
                  <div className={`mt-2 w-full ${p.height} rounded-t-2xl flex flex-col items-center justify-start pt-2`} style={{ background: p.color }}>
                    <div className="text-[22px] leading-none">{p.medal}</div>
                    <div className="text-[18px] sm:text-[22px] font-extrabold text-[#1f2a5c] mt-1">{l.earned}</div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Остальные */}
          <div className="space-y-1.5">
            {rest.map(l => {
              const lvl = levelFor(l.earned)
              const mine = l.id === me
              return (
                <div
                  key={l.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border ${
                    mine
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/8'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
                  }`}
                >
                  <div className="w-8 text-center text-[15px] font-bold text-[var(--color-text-tertiary)]">{l.place}</div>
                  <Avatar name={l.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[14px] text-[var(--color-text-primary)] truncate">
                      {l.name} {mine && <span className="text-[var(--color-brand)]">(ты)</span>}
                    </div>
                    <div className="text-[12px] text-[var(--color-text-tertiary)] flex items-center gap-2">
                      {l.class_name && <span>{l.class_name} кл.</span>}
                      <span className="flex items-center gap-1"><BookOpen size={11} /> {l.books}</span>
                      <span>{lvl.emoji} {lvl.title}</span>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-[#ffc93c]/25 text-[#8a5a00] dark:text-[#ffc93c] text-[14px] font-extrabold">
                    {l.earned}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}

function MyPlace({ icon: Icon, label, place, total }) {
  return (
    <div className="rounded-2xl p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)]">
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)] font-medium">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-1 text-[28px] font-extrabold text-[var(--color-text-primary)] leading-none">
        #{place || '—'}
        <span className="text-[13px] font-medium text-[var(--color-text-tertiary)]"> из {total || 0}</span>
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'bg-[#1f2a5c] text-white dark:bg-[var(--color-brand)]'
          : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
      }`}
    >
      {children}
    </button>
  )
}

const AVATAR_COLORS = ['#2f5bea', '#ff6b6b', '#20b486', '#ff9f1c', '#8b5cf6', '#0ea5e9', '#e0457b']

function Avatar({ name = '?', size = 40, ring, highlight }) {
  const color = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: size, height: size, background: color, fontSize: size * 0.4,
        boxShadow: ring ? `0 0 0 3px ${ring}` : highlight ? '0 0 0 3px var(--color-brand)' : 'none'
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
