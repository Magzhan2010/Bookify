'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  RefreshCw, Check, AlertCircle, Database, ExternalLink, FileSpreadsheet,
  Upload, RotateCw, Trash2
} from 'lucide-react'

export default function SyncPage() {
  const [status, setStatus] = useState(null) // null | 'checking' | 'connected' | 'error'
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [mode, setMode] = useState('append')
  const [dbStats, setDbStats] = useState(null)

  const checkConnection = async () => {
    setStatus('checking')
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/sync-sheets', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('connected')
        setPreview(data)
      } else {
        setStatus('error')
        setError(data.error)
      }
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  const fetchDbStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/books?countOnly=true', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setDbStats(data)
    } catch (err) { /* ignore */ }
  }

  useEffect(() => {
    checkConnection()
    fetchDbStats()
  }, [])

  const handleSync = async () => {
    if (mode === 'replace' && !confirm('⚠️ РЕЖИМ ЗАМЕНЫ: удалит все книги из БД и зальёт заново. Продолжить?')) {
      return
    }

    setSyncing(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/sync-sheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mode })
      })
      const data = await res.json()
      if (data.success) {
        setLastResult(data)
        toast.success(`Синхронизировано: +${data.added}, ↻${data.updated}`)
        fetchDbStats()
      } else {
        toast.error(data.error)
      }
    } catch (err) {
      toast.error('Ошибка синхронизации')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
          Импорт из <span className="text-gradient-gold">Google Sheets</span>
        </h1>
        <p className="text-[#94a3b8]">Одна кнопка — и все 250+ книг окажутся в базе</p>
      </div>

      {/* Connection status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#11141f] border border-white/5 rounded-2xl p-6 mb-6"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display font-bold text-xl mb-1">Статус подключения</h2>
            <p className="text-sm text-[#5a6383]">Google Sheets API</p>
          </div>
          <button
            onClick={checkConnection}
            disabled={status === 'checking'}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50"
          >
            <RotateCw size={16} className={status === 'checking' ? 'animate-spin' : ''} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {status === 'checking' && (
            <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 text-[#94a3b8]">
              <div className="w-4 h-4 border-2 border-[#e8b94e]/30 border-t-[#e8b94e] rounded-full animate-spin" />
              Проверяю подключение...
            </motion.div>
          )}
          {status === 'connected' && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-[#4ecdc4]/10 border border-[#4ecdc4]/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <Check className="text-[#4ecdc4]" size={20} />
                <span className="font-bold text-[#4ecdc4]">Подключение установлено!</span>
              </div>
              <p className="text-sm text-[#94a3b8]">
                В таблице найдено <strong className="text-white">{preview?.rows}</strong> книг.
              </p>
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-[#ff5d8f]/10 border border-[#ff5d8f]/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="text-[#ff5d8f]" size={20} />
                <span className="font-bold text-[#ff5d8f]">Не удалось подключиться</span>
              </div>
              <p className="text-sm text-[#94a3b8] mb-2">{error}</p>
              <div className="text-xs text-[#5a6383] font-mono bg-black/30 p-3 rounded-lg mt-2">
                Проверь переменные окружения:<br />
                • GOOGLE_SHEETS_ID<br />
                • GOOGLE_SERVICE_ACCOUNT_EMAIL<br />
                • GOOGLE_PRIVATE_KEY
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {preview?.preview && (
          <div className="mt-4">
            <p className="text-xs text-[#5a6383] mb-2">Превью первых книг из Sheets:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {preview.preview.map((b, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white/5 text-sm">
                  <div className="font-bold truncate">{b.title}</div>
                  <div className="text-xs text-[#5a6383]">{b.author} · {b.genre} · {b.year}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Sync settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#11141f] border border-white/5 rounded-2xl p-6 mb-6"
      >
        <h2 className="font-display font-bold text-xl mb-1">Запустить синхронизацию</h2>
        <p className="text-sm text-[#5a6383] mb-5">Выбери режим и нажми кнопку</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setMode('append')}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === 'append'
                ? 'bg-[#e8b94e]/10 border-[#e8b94e]/30'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Upload size={16} className="text-[#e8b94e]" />
              <span className="font-bold">Дополнить (безопасно)</span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Добавит новые книги + обновит существующие. Ничего не удалит.
            </p>
          </button>

          <button
            onClick={() => setMode('replace')}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === 'replace'
                ? 'bg-[#ff5d8f]/10 border-[#ff5d8f]/30'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Trash2 size={16} className="text-[#ff5d8f]" />
              <span className="font-bold">Полная замена (опасно)</span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Удалит ВСЕ книги из БД и зальёт заново из таблицы.
            </p>
          </button>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing || status !== 'connected'}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#e8b94e] to-[#c89538] text-[#06070d] font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-[#e8b94e]/30 transition-all"
        >
          {syncing ? (
            <>
              <div className="w-5 h-5 border-2 border-[#06070d]/30 border-t-[#06070d] rounded-full animate-spin" />
              Синхронизирую...
            </>
          ) : (
            <><RefreshCw size={20} /> Синхронизировать</>
          )}
        </button>

        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 rounded-xl bg-[#4ecdc4]/10 border border-[#4ecdc4]/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Check className="text-[#4ecdc4]" size={18} />
              <span className="font-bold text-[#4ecdc4]">Синхронизация завершена!</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Из таблицы" value={lastResult.from_sheet} />
              <Stat label="Добавлено" value={lastResult.added} color="#4ecdc4" />
              <Stat label="Обновлено" value={lastResult.updated} color="#e8b94e" />
            </div>
            {lastResult.errors?.length > 0 && (
              <p className="text-xs text-[#ff5d8f] mt-2">
                ⚠️ Ошибок: {lastResult.errors.length}
              </p>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Structure reference */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#11141f] border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="text-[#4ecdc4]" size={20} />
          <h2 className="font-display font-bold text-xl">Структура таблицы</h2>
        </div>
        <p className="text-sm text-[#5a6383] mb-4">
          В Google Sheets расположи данные в таком порядке (заголовки в строке 1, данные со строки 2):
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-[#5a6383] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 border-b border-white/10">A</th>
                <th className="text-left px-3 py-2 border-b border-white/10">B</th>
                <th className="text-left px-3 py-2 border-b border-white/10">C</th>
                <th className="text-left px-3 py-2 border-b border-white/10">D</th>
                <th className="text-left px-3 py-2 border-b border-white/10">E</th>
                <th className="text-left px-3 py-2 border-b border-white/10">F</th>
                <th className="text-left px-3 py-2 border-b border-white/10">G</th>
                <th className="text-left px-3 py-2 border-b border-white/10">H</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <tr className="bg-white/5">
                <td colSpan="8" className="px-3 py-1 text-center text-[#5a6383]">↑ данные ↓</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="px-3 py-2 font-mono">title</td>
                <td className="px-3 py-2 font-mono">author</td>
                <td className="px-3 py-2 font-mono">genre</td>
                <td className="px-3 py-2 font-mono">year</td>
                <td className="px-3 py-2 font-mono">description</td>
                <td className="px-3 py-2 font-mono">cover_url</td>
                <td className="px-3 py-2 font-mono">file_url</td>
                <td className="px-3 py-2 font-mono">total_copies</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="px-3 py-2 text-[#94a3b8]">Мастер и Маргарита</td>
                <td className="px-3 py-2 text-[#94a3b8]">Булгаков</td>
                <td className="px-3 py-2 text-[#94a3b8]">Классика</td>
                <td className="px-3 py-2 text-[#94a3b8]">1967</td>
                <td className="px-3 py-2 text-[#94a3b8]">Философский роман...</td>
                <td className="px-3 py-2 text-[#94a3b8]">https://...</td>
                <td className="px-3 py-2 text-[#94a3b8]">https://...</td>
                <td className="px-3 py-2 text-[#94a3b8]">2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

const Stat = ({ label, value, color = '#94a3b8' }) => (
  <div>
    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-[#5a6383]">{label}</div>
  </div>
)