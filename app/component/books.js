'use client'

import { useRouter } from "next/navigation"
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } }
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
            whileHover={{ y: -4, transition: { duration: 0.18 } }}
            whileTap={{ scale: 0.98 }}
            className="group bg-white border border-black/8 rounded-2xl overflow-hidden cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-black/12 transition-all"
            onClick={() => router.push(`/books/${book.id}`)}
          >
            <div className="absolute z-10 top-2 left-2 flex flex-col items-start gap-1">
              {isFinished && (
                <span className="px-2 py-0.5 rounded-full bg-[#34c759]/90 backdrop-blur-sm text-white text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle size={10} /> Прочитано
                </span>
              )}
              {isReading && (
                <span className="px-2 py-0.5 rounded-full bg-[#1a56db]/90 backdrop-blur-sm text-white text-[10px] font-semibold flex items-center gap-1">
                  <BookOpen size={10} /> Читаю
                </span>
              )}
              {unavailable && !isReading && (
                <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-sm text-white text-[10px] font-semibold">
                  На руках
                </span>
              )}
            </div>

            <div className="relative aspect-[2/3] bg-[#f5f5f7] overflow-hidden">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={32} className="text-[#86868b]" />
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4">
              <h3 className="font-semibold text-[14px] sm:text-[15px] leading-tight line-clamp-2 mb-1 group-hover:text-[#1a56db] transition-colors text-[#1d1d1f]">
                {book.title}
              </h3>
              <p className="text-[12px] text-[#86868b] line-clamp-1 mb-2">{book.author}</p>

              {book.genre && (
                <span className="inline-block px-2 py-0.5 rounded-md bg-[#f5f5f7] text-[10px] font-medium text-[#1a56db]">
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