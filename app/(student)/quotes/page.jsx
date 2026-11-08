'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import QuoteFeature, { QuoteCard } from '../../../components/quotes/QuoteFeature'

export default function QuotesPage() {
  const [quotes, setQuotes] = useState(null)
  const [featured, setFeatured] = useState(0)

  useEffect(() => {
    fetch('/api/quotes')
      .then(r => r.json())
      .then(d => setQuotes(Array.isArray(d) ? d : []))
      .catch(() => setQuotes([]))
  }, [])

  // Порядок для большой карточки: выбранная цитата первой
  const ordered = quotes ? [...quotes.slice(featured), ...quotes.slice(0, featured)] : []

  return (
    <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        className="mb-8"
      >
        <div className="text-[13px] font-semibold text-[var(--color-brand)] mb-2">Цитаты</div>
        <h1 className="text-[36px] sm:text-[52px] font-semibold tracking-tight leading-[1.05] text-[var(--color-text-primary)]">
          Мысли, которые<br />стоит запомнить.
        </h1>
      </motion.div>

      {quotes === null ? (
        <div className="h-[420px] rounded-[32px] bg-[var(--color-bg-soft)] animate-pulse" />
      ) : quotes.length === 0 ? (
        <div className="text-center py-24 rounded-[32px] border border-dashed border-[var(--color-border)]">
          <Quote size={32} strokeWidth={1.5} className="mx-auto text-[var(--color-text-tertiary)] mb-3" />
          <div className="text-[17px] font-semibold text-[var(--color-text-primary)]">Цитат пока нет</div>
          <div className="text-[14px] text-[var(--color-text-tertiary)] mt-1">Скоро библиотекарь добавит первые.</div>
        </div>
      ) : (
        <>
          <QuoteFeature key={featured} quotes={ordered} />
          {quotes.length > 1 && (
            <div className="mt-12 columns-1 sm:columns-2 lg:columns-3 gap-5">
              {quotes.map((q, i) => (
                <QuoteCard
                  key={q.id}
                  q={q}
                  i={i}
                  onClick={() => { setFeatured(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
