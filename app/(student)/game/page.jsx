'use client'

import Link from 'next/link'
import { BookOpen, PenLine, BadgeCheck, Coins, Gift, ArrowRight } from 'lucide-react'
import { useGame } from '../../../components/game/GameContext'
import CoinCard from '../../../components/game/CoinCard'
import {
  PagesTable, BonusList, PrizesPreview, LevelsList, AiWarning
} from '../../../components/game/RulesBlocks'

const STEPS = [
  { icon: BookOpen, title: 'Возьми книгу', text: 'Выбери в каталоге и нажми «Хочу забрать». Библиотекарь выдаст книгу.' },
  { icon: PenLine, title: 'Прочитай и сдай', text: 'Верни книгу и напиши отзыв своими словами: о чём она и что ты понял.' },
  { icon: BadgeCheck, title: 'Проверка', text: 'Библиотекарь читает отзыв. Если всё честно — принимает, иначе подскажет, что доработать.' },
  { icon: Coins, title: 'Получи карточки', text: 'Баллы за объём книги и отзыв приходят тебе в виде карточек-монет.' },
  { icon: Gift, title: 'Обменяй на приз', text: 'Копи монеты и меняй их в магазине на закладки, кружки и книги мечты.' }
]

export default function GamePage() {
  const { summary } = useGame()

  return (
    <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
      {/* Заголовок */}
      <section className="rounded-[28px] bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-6 sm:p-10 overflow-hidden relative">
        <h1 className="text-[34px] sm:text-[56px] font-extrabold tracking-tight leading-[0.95] text-[#1f2a5c] dark:text-white">
          READ<span className="text-[var(--color-brand)]">.</span> THINK<span className="text-[var(--color-brand)]">.</span> SPEAK<span className="text-[var(--color-brand)]">.</span>
          <br />
          CREATE<span className="text-[var(--color-brand)]">.</span>{' '}
          <span className="inline-block -rotate-2 px-3 sm:px-4 py-1 rounded-2xl bg-[#1f2a5c] text-[#ffc93c] dark:bg-[#ffc93c] dark:text-[#1f2a5c]">LEAD</span>
        </h1>
        <p className="mt-5 text-[16px] sm:text-[18px] text-[var(--color-text-secondary)] max-w-xl">
          Читай книги — получай баллы и обменивай их на призы. Чем больше читаешь,
          тем выше твой уровень и место среди лидеров.
        </p>
        <div className="hidden md:flex absolute right-8 top-8 flex-col gap-2 rotate-6">
          <CoinCard value={25} size="md" />
          <CoinCard value={10} size="sm" className="-ml-8" />
        </div>
      </section>

      {/* Как это работает */}
      <section>
        <SectionTitle>Как это работает</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-[#1f2a5c] text-white text-[13px] font-bold flex items-center justify-center">{i + 1}</span>
                  <Icon size={18} className="text-[var(--color-brand)]" />
                </div>
                <div className="font-bold text-[15px] text-[var(--color-text-primary)] mb-1">{s.title}</div>
                <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{s.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Система баллов */}
      <section>
        <SectionTitle>Система баллов</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PagesTable />
          <BonusList />
        </div>
      </section>

      {/* Призы */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <SectionTitle className="mb-0">Призы</SectionTitle>
          <Link href="/shop" className="text-[14px] font-semibold text-[var(--color-brand)] flex items-center gap-1 hover:gap-2 transition-all">
            В магазин <ArrowRight size={15} />
          </Link>
        </div>
        <PrizesPreview />
      </section>

      {/* Уровни */}
      <section>
        <SectionTitle>Уровни читателя</SectionTitle>
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-4 -mt-2">
          Уровень растёт от всех заработанных баллов — покупки в магазине его не понижают.
          {summary && <> Сейчас у тебя <b className="text-[var(--color-text-primary)]">{summary.level.emoji} {summary.level.title}</b>.</>}
        </p>
        <LevelsList current={summary?.balance?.earned} />
      </section>

      <AiWarning />
    </main>
  )
}

function SectionTitle({ children, className = 'mb-4' }) {
  return (
    <h2 className={`text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[var(--color-text-primary)] ${className}`}>
      {children}
    </h2>
  )
}
