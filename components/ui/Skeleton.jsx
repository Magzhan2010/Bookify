'use client'

/**
 * Skeleton — заглушка загрузки.
 * Сетка SkeletonGrid использует ту же сетку, что и каталог
 * (GRID в lib/ui.js), чтобы не было скачка макета при загрузке.
 */

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-[var(--color-bg-soft)] rounded-[var(--radius-md)] animate-pulse ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div aria-hidden="true">
      <Skeleton className="w-full aspect-[2/3] rounded-[var(--radius-lg)] mb-2" />
      <Skeleton className="h-3 w-4/5 rounded-[var(--radius-xs)] mb-1.5" />
      <Skeleton className="h-2.5 w-1/2 rounded-[var(--radius-xs)]" />
    </div>
  )
}

export function SkeletonGrid({ count = 12 }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5"
      aria-busy="true"
      aria-label="Загрузка"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 5, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-busy="true" aria-label="Загрузка">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-[var(--radius-md)]" />
      ))}
    </div>
  )
}