'use client'

/**
 * Нарисованные значки достижений (вместо эмодзи).
 * Цвет у каждого свой; закрытое достижение — серое, без свечения.
 * Работает в светлой и тёмной теме.
 */

const COLORS = {
  first_book: '#22a55b',
  three_month: '#2f6fed',
  big_book: '#8b5cf6',
  reviewer_5: '#5b5bd6',
  books_10: '#0f9f8f',
  streak_4: '#f26b1d',
  speaker: '#0e9ad7',
  creator: '#e8930c',
  first_prize: '#e5407a'
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

/** Маленькая искра над значком */
const Spark = ({ x, y, r = 2 }) => (
  <path d={`M${x} ${y - r}v${r * 2}M${x - r} ${y}h${r * 2}`} {...S} strokeWidth={1.5} />
)

const ICONS = {
  // открытая книга
  first_book: (
    <>
      <Spark x={12} y={3.2} />
      <path d="M3 8.5c2.6-.9 5.6-.7 9 1 3.4-1.7 6.4-1.9 9-1v10c-2.6-.9-5.6-.7-9 1-3.4-1.7-6.4-1.9-9-1z" {...S} />
      <path d="M12 9.5v10" {...S} />
      <path d="M5.6 11.6c1.4-.2 2.7 0 3.9.5M5.6 14.4c1.4-.2 2.7 0 3.9.5M14.5 12.1c1.2-.5 2.5-.7 3.9-.5M14.5 14.9c1.2-.5 2.5-.7 3.9-.5" {...S} strokeWidth={1.3} />
    </>
  ),
  // календарь с клетками
  three_month: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" {...S} />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" {...S} />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" {...S} strokeWidth={2} />
    </>
  ),
  // толстая книга 500+
  big_book: (
    <>
      <path d="M6.5 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" {...S} />
      <path d="M8 3.5v17" {...S} />
      <text x="13.2" y="12.6" textAnchor="middle" fontSize="4.6" fontWeight="800" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">500+</text>
      <path d="M10.5 15.5h5.4" {...S} strokeWidth={1.3} />
    </>
  ),
  // облачко со звездой
  reviewer_5: (
    <>
      <path d="M5.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17.5h-1A2.5 2.5 0 0 1 3 15V7a2.5 2.5 0 0 1 2.5-2.5z" {...S} />
      <path d="M12 7.6l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="currentColor" stroke="none" />
    </>
  ),
  // лавровый венок и 10
  books_10: (
    <>
      <path d="M8 19.5c-3.3-1.3-5-4.4-4.6-8.2.2-2 .9-3.6 2-4.8" {...S} />
      <path d="M16 19.5c3.3-1.3 5-4.4 4.6-8.2-.2-2-.9-3.6-2-4.8" {...S} />
      <path d="M4.2 14.3c1.3.1 2.2.7 2.7 1.7M3.5 10.6c1.2.4 2 1.2 2.3 2.3M5 7.3c1 .6 1.5 1.5 1.6 2.6M19.8 14.3c-1.3.1-2.2.7-2.7 1.7M20.5 10.6c-1.2.4-2 1.2-2.3 2.3M19 7.3c-1 .6-1.5 1.5-1.6 2.6" {...S} strokeWidth={1.4} />
      <text x="12" y="15" textAnchor="middle" fontSize="7.4" fontWeight="800" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">10</text>
    </>
  ),
  // огонь и 4 точки
  streak_4: (
    <>
      <path d="M12 2.8c.4 2.6 3.8 4.2 3.8 8.1a3.8 3.8 0 0 1-7.6 0c0-1.6.8-2.7 1.6-3.5.2 1.3.9 2.1 1.8 2.3-.4-2.6-.1-4.9.4-6.9z" fill="currentColor" stroke="none" opacity=".95" />
      <path d="M12 9.2c.9 1.1 1.9 1.9 1.9 3.3a1.9 1.9 0 0 1-3.8 0c0-.7.3-1.3.8-1.7" fill="#fff" fillOpacity=".55" stroke="none" />
      {[7.5, 10.5, 13.5, 16.5].map(x => <circle key={x} cx={x} cy="19.6" r="1.1" fill="currentColor" stroke="none" />)}
    </>
  ),
  // микрофон с волнами
  speaker: (
    <>
      <rect x="9.3" y="3" width="5.4" height="10" rx="2.7" {...S} />
      <path d="M11.2 6.4h1.6M11.2 9h1.6" {...S} strokeWidth={1.3} />
      <path d="M6.6 10.6a5.4 5.4 0 0 0 10.8 0M12 16v4.5M9 20.5h6" {...S} />
      <path d="M4.4 6.6c-.8 1.2-.8 3 0 4.2M19.6 6.6c.8 1.2.8 3 0 4.2" {...S} strokeWidth={1.4} />
    </>
  ),
  // телефон с кнопкой play
  creator: (
    <>
      <rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6" {...S} />
      <path d="M10.6 5.3h2.8" {...S} strokeWidth={1.4} />
      <path d="M10.4 9.6v5.2l4.4-2.6z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.4" r=".9" fill="currentColor" stroke="none" />
      <Spark x={20.2} y={4.4} r={1.6} />
    </>
  ),
  // подарок
  first_prize: (
    <>
      <rect x="3.8" y="9" width="16.4" height="4" rx="1.2" {...S} />
      <path d="M5.3 13v6.2a1.3 1.3 0 0 0 1.3 1.3h10.8a1.3 1.3 0 0 0 1.3-1.3V13M12 9v11.5" {...S} />
      <path d="M12 9c-1-2.8-4.6-4-5.4-2-.6 1.6 1.5 2 5.4 2zM12 9c1-2.8 4.6-4 5.4-2 .6 1.6-1.5 2-5.4 2z" {...S} />
      <Spark x={20.4} y={4} r={1.5} />
    </>
  )
}

export function achievementColor(code) {
  return COLORS[code] || '#2f6fed'
}

/**
 * size — сторона плитки в px (по умолчанию 64, как на макете).
 */
export default function AchievementBadge({ code, earned = true, size = 64, className = '' }) {
  const color = achievementColor(code)
  const icon = ICONS[code] || ICONS.first_book
  const radius = Math.round(size * 0.3)
  const iconSize = Math.round(size * 0.46)

  if (!earned) {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 border border-black/[0.06] dark:border-white/[0.08] bg-[#f4f4f6] dark:bg-white/[0.04] text-[#b9b9c0] dark:text-[#5c5c63] ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
        aria-hidden
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24">{icon}</svg>
      </div>
    )
  }

  return (
    <div
      className={`ach-badge relative flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        color,
        '--ach': color
      }}
      aria-hidden
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" className="relative">{icon}</svg>
    </div>
  )
}
