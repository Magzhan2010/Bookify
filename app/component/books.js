'use client'

import { useRouter } from "next/navigation"
import { motion } from 'framer-motion' 

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05 
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 }, 
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } 
}

const Books = ({ books,myFinishedId = [], myReadingId =[] }) => {
    const router = useRouter()

     return (
        <motion.div 
            key={books.map(b => b.id).join(',')} 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-15"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {books.length === 0 && (
                <motion.div variants={cardVariants} className="col-span-full">
                    <p className="text-[#4a6080] mt-20 text-lg text-center">Книги не найдены</p>
                </motion.div>
            )}
            
            {books.map(book => {
                const isFinished = myFinishedId.includes(Number(book.id))
                const isReading = myReadingId.includes(Number(book.id))

                return (
                    <motion.div 
                        key={book.id} 
                        variants={cardVariants}
                        whileHover={{ y: -6, transition: { duration: 0.2 } }}
                        className="bg-[#0d1a2e] rounded-2xl overflow-hidden cursor-pointer border border-[#162236] hover:border-[#1a56db] hover:shadow-lg hover:shadow-blue-500/5 relative" 
                        onClick={() => router.push(`/books/${book.id}`)}
                    >
                        <div className="absolute bottom-3 right-4 z-10">
                            {isFinished && (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/90 text-white shadow-lg backdrop-blur-sm">
                                    Прочитано
                                </span>
                            )}
                            {isReading && !isFinished && (
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/90 text-white shadow-lg backdrop-blur-sm">
                                    Читаю
                                </span>
                            )}
                        </div>

                        <div className="w-full h-95 overflow-hidden">
                            <img 
                                src={book.cover_url} 
                                alt={book.title}
                                className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="flex flex-col gap-1 p-4">
                            <h1 className="text-xl font-semibold truncate text-white">{book.title}</h1>
                            <h3 className="text-sm text-[#4a6080]">{book.author}</h3>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-sm text-[#1a56db] font-medium">{book.genre}</p>
                                <p className="text-xs text-[#4a6080]">{book.year}</p>
                            </div>
                        </div>
                    </motion.div>
                )
            })}
        </motion.div>
    )
}

export default Books