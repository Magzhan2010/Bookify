'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { useT } from '../lib/i18n'

/** «Советует учитель»: книги, которые учителя посоветовали моему классу (или всей школе). */
export default function TeacherPicks() {
  const [items, setItems] = useState([])
  const { t } = useT()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch('/api/recommendations', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : []))
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  if (!items.length) return null

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[18px]">💡</span>
        <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">{t('Советует учитель')}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {items.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="snap-start shrink-0 w-[260px]">
            <Link href={`/books/${r.book_id}`} className="flex gap-3 p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-brand)]/40 transition-colors h-full">
              <div className="w-16 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-[var(--color-bg-soft)] flex items-center justify-center">
                {r.cover_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.cover_url} alt="" className="w-full h-full object-cover" />
                  : <BookOpen size={18} className="text-[var(--color-text-tertiary)]" />}
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold leading-tight line-clamp-2 text-[var(--color-text-primary)]">{r.title}</div>
                <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">{r.author}</div>
                {r.note && <div className="text-[12px] text-[var(--color-text-secondary)] mt-1.5 line-clamp-2">«{r.note}»</div>}
                <div className="text-[11px] text-[#8e4ec6] font-semibold mt-1.5 truncate">— {r.teacher_name}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
