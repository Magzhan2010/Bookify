'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Quote, Plus, Pencil, Trash2, ImagePlus, Link2, X, Loader2 } from 'lucide-react'
import { Button, Modal, Input } from '../../../components/ui'
import QuoteFeature from '../../../components/quotes/QuoteFeature'

const EMPTY = { text: '', author_name: '', author_info: '', book_title: '', image: undefined }

/** Сжимаем фото в браузере: максимум 600px по большей стороне, JPEG 85%. */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Это не похоже на картинку'))
      img.onload = () => {
        const scale = Math.min(1, 600 / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function LibrarianQuotesPage() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | quote
  const [form, setForm] = useState(EMPTY)
  const [preview, setPreview] = useState(null)
  const [urlMode, setUrlMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const fileRef = useRef(null)

  const load = async () => {
    try {
      const res = await fetch(`/api/quotes?t=${Date.now()}`, { cache: 'no-store' }) // мимо кеша CDN
      setQuotes(await res.json())
    } catch {
      toast.error('Не удалось загрузить цитаты')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(EMPTY); setPreview(null); setUrlMode(false); setEditing('new') }
  const openEdit = q => {
    setForm({ text: q.text, author_name: q.author_name, author_info: q.author_info || '', book_title: q.book_title || '', image: undefined })
    setPreview(q.image_url)
    setUrlMode(false)
    setEditing(q)
  }

  const onFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const dataUrl = await compressImage(file)
      setForm(f => ({ ...f, image: dataUrl }))
      setPreview(dataUrl)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const isNew = editing === 'new'
      const body = { ...form }
      if (body.image === undefined) delete body.image // фото не меняли
      const res = await fetch(isNew ? '/api/quotes' : `/api/quotes/${editing.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success(isNew ? 'Цитата добавлена' : 'Цитата обновлена')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async q => {
    if (deleting !== q.id) { setDeleting(q.id); return } // первый клик — подтверждение
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/quotes/${q.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error((await res.json()).error || 'Ошибка')
      toast.success('Цитата удалена')
      setQuotes(list => list.filter(x => x.id !== q.id))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const previewQuote = {
    id: 'preview',
    text: form.text || 'Здесь появится текст цитаты.',
    author_name: form.author_name || 'Автор',
    author_info: form.author_info,
    book_title: form.book_title,
    image_url: preview
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] text-[var(--color-text-primary)] flex items-center gap-2">
            <Quote className="text-[var(--color-brand)]" /> Цитаты
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
            Цитаты из книг с фото автора. Ученики видят их в разделе «Цитаты» и на главной странице.
          </p>
        </div>
        <Button icon={Plus} onClick={openNew}>Добавить цитату</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-brand)]" /></div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-20 rounded-[28px] border border-dashed border-[var(--color-border)]">
          <Quote size={30} strokeWidth={1.5} className="mx-auto text-[var(--color-text-tertiary)] mb-3" />
          <div className="font-semibold text-[var(--color-text-primary)]">Цитат пока нет</div>
          <div className="text-[13px] text-[var(--color-text-tertiary)] mt-1 mb-5">Добавь первую — она сразу появится у учеников.</div>
          <Button icon={Plus} onClick={openNew}>Добавить цитату</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <div key={q.id} className="flex items-start gap-4 p-4 rounded-[20px] bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              {q.image_url ? (
                <img src={q.image_url} alt="" className="w-14 h-14 rounded-2xl object-cover object-top grayscale shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-soft)] flex items-center justify-center text-[20px] font-semibold text-[var(--color-text-tertiary)] shrink-0">
                  {q.author_name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-[var(--color-text-primary)] leading-relaxed">«{q.text}»</p>
                <div className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                  <b className="font-semibold">{q.author_name}</b>
                  {q.author_info ? ` · ${q.author_info}` : ''}{q.book_title ? ` · «${q.book_title}»` : ''}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(q)} className="p-2 rounded-xl text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)]" title="Изменить">
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => remove(q)}
                  onBlur={() => setDeleting(null)}
                  className={`p-2 rounded-xl transition-colors ${deleting === q.id ? 'bg-[var(--color-danger)] text-white' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-soft)]'}`}
                  title={deleting === q.id ? 'Нажми ещё раз, чтобы удалить' : 'Удалить'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing === 'new' ? 'Новая цитата' : 'Изменить цитату'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Отмена</Button>
            <Button onClick={save} loading={saving}>Сохранить</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">Цитата *</label>
            <textarea
              value={form.text}
              onChange={e => setForm({ ...form, text: e.target.value.slice(0, 600) })}
              rows={3}
              placeholder="Если бы сегодня был последний день твоей жизни…"
              className="w-full bg-[var(--color-bg-soft)] border border-transparent px-4 py-3 rounded-xl text-[15px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/30 focus:bg-[var(--color-bg-card)] transition-all resize-y"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Кто сказал" required value={form.author_name} onChange={e => setForm({ ...form, author_name: e.target.value })} placeholder="Имя автора" />
            <Input label="О нём (необязательно)" value={form.author_info} onChange={e => setForm({ ...form, author_info: e.target.value })} placeholder="Годы жизни или кто он" />
          </div>
          <Input label="Из какой книги (необязательно)" value={form.book_title} onChange={e => setForm({ ...form, book_title: e.target.value })} placeholder="Название книги" />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-[var(--color-text-secondary)]">Фото автора</label>
              <button type="button" onClick={() => setUrlMode(v => !v)} className="text-[12px] text-[var(--color-brand)] flex items-center gap-1">
                {urlMode ? <><ImagePlus size={12} /> Загрузить файл</> : <><Link2 size={12} /> Вставить ссылку</>}
              </button>
            </div>
            {urlMode ? (
              <Input
                value={typeof form.image === 'string' && !form.image.startsWith('data:') ? form.image : ''}
                onChange={e => { setForm({ ...form, image: e.target.value }); setPreview(e.target.value || null) }}
                placeholder="https://…"
              />
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-soft)] text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-border)] flex items-center gap-2"
                >
                  <ImagePlus size={15} /> {preview ? 'Заменить фото' : 'Выбрать фото'}
                </button>
                {preview && (
                  <button type="button" onClick={() => { setForm({ ...form, image: null }); setPreview(null) }}
                    className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] flex items-center gap-1">
                    <X size={12} /> Убрать
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              </div>
            )}
            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1.5">Лучше портрет, где лицо сверху. На сайте фото будет чёрно-белым.</p>
          </div>

          <div>
            <div className="text-[12px] text-[var(--color-text-tertiary)] mb-2">Так увидят ученики</div>
            <div className="pointer-events-none scale-[0.92] origin-top-left w-[108.7%]">
              <QuoteFeature quotes={[previewQuote]} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
