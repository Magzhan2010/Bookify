'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Clapperboard, Play, ExternalLink, Trash2, Plus, Link2, Mic, X, Sparkles } from 'lucide-react'
import { Button, Modal } from './ui'
import { parseVideo, PLATFORMS } from '../lib/videoLinks'
import { TROPHY_NOTE } from '../lib/trophy'

const authed = (url, opts = {}) =>
  fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(async r => {
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'Ошибка')
    return d
  })

const fmtDate = d => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

/**
 * Видео ученика о книгах.
 * В профиле: <VideoGallery />. На странице ученика (команда, библиотекарь):
 * <VideoGallery studentId={id} manage books={одобренные выдачи} studentName=… />
 */
export default function VideoGallery({ studentId, manage = false, books = [], studentName, onAdded, addFor, onAddForDone }) {
  const [videos, setVideos] = useState(null)
  const [playing, setPlaying] = useState(null)
  const [adding, setAdding] = useState(null)

  const load = useCallback(() => {
    authed(studentId ? `/api/librarian/students/${studentId}/videos` : '/api/profile/videos')
      .then(setVideos).catch(() => setVideos([]))
  }, [studentId])
  useEffect(() => { load() }, [load])

  // Кнопка «+ Видео» в истории книг открывает то же окно
  useEffect(() => { if (addFor) setAdding(addFor) }, [addFor])

  const remove = async v => {
    if (!confirm('Убрать видео из профиля ученика? Монеты останутся — их отменяют в блоке «Монеты».')) return
    try { await authed(`/api/librarian/videos/${v.id}`, { method: 'DELETE' }); toast.success('Видео убрано'); load() } catch (e) { toast.error(e.message) }
  }

  const feature = async v => {
    const featured = !v.featured_at
    setVideos(list => list.map(x => x.id === v.id ? { ...x, featured_at: featured ? new Date().toISOString() : null } : x))
    try {
      await authed(`/api/librarian/videos/${v.id}`, { method: 'PATCH', body: { featured } })
      toast.success(featured ? 'Видео появится на главной странице (без имени ученика)' : 'Видео убрано с главной')
    } catch (e) { toast.error(e.message); load() }
  }

  if (!videos) return <div className="h-48 rounded-[28px] bg-[var(--color-bg-soft)] animate-pulse mb-6" />
  if (!manage && videos.length === 0) return <EmptyStudent />

  return (
    <section id="videos" className="mb-6 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center"><Clapperboard size={19} /></span>
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight leading-tight">{manage ? 'Видео ученика' : 'Мои видео'}</h2>
            <div className="text-[13px] text-[var(--color-text-tertiary)]">
              {videos.length ? `${videos.length} ${videos.length === 1 ? 'видео' : 'видео'} о книгах` : 'Пока нет ни одного видео'}
            </div>
          </div>
        </div>
        {manage && <Button icon={Plus} onClick={() => setAdding({})}>Добавить видео</Button>}
      </div>

      {videos.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--color-border-strong)] py-10 text-center text-[14px] text-[var(--color-text-tertiary)]">
          Добавь ссылку на видео — ученик увидит его у себя в профиле.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {videos.map((v, i) => (
            <VideoCard key={v.id} v={v} i={i} onPlay={() => setPlaying(v)} onRemove={manage ? () => remove(v) : null} onFeature={manage ? () => feature(v) : null} />
          ))}
        </div>
      )}

      <Player v={playing} onClose={() => setPlaying(null)} />
      {manage && (
        <AddVideoModal
          state={adding}
          books={books}
          studentName={studentName}
          onClose={() => { setAdding(null); onAddForDone?.() }}
          onDone={res => { setAdding(null); onAddForDone?.(); load(); onAdded?.(res) }}
        />
      )}
    </section>
  )
}

