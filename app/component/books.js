'use client'

import { useRouter } from "next/navigation"
import { motion } from 'framer-motion'
import { CheckCircle, BookOpen } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] }
  }
}

// === УРОВЕНЬ СЛОЖНОСТИ ===
// Лёгкий → зелёный, Средний → жёлтый, Сложный → красный
function parseDifficulty(tags) {
  if (!tags) return null
  const lower = tags.toLowerCase()
  if (lower.includes('сложный')) return { level: 'Сложный', color: '#ff3b30', bg: '#ff3b3015', emoji: '🔥' }
  if (lower.includes('средний')) return { level: 'Средний', color: '#ff9500', bg: '#ff950015', emoji: '⚡' }
  if (lower.includes('лёгк')) return { level: 'Лёгкий', color: '#34c759', bg: '#34c75915', emoji: '🌱' }
  return null
}

const Books = ({ books, myFinishedId = [], myReadingId = [] }) => {
  const router = useRouter()

  if (!books || books.length === 0) return null

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {books.map(book => {
        const isFinished = myFinishedId.includes(Number(book.id))
        const isReading = myReadingId.includes(Number(book.id))
        const unavailable = book.available_copies !== undefined && book.available_copies <= 0 && !isReading
        const difficulty = parseDifficulty(book.tags)

        return (
          <motion.div
            key={book.id}
            variants={cardVariants}
            whileHover={{
              y: -8,
              scale: 1.03,
              transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] }
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(`/books/${book.id}`)}
            className="group relative bg-[var(--color-bg-card)] rounded-2xl overflow-hidden cursor-pointer border border-[var(--color-border)] hover:border-[var(--color-brand)]/50 hover:shadow-[0_12px_40px_rgba(26,86,219,0.15)] transition-all duration-300"
          >
            {/* Status badge (top-left) */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
              {isFinished && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md shadow-sm"
                  style={{ background: '#34c759', color: 'white' }}
                >
                  <CheckCircle size={11} /> Прочитано
                </motion.span>
              )}
              {isReading && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md shadow-sm"
                  style={{ background: '#1a56db', color: 'white' }}
                >
                  <BookOpen size={11} /> Читаю
                </motion.span>
              )}
              {unavailable && !isReading && (
                <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[11px] font-semibold">
                  На руках
                </span>
              )}
            </div>

            {/* Difficulty badge (top-right) */}
            {difficulty && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[11px] font-bold backdrop-blur-md shadow-sm flex items-center gap-1"
                style={{ background: difficulty.bg, color: difficulty.color, border: `1px solid ${difficulty.color}40` }}
                title={`Уровень: ${difficulty.level}`}
              >
                <span>{difficulty.emoji}</span>
                <span>{difficulty.level}</span>
              </motion.div>
            )}

            {/* Cover */}
            <div className="relative aspect-[2/3] bg-[var(--color-bg-soft)] overflow-hidden">
              {book.cover_url ? (
                <>
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-brand-soft)] to-[var(--color-bg-soft)]">
                  <BookOpen size={32} className="text-[var(--color-text-tertiary)]" />
                </div>
              )}

              {/* Animated glow ring on hover */}
              <div className="absolute inset-0 ring-0 group-hover:ring-4 ring-inset transition-all duration-300 pointer-events-none rounded-t-2xl"
                   style={{ boxShadow: 'inset 0 0 0 0px rgba(26,86,219,0)' }}
              />
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              <h3 className="font-semibold text-[14px] sm:text-[15px] leading-tight line-clamp-2 mb-1 group-hover:text-[var(--color-brand)] transition-colors text-[var(--color-text-primary)]">
                {book.title}
              </h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] line-clamp-1 mb-2">{book.author}</p>

              {book.genre && (
                <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--color-bg-soft)] text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  {book.genre.split(' / ')[0]}
                </span>
              )}
            </div>

            {/* Bottom shine effect */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-brand)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </motion.div>
        )
      })}
    </motion.div>
  )
}

export default Books