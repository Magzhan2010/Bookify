'use client'

import { PAGE_COEFS, coefForWords, scoredPages, tierForBook } from '../lib/points'

/**
 * Страницы, слова на странице и коэффициент страницы.
 * value: { pages, words_per_page, page_coef } — строки/числа; onChange(patch).
 * Коэффициент подставляется сам по числу слов, но его можно выбрать вручную.
 */
export default function PageCoefFields({ value, onChange, compact = false }) {
  const pages = parseInt(value.pages) || 0
  const auto = coefForWords(value.words_per_page)
  const coef = value.page_coef !== '' && value.page_coef != null ? Number(value.page_coef) : auto
  const scored = scoredPages(pages, coef)
  const tier = tierForBook(pages, coef)
  const input = 'w-full bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors tabular-nums'
  const label = 'block text-[13px] text-[var(--color-text-primary)] font-medium mb-1.5'

  return (
    <div className={`rounded-2xl border border-[var(--color-border)] ${compact ? 'p-3.5' : 'p-4 sm:p-5'} space-y-3`}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Страниц в книге</label>
          <input inputMode="numeric" placeholder="320" value={value.pages ?? ''}
            onChange={e => onChange({ pages: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={input} />
        </div>
        <div>
          <label className={label}>Слов на 1 странице</label>
          <input inputMode="numeric" placeholder="250" value={value.words_per_page ?? ''}
            onChange={e => onChange({ words_per_page: e.target.value.replace(/\D/g, '').slice(0, 4), page_coef: '' })} className={input} />
        </div>
      </div>

      <div>
        <div className={label}>Коэффициент страницы</div>
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[var(--color-bg-soft)]">
          {PAGE_COEFS.map(c => {
            const on = coef === c.value
            return (
              <button key={c.value} type="button" title={c.hint}
                onClick={() => onChange({ page_coef: on && value.page_coef !== '' ? '' : c.value })}
                className={`py-2 rounded-lg text-[13px] font-semibold tabular-nums transition-all ${
                  on ? 'bg-[var(--color-bg-card)] text-[var(--color-brand)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
                × {c.label}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">
          {PAGE_COEFS.map(c => `${c.label} — ${c.hint}`).join(' · ')}.
          {auto && (value.page_coef === '' || value.page_coef == null) ? ' Выбран сам по числу слов.' : ''}
        </p>
      </div>

      {pages > 0 && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--color-brand-soft)] text-[13px]">
          <span className="text-[var(--color-text-secondary)]">
            Засчитано: <b className="text-[var(--color-text-primary)] tabular-nums">{scored} стр.</b>
            {coef && coef !== 1 ? <span className="text-[var(--color-text-tertiary)]"> ({pages} × {coef})</span> : null}
          </span>
          <span className="font-semibold text-[var(--color-brand)] whitespace-nowrap">
            {tier ? `+${tier.points} монет` : 'меньше 100 — 0 монет'}
          </span>
        </div>
      )}
    </div>
  )
}