export function VideoCard({ v, i, onPlay, onRemove, onFeature, sub }) {
  const meta = useMemo(() => parseVideo(v.url) || { platform: 'link' }, [v.url])
  const p = PLATFORMS[meta.platform]
  const [thumbOk, setThumbOk] = useState(true)
  const thumb = meta.thumb && thumbOk ? meta.thumb : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <button
        onClick={onPlay}
        className="relative block w-full aspect-[4/5] rounded-[24px] overflow-hidden text-left bg-[#1f2a5c] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_40px_-12px_rgba(31,42,92,0.45)] transition-shadow duration-300"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" onError={() => setThumbOk(false)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 30% 10%, ${p.color}55, transparent 60%), linear-gradient(160deg, #1f2a5c, #0e1433)` }}>
            {v.book_cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.book_cover} alt="" className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[42%] rounded-lg shadow-2xl rotate-[-4deg] transition-transform duration-700 group-hover:rotate-0 group-hover:scale-105" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/0" />

        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md" style={{ background: `${p.color}cc` }}>{p.label}</span>
          {v.kind === 'tedx' && <span className="px-2 py-1 rounded-full text-[10px] font-black tracking-wider bg-[#e62b1e] text-white">TEDx</span>}
        </div>

        <span className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-white group-hover:text-[#1f2a5c]">
          <Play size={22} fill="currentColor" className="ml-0.5" />
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
          <div className="text-[14px] font-semibold leading-snug line-clamp-2">{v.title || v.book_title || 'Видео о книге'}</div>
          <div className="mt-1 text-[11px] text-white/70 truncate">
            {sub ?? <>{v.title && v.book_title ? `«${v.book_title}» · ` : ''}{fmtDate(v.created_at)}</>}
          </div>
        </div>
      </button>
      {onFeature && (
        <button onClick={onFeature} aria-pressed={!!v.featured_at}
          title={v.featured_at ? 'Убрать с главной страницы' : 'Показать на главной странице (без имени ученика)'}
          className={`absolute bottom-[62px] right-3 h-8 px-2.5 rounded-full text-[11px] font-bold flex items-center gap-1 backdrop-blur transition-all ${
            v.featured_at ? 'bg-[#ffc93c] text-[#1f2a5c] opacity-100' : 'bg-black/45 text-white opacity-0 group-hover:opacity-100 focus:opacity-100'}`}>
          <Sparkles size={12} /> {v.featured_at ? 'На главной' : 'На главную'}
        </button>
      )}
      {onRemove && (
        <button onClick={onRemove} aria-label="Убрать видео" title="Убрать видео"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/45 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
          <Trash2 size={14} />
        </button>
      )}
    </motion.div>
  )
}

