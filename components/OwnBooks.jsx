'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { BookPlus, Camera, Clock, CheckCircle2, X, Pencil, Lock, ImageOff } from 'lucide-react'
import { Button, Modal } from './ui'
import { coefForWords, scoredPages, tierForBook } from '../lib/points'

/** Сжимает фото до 600 px по большей стороне (JPEG) — чтобы заявка была лёгкой. */
async function compress(file) {
  const img = await createImageBitmap(file)
  const k = Math.min(1, 600 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.72)
}

const STATUS = {
  active: { label: 'Читаю', cls: 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]' },
  returned: { label: 'Ждёт отзыва', cls: 'bg-[#ffc93c]/20 text-[#9a6b00]' },
  reviewed: { label: 'Отзыв на проверке', cls: 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]' },
  approved: { label: 'Прочитано', cls: 'bg-[var(--color-success)]/12 text-[var(--color-success)]' }
}

const EMPTY = { title: '', author: '', pages: '', words_per_page: '', description: '' }

/**
 * «Своя книга»: читаю книгу, которой нет в библиотеке.
 * Заявка → библиотекарь/команда подтверждают → книга во «Ждут отзыва» → отзыв → монеты.
 * Свои книги можно поправить: заявку — целиком, подтверждённую — название, автора, обложку и описание.
 */
