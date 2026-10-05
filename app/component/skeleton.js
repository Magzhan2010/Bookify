const SkeletonGrid = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="aspect-[2/3] bg-[var(--color-bg-soft)] animate-pulse" />
        <div className="p-4 space-y-2">
          <div className="bg-[var(--color-bg-soft)] h-4 w-3/4 rounded animate-pulse" />
          <div className="bg-[var(--color-bg-soft)] h-3 w-1/2 rounded animate-pulse" />
          <div className="bg-[var(--color-bg-soft)] h-4 w-14 rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
)

export default SkeletonGrid