export function Player({ v, onClose }) {
  const meta = v ? parseVideo(v.url) : null
  const p = meta ? PLATFORMS[meta.platform] : null
  return (
    <AnimatePresence>
      {v && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className={`relative w-full ${meta?.vertical ? 'max-w-[400px]' : 'max-w-[900px]'}`}
          >
            <button onClick={onClose} aria-label="Закрыть"
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25">
              <X size={18} />
            </button>
            <div className={`rounded-[24px] overflow-hidden bg-black shadow-2xl ${meta?.vertical ? 'aspect-[9/16] max-h-[78vh] mx-auto' : 'aspect-video'}`}>
              {meta?.embed ? (
                <iframe
                  src={meta.embed}
                  title={v.title || v.book_title || 'Видео'}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white p-6 text-center">
                  <Link2 size={28} />
                  <p className="text-[15px] text-white/80">Это видео открывается на сайте {p?.label || 'площадки'}.</p>
                  <a href={v.url} target="_blank" rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-full bg-white text-[#1f2a5c] text-[14px] font-semibold inline-flex items-center gap-2">
                    Открыть видео <ExternalLink size={15} />
                  </a>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-white">
              <div className="min-w-0">
                <div className="text-[16px] font-semibold truncate">{v.title || v.book_title || 'Видео о книге'}</div>
                <div className="text-[13px] text-white/60 truncate">
                  {v.book_title ? `«${v.book_title}»${v.book_author ? ` — ${v.book_author}` : ''} · ` : ''}{fmtDate(v.created_at)}
                </div>
              </div>
              <a href={v.url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-[13px] font-semibold">
                {p?.label} <ExternalLink size={13} />
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EmptyStudent() {
  return (
    <section id="videos" className="mb-6 scroll-mt-24 relative overflow-hidden rounded-[28px] p-5 sm:p-6 border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <div className="flex items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center shrink-0"><Clapperboard size={22} /></span>
        <div className="min-w-0">
          <div className="text-[16px] font-semibold">Мои видео</div>
          <div className="text-[13px] text-[var(--color-text-tertiary)]">
            Сними видео о прочитанной книге — команда добавит его сюда, и ты получишь +10 монет. За выступление на TEDx — +15.
          </div>
        </div>
      </div>
    </section>
  )
}

/** Прочитанные книги ученика, к которым можно добавить видео */
export const videoBooks = history => (history || []).filter(h =>
  ['returned', 'reviewed', 'approved'].includes(h.status) && h.notes !== TROPHY_NOTE && !h.own_book_pending)

/* ------------------------------------------------------------------ */
/* Добавить видео (команда, библиотекарь) — единственный путь:          */
/* книга + ссылка → видео в профиле ученика и монеты сразу.             */
/* state: { borrowId?, kind?, studentId?, studentName? }                */
/* Без books окно само загрузит прочитанные книги ученика по studentId. */
/* ------------------------------------------------------------------ */
export function AddVideoModal({ state, books: givenBooks, studentName, onClose, onDone }) {
  const [loaded, setLoaded] = useState(null)
  const books = givenBooks || loaded || []
  const name = studentName || state?.studentName
  const [borrowId, setBorrowId] = useState('')
  const [kind, setKind] = useState('video')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!state || givenBooks || !state.studentId) return
    setLoaded(null)
    authed(`/api/librarian/students/${state.studentId}`).then(d => setLoaded(videoBooks(d.history))).catch(() => setLoaded([]))
  }, [state, givenBooks])

  useEffect(() => {
    if (!state) return
    setBorrowId(state.borrowId ? String(state.borrowId) : '')
    setKind(state.kind || 'video')
    setUrl(''); setTitle('')
  }, [state])

  const meta = url ? parseVideo(url) : null
  const book = books.find(b => String(b.id) === String(borrowId))
  const already = book && (kind === 'video' ? book.has_video : book.has_tedx)

  const save = async e => {
    e.preventDefault()
    if (!borrowId) return toast.error('Выбери книгу')
    if (url && !meta) return toast.error('Это не похоже на ссылку')
    if (kind === 'video' && !meta) return toast.error('Вставь ссылку на видео')
    setSaving(true)
    try {
      const d = await authed(`/api/librarian/borrows/${borrowId}/bonus`, { method: 'POST', body: { kind, url, title } })
      toast.success(d.points ? `Видео добавлено · +${d.points} монет` : 'Видео добавлено')
      onDone({ borrowId: Number(borrowId), kind, points: d.points })
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  return (
    <Modal open={!!state} onClose={onClose} title={`${kind === 'tedx' ? 'TEDx' : 'Видео'}${name ? ` · ${name}` : ''}`} size="lg">
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">О какой книге</span>
          <select value={borrowId} onChange={e => setBorrowId(e.target.value)}
            className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent focus:border-[var(--color-brand)]/40 outline-none text-[14px]">
            <option value="">Выбери прочитанную книгу</option>
            {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          {state?.studentId && !givenBooks && !loaded && <span className="block mt-1 text-[12px] text-[var(--color-text-tertiary)]">Загружаем книги ученика…</span>}
          {(givenBooks || loaded) && books.length === 0 && <span className="block mt-1 text-[12px] text-[var(--color-text-tertiary)]">У ученика пока нет прочитанных книг — видео добавляют к книге, которую он вернул.</span>}
        </label>

        <div className="flex gap-2">
          {[['video', 'Видео о книге', Clapperboard, 10], ['tedx', 'Выступление TEDx', Mic, 15]].map(([k, l, Icon, pts]) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={`flex-1 flex items-center gap-2 px-3.5 py-3 rounded-2xl border text-left transition-colors ${kind === k ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'}`}>
              <Icon size={18} className={kind === k ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-tertiary)]'} />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">{l}</span>
                <span className="block text-[12px] text-[var(--color-text-tertiary)]">+{pts} монет</span>
              </span>
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Ссылка на {kind === 'tedx' ? 'запись выступления — по желанию' : 'видео'}</span>
          <div className="mt-1 relative">
            <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="YouTube, Instagram, TikTok или Google Диск"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent focus:border-[var(--color-brand)]/40 outline-none text-[14px]" />
          </div>
          {url && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: meta ? PLATFORMS[meta.platform].color : 'var(--color-danger)' }}>
              {meta ? `${PLATFORMS[meta.platform].label}${meta.embed ? ' — будет играть прямо в профиле' : ' — откроется по ссылке'}` : 'Это не похоже на ссылку'}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Подпись — по желанию</span>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Например: Обзор за 60 секунд"
            className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent focus:border-[var(--color-brand)]/40 outline-none text-[14px]" />
        </label>

        {book && (
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            {already ? 'Монеты за это уже начислены — добавим только видео.' : `Ученик сразу получит +${kind === 'video' ? 10 : 15} монет${meta ? ', видео появится у него в профиле' : ''}.`}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={saving} icon={Plus}>{already ? 'Добавить видео' : `Добавить и начислить +${kind === 'video' ? 10 : 15}`}</Button>
        </div>
      </form>
    </Modal>
  )
}