export default function OwnBooks({ onChanged }) {
  const [data, setData] = useState(null)
  // editing: null — закрыто; { mode: 'new' } | { mode: 'request', item } | { mode: 'book', item }
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [photo, setPhoto] = useState(null) // data URL новой обложки | 'remove' | null (не трогать)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/own-books', { headers: auth() })
      if (res.ok) setData(await res.json())
    } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(EMPTY); setPhoto(null); setEditing({ mode: 'new' }) }
  const openRequest = item => {
    setForm({ title: item.title, author: item.author, pages: String(item.pages || ''), words_per_page: item.words_per_page ? String(item.words_per_page) : '', description: '' })
    setPhoto(null); setEditing({ mode: 'request', item })
  }
  const openBook = item => {
    setForm({ title: item.title, author: item.author, pages: String(item.pages || ''), words_per_page: '', description: item.description || '' })
    setPhoto(null); setEditing({ mode: 'book', item })
  }
  const close = () => { if (!busy) setEditing(null) }

  const currentCover = photo === 'remove' ? null
    : photo || (editing?.mode === 'book' ? editing.item.cover_url : editing?.mode === 'request' ? editing.item.photo : null)

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      const isNew = editing.mode === 'new'
      const payload = {
        title: form.title, author: form.author,
        ...(editing.mode !== 'book' ? { pages: parseInt(form.pages), words_per_page: parseInt(form.words_per_page) || null } : { description: form.description }),
        ...(photo ? { photo } : {}),
        ...(editing.mode === 'request' ? { requestId: editing.item.id } : {}),
        ...(editing.mode === 'book' ? { bookId: editing.item.book_id } : {})
      }
      const res = await fetch('/api/profile/own-books', {
        method: isNew ? 'POST' : 'PATCH', headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      if (isNew) toast.success('Заявка отправлена', { description: 'Покажи книгу библиотекарю или команде — после подтверждения пиши отзыв' })
      else toast.success('Сохранено')
      setEditing(null); load(); if (!isNew) onChanged?.()
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const finish = async b => {
    try {
      const res = await fetch('/api/profile/own-books/finish', {
        method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ borrowId: b.borrow_id })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success('Теперь напиши отзыв', { description: 'Книга во вкладке «Ждут отзыва»' })
      load(); onChanged?.()
    } catch (err) { toast.error(err.message) }
  }
  const cancel = async r => {
    const res = await fetch(`/api/profile/own-books?id=${r.id}`, { method: 'DELETE', headers: auth() })
    if (res.ok) load(); else toast.error('Не удалось')
  }

  const reading = data?.reading || []
  const requests = data?.requests || []
  const books = (data?.books || []).filter(b => b.status !== 'active')
  const pages = parseInt(form.pages) || 0
  const coef = coefForWords(form.words_per_page)
  const tier = tierForBook(pages, coef)
  const lockedPages = editing?.mode === 'book'

  const input = 'w-full h-11 px-3.5 rounded-xl bg-[var(--color-bg-soft)] text-[14px] text-[var(--color-text-primary)] outline-none border border-transparent focus:border-[var(--color-brand)]/40 transition-colors'
  const label = 'block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5'

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--color-brand-soft)]">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">Читаешь свою книгу?</div>
          <div className="text-[12px] text-[var(--color-text-secondary)]">Книги нет в библиотеке — добавь её, и за отзыв тоже будут монеты</div>
        </div>
        <Button size="sm" icon={BookPlus} onClick={openNew}>Добавить свою книгу</Button>
      </div>

      <AnimatePresence initial={false}>
        {requests.map(r => (
          <motion.div key={`r${r.id}`} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[13px]">
            <Cover src={r.photo} small />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{r.title} <span className="font-normal text-[var(--color-text-tertiary)]">· {r.author}</span></div>
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)]">
                {r.status === 'pending' ? <Clock size={12} className="text-[#c97a00] shrink-0" /> : <X size={12} className="text-[var(--color-danger)] shrink-0" />}
                <span className="truncate">{r.status === 'pending' ? 'Ждёт подтверждения — покажи книгу библиотекарю или команде' : `Не подтвердили${r.note ? `: ${r.note}` : ''}`}</span>
              </div>
            </div>
            {r.status === 'pending' && (
              <button onClick={() => openRequest(r)} aria-label="Изменить заявку"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-brand)] transition-colors">
                <Pencil size={14} />
              </button>
            )}
            <button onClick={() => cancel(r)} className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] transition-colors">{r.status === 'pending' ? 'Отменить' : 'Скрыть'}</button>
          </motion.div>
        ))}
      </AnimatePresence>

      {reading.map(b => (
        <div key={b.borrow_id} className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <Cover src={b.cover_url} small />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold truncate">{b.title}</div>
            <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">Своя книга · {b.pages} стр.</div>
          </div>
          <button onClick={() => openBook(b)} aria-label="Изменить книгу"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-brand)] transition-colors">
            <Pencil size={14} />
          </button>
          <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => finish(b)}>К отзыву</Button>
        </div>
      ))}

      {books.length > 0 && (
        <div className="pt-1">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">Мои книги · {books.length}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {books.map(b => (
              <motion.button key={b.book_id} type="button" onClick={() => openBook(b)} whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-3 p-2.5 pr-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-brand)]/40 text-left transition-colors">
                <Cover src={b.cover_url} small />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{b.title}</div>
                  <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">{b.author} · {b.pages} стр.</div>
                  {STATUS[b.status] && <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS[b.status].cls}`}>{STATUS[b.status].label}</span>}
                </div>
                <Pencil size={14} className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-brand)] transition-colors shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <Modal open={!!editing} onClose={close} size="lg"
        title={editing?.mode === 'new' ? 'Своя книга' : 'Изменить книгу'}
        description={editing?.mode === 'new'
          ? 'Покажи книгу библиотекарю или команде — они подтвердят. Потом книга появится во вкладке «Ждут отзыва»: пиши отзыв, после проверки придут монеты.'
          : editing?.mode === 'book' ? 'Можно поправить название, автора, обложку и описание.' : 'Заявку ещё не рассмотрели — можно поправить всё.'}>
        {editing && (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Обложка */}
              <div className="shrink-0 flex sm:flex-col items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative w-28 aspect-[2/3] rounded-xl overflow-hidden bg-[var(--color-bg-soft)] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-brand)]/50 transition-colors group">
                  {currentCover ? (
                    <>
                      <img src={currentCover} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 py-1.5 bg-black/50 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Заменить</span>
                    </>
                  ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[var(--color-brand)]">
                      <Camera size={22} />
                      <span className="text-[11px] font-medium px-2 text-center">Фото обложки</span>
                    </span>
                  )}
                </button>
                {currentCover && (
                  <button type="button" onClick={() => setPhoto('remove')}
                    className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] transition-colors">
                    <ImageOff size={12} /> Убрать фото
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { try { setPhoto(await compress(f)) } catch { toast.error('Не получилось открыть фото') } } }} />
              </div>

              {/* Поля */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <label className={label}>Название</label>
                  <input required value={form.title} maxLength={200} placeholder="Например: Атомные привычки"
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={input} />
                </div>
                <div>
                  <label className={label}>Автор</label>
                  <input required value={form.author} maxLength={120} placeholder="Джеймс Клир"
                    onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className={input} />
                </div>
                {lockedPages ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] text-[12px] text-[var(--color-text-secondary)]">
                    <Lock size={13} className="shrink-0" />
                    <span>{form.pages} стр. — после подтверждения страницы меняет только команда или библиотекарь</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Сколько страниц</label>
                      <input required inputMode="numeric" placeholder="320" value={form.pages}
                        onChange={e => setForm(f => ({ ...f, pages: e.target.value.replace(/\D/g, '').slice(0, 4) }))} className={`${input} tabular-nums`} />
                    </div>
                    <div>
                      <label className={label}>Слов на 1 странице</label>
                      <input inputMode="numeric" placeholder="по желанию" value={form.words_per_page}
                        onChange={e => setForm(f => ({ ...f, words_per_page: e.target.value.replace(/\D/g, '').slice(0, 4) }))} className={`${input} tabular-nums`} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!lockedPages && (
              <p className="text-[12px] leading-relaxed text-[var(--color-text-tertiary)]">
                В одних изданиях на странице мало слов, в других много — поэтому страницы умножаются на коэффициент.
                Посчитай слова на одной полной странице, и мы подскажем коэффициент; окончательно его ставит команда.
                {pages > 0 && (
                  <span className="block mt-1.5 text-[var(--color-text-secondary)]">
                    Примерно: <b className="tabular-nums">{scoredPages(pages, coef)} стр.</b>{coef && coef !== 1 ? ` (× ${coef})` : ''} → {tier ? <b className="text-[var(--color-brand)]">+{tier.points} монет за объём</b> : '0 монет за объём (меньше 100)'} и +5 за отзыв
                  </span>
                )}
              </p>
            )}

            {editing.mode === 'book' && (
              <div>
                <label className={label}>О книге <span className="font-normal text-[var(--color-text-tertiary)]">· по желанию</span></label>
                <textarea rows={4} maxLength={3000} value={form.description} placeholder="Пара слов, о чём книга"
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] text-[14px] leading-relaxed text-[var(--color-text-primary)] outline-none border border-transparent focus:border-[var(--color-brand)]/40 transition-colors resize-y" />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={close}>Отмена</Button>
              <Button type="submit" loading={busy}>{editing.mode === 'new' ? 'Отправить' : 'Сохранить'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function Cover({ src, small }) {
  return (
    <div className={`${small ? 'w-10 h-14' : 'w-16 h-24'} rounded-lg overflow-hidden bg-[var(--color-bg-soft)] shrink-0 flex items-center justify-center`}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <BookPlus size={14} className="text-[var(--color-text-tertiary)]" />}
    </div>
  )
}
