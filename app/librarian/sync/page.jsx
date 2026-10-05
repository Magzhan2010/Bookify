'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  RefreshCw, Check, AlertCircle, Database, RotateCw,
  Upload, Trash2, FileSpreadsheet
} from 'lucide-react'

export default function SyncPage() {
  const [status, setStatus] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [mode, setMode] = useState('append')

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

  useEffect(() => { checkConnection() }, [])

  const handleSync = async () => {
    if (mode === 'replace' && !confirm('⚠️ РЕЖИМ ЗАМЕНЫ: удалит все книги из БД. Продолжить?')) return

    setSyncing(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/sync-sheets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      const data = await res.json()
      if (data.success) {
        setLastResult(data)
        toast.success(`+${data.added}, ↻${data.updated}`)
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
    <div className="max-w-[1000px] mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-1 text-[#1d1d1f]">
          Импорт из Google Sheets
        </h1>
        <p className="text-[15px] text-[#6e6e73]">Одна кнопка — и все 250+ книг в базе</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-black/8 rounded-2xl p-6 mb-5"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Статус подключения</h2>
            <p className="text-[12px] text-[#86868b]">Google Sheets API</p>
          </div>
          <button
            onClick={checkConnection}
            disabled={status === 'checking'}
            className="p-2 rounded-lg bg-[#f5f5f7] hover:bg-[#ececec] disabled:opacity-50 transition-colors"
          >
            <RotateCw size={14} className={status === 'checking' ? 'animate-spin' : ''} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {status === 'checking' && (
            <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 text-[#6e6e73] text-[13px]">
              <div className="w-4 h-4 border-2 border-[#1a56db]/30 border-t-[#1a56db] rounded-full animate-spin" />
              Проверяю подключение
            </motion.div>
          )}
          {status === 'connected' && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <Check className="text-[#34c759]" size={16} />
                <span className="font-semibold text-[14px] text-[#34c759]">Подключение установлено</span>
              </div>
              <p className="text-[13px] text-[#6e6e73]">
                В таблице найдено <strong className="text-[#1d1d1f]">{preview?.rows}</strong> книг.
              </p>
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="text-[#ff3b30]" size={16} />
                <span className="font-semibold text-[14px] text-[#ff3b30]">Не удалось подключиться</span>
              </div>
              <p className="text-[12px] text-[#6e6e73] mb-2">{error}</p>
              <div className="text-[11px] text-[#86868b] font-mono bg-[#f5f5f7] p-3 rounded-lg mt-2">
                Проверь: GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {preview?.preview && (
          <div className="mt-4">
            <p className="text-[11px] text-[#86868b] mb-2">Превью первых книг:</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {preview.preview.map((b, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-[#f5f5f7] text-[13px]">
                  <div className="font-semibold truncate text-[#1d1d1f]">{b.title}</div>
                  <div className="text-[11px] text-[#86868b]">{b.author} · {b.genre} · {b.year}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-black/8 rounded-2xl p-6 mb-5"
      >
        <h2 className="text-[16px] font-semibold mb-1 text-[#1d1d1f]">Запустить синхронизацию</h2>
        <p className="text-[12px] text-[#86868b] mb-5">Выбери режим и нажми кнопку</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setMode('append')}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === 'append' ? 'bg-[#1a56db]/5 border-[#1a56db]/30' : 'bg-white border-black/10 hover:border-black/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Upload size={14} className="text-[#1a56db]" />
              <span className="font-semibold text-[14px] text-[#1d1d1f]">Дополнить (безопасно)</span>
            </div>
            <p className="text-[12px] text-[#6e6e73]">
              Добавит новые + обновит существующие
            </p>
          </button>

          <button
            onClick={() => setMode('replace')}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === 'replace' ? 'bg-[#ff3b30]/5 border-[#ff3b30]/30' : 'bg-white border-black/10 hover:border-black/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Trash2 size={14} className="text-[#ff3b30]" />
              <span className="font-semibold text-[14px] text-[#1d1d1f]">Полная замена (опасно)</span>
            </div>
            <p className="text-[12px] text-[#6e6e73]">
              Удалит ВСЕ книги из БД
            </p>
          </button>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing || status !== 'connected'}
          className="w-full py-3.5 rounded-xl bg-[#1a56db] hover:bg-[#1849b8] text-white text-[15px] font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {syncing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Синхронизирую
            </>
          ) : (
            <><RefreshCw size={16} /> Синхронизировать</>
          )}
        </button>

        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Check className="text-[#34c759]" size={15} />
              <span className="font-semibold text-[14px] text-[#34c759]">Готово</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Из таблицы" value={lastResult.from_sheet} />
              <Stat label="Добавлено" value={lastResult.added} color="#34c759" />
              <Stat label="Обновлено" value={lastResult.updated} color="#1a56db" />
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-black/8 rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="text-[#34c759]" size={16} />
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Структура таблицы</h2>
        </div>
        <p className="text-[12px] text-[#86868b] mb-4">
          Расположи данные (заголовки в строке 1, данные со строки 2):
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] text-[#86868b] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 border-b border-black/5">A</th>
                <th className="text-left px-3 py-2 border-b border-black/5">B</th>
                <th className="text-left px-3 py-2 border-b border-black/5">C</th>
                <th className="text-left px-3 py-2 border-b border-black/5">D</th>
                <th className="text-left px-3 py-2 border-b border-black/5">E</th>
                <th className="text-left px-3 py-2 border-b border-black/5">F</th>
                <th className="text-left px-3 py-2 border-b border-black/5">G</th>
                <th className="text-left px-3 py-2 border-b border-black/5">H</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#f5f5f7]">
                <td colSpan="8" className="px-3 py-1 text-center text-[#86868b] text-[11px]">↑ данные ↓</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[#1a56db] font-semibold">title</td>
                <td className="px-3 py-2 font-mono text-[#1a56db] font-semibold">author</td>
                <td className="px-3 py-2 font-mono text-[#1a56db] font-semibold">genre</td>
                <td className="px-3 py-2 font-mono text-[#1a56db] font-semibold">year</td>
                <td className="px-3 py-2 font-mono text-[#1a56db] font-semibold">description</td>
                <td className="px-3 py-2 font-mono text-[#1a56db] font-semibold">cover_url</td>
                <td className="px-3 py-2 font-mono text-[#1a56db] font-semibold">file_url</td>
                <td className="px-3 py-2 font-mono text-[#1a56db] font-semibold">total_copies</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-[#6e6e73]">Мастер и Маргарита</td>
                <td className="px-3 py-2 text-[#6e6e73]">Булгаков</td>
                <td className="px-3 py-2 text-[#6e6e73]">Классика</td>
                <td className="px-3 py-2 text-[#6e6e73]">1967</td>
                <td className="px-3 py-2 text-[#6e6e73]">Роман</td>
                <td className="px-3 py-2 text-[#6e6e73]">https://</td>
                <td className="px-3 py-2 text-[#6e6e73]">https://</td>
                <td className="px-3 py-2 text-[#6e6e73]">2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

const Stat = ({ label, value, color = '#86868b' }) => (
  <div>
    <div className="text-xl font-semibold" style={{ color }}>{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-[#86868b] font-medium mt-0.5">{label}</div>
  </div>
)