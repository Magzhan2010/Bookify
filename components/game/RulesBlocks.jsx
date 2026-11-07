import { BookOpen, Star, MessageSquare, Video, Mic, Ban } from 'lucide-react'
import CoinCard from './CoinCard'
import { PAGE_TIERS, BONUSES, PRIZES_PREVIEW, PRIZE_TINTS, LEVELS } from '../../lib/points'

/**
 * Блоки с правилами программы. Используются на странице «Как это работает»
 * и на лендинге — правила берутся из lib/points.js, поэтому совпадают везде.
 */

export function PagesTable() {
  return (
    <div className="rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 sm:p-6">
      <h3 className="flex items-center gap-2.5 text-[17px] font-bold text-[var(--color-text-primary)] mb-4">
        <BookOpen size={20} className="text-[var(--color-brand)]" /> За прочитанные страницы
      </h3>
      <div className="space-y-2.5">
        {PAGE_TIERS.map(t => (
          <div key={t.code} className="flex items-center justify-between gap-3">
            <span className="text-[15px] text-[var(--color-text-primary)]">{t.label}</span>
            <CoinCard value={t.points} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

const BONUS_ICONS = { review: MessageSquare, video: Video, tedx: Mic }

export function BonusList() {
  return (
    <div className="rounded-3xl bg-[#1f2a5c] text-white p-5 sm:p-6">
      <h3 className="flex items-center gap-2.5 text-[17px] font-bold mb-4">
        <Star size={20} className="text-[#ffc93c]" fill="#ffc93c" /> Бонусы
      </h3>
      <div className="space-y-3">
        {Object.values(BONUSES).map(b => {
          const Icon = BONUS_ICONS[b.code]
          return (
            <div key={b.code} className="flex items-center gap-3">
              <Icon size={20} className="shrink-0 text-white/80" />
              <span className="flex-1 text-[15px]">
                {b.code === 'tedx'
                  ? <>Выступил на <span className="px-1.5 py-0.5 rounded bg-[#e62b1e] font-extrabold">TEDx</span></>
                  : b.title}
              </span>
              <span className="px-3 py-1 rounded-full bg-[#ffc93c] text-[#1f2a5c] text-[15px] font-extrabold">
                +{b.points}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-5 text-[12px] text-white/60 leading-relaxed">
        Баллы за книгу и отзыв начисляет библиотекарь, когда примет твой отзыв.
        Видео и TEDx — по договорённости с библиотекарем.
      </p>
    </div>
  )
}

export function PrizesPreview({ compact = false }) {
  return (
    <div className={`grid gap-3 sm:gap-4 ${compact ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {PRIZES_PREVIEW.map((p, i) => (
        <div
          key={p.code}
          className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 sm:p-4 flex flex-col items-center text-center"
        >
          <div className="w-full rounded-2xl aspect-square flex items-center justify-center mb-3" style={{ background: PRIZE_TINTS[p.code] }}>
            <img src={p.image} alt={p.title} className="w-[78%] h-[78%]" loading="lazy" />
          </div>
          {!compact && (
            <div className="text-[11px] font-bold text-[var(--color-text-tertiary)] mb-0.5">0{i + 1}</div>
          )}
          <div className="text-[13px] sm:text-[14px] font-semibold text-[var(--color-text-primary)] leading-tight min-h-[2.4em] flex items-center">
            {p.title}
          </div>
          <div className="mt-2 px-3 py-1 rounded-full bg-[#ffc93c] text-[#1f2a5c] text-[13px] font-extrabold">
            {p.price} баллов
          </div>
        </div>
      ))}
    </div>
  )
}

export function LevelsList({ current }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {LEVELS.map((l, i) => {
        const reached = current != null && current >= l.min
        return (
          <div
            key={l.title}
            className={`rounded-2xl p-3 text-center border ${
              reached
                ? 'border-[var(--color-brand)]/40 bg-[var(--color-brand)]/8'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
            }`}
          >
            <div className="text-[28px] leading-none mb-1">{l.emoji}</div>
            <div className="text-[13px] font-bold text-[var(--color-text-primary)]">{l.title}</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)]">
              {i === 0 ? 'старт' : `от ${l.min} баллов`}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AiWarning() {
  return (
    <div className="rounded-3xl bg-[#1f2a5c] text-white p-5 sm:p-6 flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-[#ffc93c] flex items-center justify-center shrink-0">
        <Ban size={28} className="text-[#1f2a5c]" />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md bg-[#ffc93c] text-[#1f2a5c] text-[12px] font-extrabold tracking-widest">ВАЖНО</span>
          <span className="text-[17px] font-bold">Только свои мысли!</span>
        </div>
        <p className="text-[14px] text-white/80">Если отзыв списан с ИИ, баллы не засчитываются.</p>
      </div>
    </div>
  )
}
