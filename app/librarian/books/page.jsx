'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Library, Search, Loader2, BookOpen, Users, X,
  ChevronLeft, ChevronRight, Plus, RotateCcw
} from 'lucide-react'
import { Button, EmptyState, SkeletonRows } from '../../../components/ui'

const PAGE_SIZE = 25

const STATUS_TABS = [
  { key: 'all', label: 'Все' },
  { key: 'avail', label: 'Есть в наличии' },
  { key: 'hand', label: 'На руках' },
  { key: 'archive', label: 'В архиве' }
]

const SORTS = [
  { key: 'title', label: 'По названию' },
  { key: 'author', label: 'По автору' },
  { key: 'hand', label: 'Сначала на руках' },
  { key: 'newest', label: 'Сначала новые' }
]

export default function LibrarianBooksPage() {
  const router = useRouter()

  const [books, setBooks] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')      // применённый поиск (с дебаунсом)
  const [genre, setGenre] = useState('Все')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('title')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, pages: 1 })

  const [copies, setCopies] = useState({})   // id -> значение total_copies
  const [savingId, setSavingId] = useState(null)

  // Дебаунс поиска, чтобы не дёргать API на каждую букву
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        status,
        sort,
        page: String(page),
        limit: String(PAGE_SIZE)
      })
      if (query) params.set('q', query)
      if (genre && genre !== 'Все') params.set('genre', genre)

      const res = await fetch(`/api/librarian/books?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401) {
        localStorage.removeItem('token')
        return router.push('/login')
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')

      setBooks(data.books || [])
      setMeta({ total: data.total || 0, pages: data.pages || 1 })
      if (data.genres) setGenres(data.genres)
    } catch (e) {
      setError(e.message || 'Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [status, sort, page, query, genre, router])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const total = books.reduce((s, b) => s + (b.total_copies || 0), 0)
    const avail = books.reduce((s, b) => s + (b.available_copies || 0), 0)
    return { total, avail, hand: total - avail }
  }, [books])

  // ─── Быстрое изменение числа экземпляров прямо в таблице ───
  const saveCopies = async (book, value) => {
    const num = Math.max(1, parseInt(value) || 1)
    if (num === book.total_copies) return
    setSavingId(book.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ total_copies: num })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setBooks(prev => prev.map(b => (b.id === book.id ? data.book : b)))
      toast.success(`«${book.title}» — экземпляров: ${num}`)
    } catch (e) {
      toast.error(e.message)
      setCopies(prev => ({ ...prev, [book.id]: book.total_copies }))
    } finally {
      setSavingId(null)
    }
  }

  // ─── Вернуть из архива ───
  const restore = async (book) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/books/${book.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      toast.success(`«${book.title}» снова в каталоге`)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      {/* Шапка */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand)] flex items-center justify-center">
            <Library size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">Книги</h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
              Весь фонд: экземпляры, кто держит, архив
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/librarian/books/add')}
          icon={Plus}
          size="sm"
        >
          Добавить книгу
        </Button>
      </div>

      {/* Сводка по текущей выборке */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Экземпляров', value: stats.total, color: 'var(--color-brand)' },
          { label: 'В библиотеке', value: stats.avail, color: 'var(--color-success)' },
          { label: 'На руках', value: stats.hand, color: 'var(--color-warning)' }
        ].map(s => (
          <div key={s.label} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mb-1">
              {s.label}
            </div>
            <div className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Фильтры */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Название, автор или тег…"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent pl-10 pr-9 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                aria-label="Очистить поиск"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={genre}
            onChange={e => { setGenre(e.target.value); setPage(1) }}
            className="sm:w-56 bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40"
          >
            <option value="Все">Все жанры</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="sm:w-52 bg-[var(--color-bg-soft)] border border-transparent px-3.5 py-2.5 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40"
          >
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setStatus(t.key); setPage(1) }}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                status === t.key
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto self-center text-[12px] text-[var(--color-text-tertiary)]">
            Найдено: {meta.total}
          </span>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <EmptyState
          variant="error"
          title="Не удалось загрузить список"
          description={error}
          actionLabel="Повторить"
          onAction={load}
        />
      )}

      {/* Загрузка */}
      {!error && loading && <SkeletonRows count={8} />}

      {/* Пусто */}
      {!error && !loading && books.length === 0 && (
        <EmptyState
          variant="no-results"
          icon={Library}
          title="Ничего не найдено"
          description="Попробуй другой запрос или сбрось фильтры"
          actionLabel="Сбросить фильтры"
          onAction={() => { setSearch(''); setGenre('Все'); setStatus('all'); setPage(1) }}
        />
      )}

      {/* Таблица */}
      {!error && !loading && books.length > 0 && (
        <>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            {/* Шапка таблицы — только на широких экранах */}
            <div className="hidden lg:grid grid-cols-[1fr_120px_110px_180px_150px] gap-3 px-4 py-3 border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
              <div>Книга</div>
              <div>Жанр</div>
              <div>Экземпляры</div>
              <div>На руках</div>
              <div className="text-right">Действия</div>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {books.map(b => {
                const onHand = b.total_copies - b.available_copies
                const archived = !!b.archived_at
                return (
                  <motion.div
                    key={b.id}
                    layout
                    className="grid grid-cols-1 lg:grid-cols-[1fr_120px_110px_180px_150px] gap-3 px-4 py-3 hover:bg-[var(--color-bg-soft)] transition-colors"
                  >
                    {/* Книга */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-15 aspect-[2/3] rounded-lg bg-[var(--color-bg-soft)] overflow-hidden shrink-0 ring-1 ring-[var(--color-border)]">
                        {b.cover_url ? (
                          <img
                            src={b.cover_url}
                            alt={b.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen size={14} className="text-[var(--color-text-tertiary)]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => router.push(`/books/${b.id}`)}
                          className="font-medium text-[14px] text-[var(--color-text-primary)] hover:text-[var(--color-brand)] text-left truncate block max-w-full transition-colors"
                        >
                          {b.title}
                        </button>
                        <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
                          {b.author}
                          {b.year ? ` · ${b.year}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Жанр */}
                    <div className="text-[12px] text-[var(--color-text-secondary)] truncate">
                      {b.genre || '—'}
                    </div>

                    {/* Экземпляры — правится прямо здесь */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={copies[b.id] ?? b.total_copies}
                        disabled={archived}
                        onChange={e => setCopies(prev => ({ ...prev, [b.id]: e.target.value }))}
                        onBlur={e => saveCopies(b, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                        className="w-14 bg-[var(--color-bg-soft)] border border-transparent px-2 py-1.5 rounded-lg text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40 disabled:opacity-40"
                        aria-label={`Экземпляров: ${b.title}`}
                      />
                      <span className="text-[12px] text-[var(--color-text-tertiary)] whitespace-nowrap">
                        / {b.available_copies} св.
                      </span>
                      {savingId === b.id && (
                        <Loader2 size={12} className="animate-spin text-[var(--color-brand)]" />
                      )}
                    </div>

                    {/* На руках */}
                    <div className="min-w-0">
                      {onHand > 0 ? (
                        <div
                          className="text-[12px] text-[var(--color-text-secondary)] truncate"
                          title={b.holders}
                        >
                          <Users size={11} className="inline mr-1 align-[-1px]" />
                          {b.holders}
                        </div>
                      ) : (
                        <span className="text-[12px] text-[var(--color-success)]">все в библиотеке</span>
                      )}
                    </div>

                    {/* Действия */}
                    <div className="flex items-center gap-1.5 lg:justify-end">
                      {archived ? (
                        <button
                          onClick={() => restore(b)}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)] text-[12px] font-medium flex items-center gap-1 hover:bg-[var(--color-success)]/15 transition-colors"
                        >
                          <RotateCcw size={12} /> Вернуть
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/librarian/issue?book=${b.id}`)}
                          disabled={b.available_copies <= 0}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-[12px] font-medium hover:bg-[var(--color-brand)]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Выдать
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/books/${b.id}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] text-[12px] font-medium hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        Открыть
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Пагинация */}
          {meta.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-[12px] text-[var(--color-text-tertiary)]">
                Страница {page} из {meta.pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ChevronLeft}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Назад
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  iconRight={ChevronRight}
                  onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                  disabled={page >= meta.pages}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}