'use client'

import { useRouter } from "next/navigation"
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle, Bookmark, Plus } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
}

const Books = ({ books, myFinishedId = [], myReadingId = [] }) => {
  const router = useRouter()

  if (!books || books.length === 0) return null

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {books.map(book => {
        const isFinished = myFinishedId.includes(Number(book.id))
        const isReading = myReadingId.includes(Number(book.id))
        const unavailable = book.available_copies !== undefined && book.available_copies <= 0

        return (
          <motion.div
            key={book.id}
            layout
            variants={cardVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-[#11141f] rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#e8b94e]/30 transition-all"
            onClick={() => router.push(`/books/${book.id}`)}
          >
            {/* Status badge */}
            {(isFinished || isReading) && (
              <div className={`absolute top-2 left-2 z-10 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm ${
                isFinished
                  ? 'bg-[#60a5fa]/90 text-white'
                  : 'bg-[#4ecdc4]/90 text-[#06070d]'
              }`}>
                {isFinished ? <><CheckCircle size={10} /> Прочитано</> : <><BookOpen size={10} /> Читаю</>}
              </div>
            )}

            {/* Unavailable */}
            {unavailable && !isReading && (
              <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-black/80 backdrop-blur-sm text-[10px] text-white font-bold">
                На руках
              </div>
            )}

            {/* Cover */}
            <div className="relative aspect-[2/3] bg-gradient-to-br from-[#1a1f30] to-[#0a0c17] overflow-hidden">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={32} className="text-[#5a6383]" />
                </div>
              )}
              {/* Bottom shadow gradient for legibility */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-2 mb-1 group-hover:text-[#e8b94e] transition-colors">
                {book.title}
              </h3>
              <p className="text-xs text-[#94a3b8] line-clamp-1 mb-2">{book.author}</p>

              {book.genre && (
                <span className="inline-block px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-[#e8b94e] uppercase tracking-wider">
                  {book.genre}
                </span>
              )}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

export default Books