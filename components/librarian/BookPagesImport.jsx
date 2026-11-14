'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, FileUp, BookOpenCheck } from 'lucide-react'
import { Button, Modal } from '../ui'
import { parseTable, toEntries } from '../../lib/pagesTable'

const STATUS = {
  added: { label: 'Впишем', cls: 'text-[var(--color-success)]' },
  changed: { label: 'Исправим', cls: 'text-[var(--color-brand)]' },
  same: { label: 'Уже так', cls: 'text-[var(--color-text-tertiary)]' },
  not_found: { label: 'Нет в каталоге', cls: 'text-[var(--color-danger)]' },
  ambiguous: { label: 'Несколько книг', cls: 'text-[var(--color-danger)]' },
  invalid: { label: 'Странное число', cls: 'text-[var(--color-danger)]' },
  duplicate: { label: 'Повтор', cls: 'text-[var(--color-text-tertiary)]' },
  empty: { label: 'Пусто', cls: 'text-[var(--color-text-tertiary)]' }
}

/**
 * «Страницы списком»: скачать таблицу книг → в Google Sheets дописать страницы → вставить обратно.
 */
export default function BookPagesImport() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState([])
  const [text, setText] = useState('')
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)

  const reset = () => { setEntries([]); setText(''); setReport(null) }
  const download = async missing => {
    try {
      const res = await fetch(`/api/librarian/books/pages${missing ? '?missing=1' : ''}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      if (!res.ok) throw new Error('Не удалось скачать')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a'); a.href = url; a.download = missing ? 'bookify-pages-missing.csv' : 'bookify-pages.csv'; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (e) { toast.error(e.message) }
  }
  const fromText = v => { setText(v); setReport(null); setEntries(toEntries(parseTable(v))) }
  const pickFile = async e => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!/\.(csv|tsv|txt)$/i.test(f.name)) return toast.error('Нужен файл .csv — в Google Sheets: Файл → Скачать → CSV')
    fromText(await f.text())
  }
  const run = async apply => {
    setBusy(true)
    try {
      const res = await fetch('/api/librarian/books/pages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: entries, apply })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setReport(d)
      if (apply) toast.success(`Страницы сохранены: ${d.result.filter(r => r.status === 'added' || r.status === 'changed').length} книг`)
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const counts = report ? report.result.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {}) : {}
  const willChange = (counts.added || 0) + (counts.changed || 0)

  return (
    <>
      <Button variant="secondary" size="sm" icon={BookOpenCheck} onClick={() => setOpen(true)}>Страницы списком</Button>
      <Modal open={open} onClose={() => { setOpen(false); reset() }} size="lg" title="Страницы и коэффициент у книг"
        description="1) Скачай таблицу и открой в Google Sheets. 2) Впиши страницы, слова на одной странице и коэффициент (0.5 / 0.75 / 1 / 1.25). 3) Выдели всю таблицу, скопируй и вставь сюда (или загрузи CSV). Подходит и таблица команды «Кітаптың атауы … Коэффициент»."
        footer={report?.applied ? (
          <Button onClick={() => { setOpen(false); reset() }}>Готово</Button>
        ) : report ? (
          <>
            <Button variant="secondary" onClick={() => setReport(null)}>Назад</Button>
            <Button loading={busy} disabled={!willChange} onClick={() => run(true)}>Сохранить ({willChange})</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => { setOpen(false); reset() }}>Отмена</Button>
            <Button loading={busy} disabled={!entries.length} onClick={() => run(false)}>Проверить ({entries.length})</Button>
          </>
        )}>
        {!report ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={Download} onClick={() => download(true)}>Только книги без страниц</Button>
              <Button variant="ghost" size="sm" icon={Download} onClick={() => download(false)}>Все книги</Button>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] cursor-pointer">
                <FileUp size={14} /> Загрузить CSV
                <input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={pickFile} />
              </label>
            </div>
            <textarea value={text} onChange={e => fromText(e.target.value)} rows={8}
              placeholder={'Вставь сюда таблицу из Google Sheets\nID\tНазвание\tАвтор\tСтраниц\n12\tАбай жолы\tМ. Әуезов\t480'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] text-[13px] font-mono outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 resize-y" />
            {entries.length > 0 && (
              <p className="text-[13px] text-[var(--color-text-secondary)]">Нашли строк со страницами: <b className="text-[var(--color-text-primary)]">{entries.length}</b></p>
            )}
            <p className="text-[12px] text-[var(--color-text-tertiary)]">Колонку ID не удаляй — по ней книга находится точно. Без ID ищем по названию.</p>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(counts).map(([k, n]) => (
                <span key={k} className={`px-3 py-1.5 rounded-full bg-[var(--color-bg-soft)] text-[12px] font-semibold ${STATUS[k]?.cls}`}>{STATUS[k]?.label}: {n}</span>
              ))}
            </div>
            <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
              {report.result.filter(r => r.status !== 'same' && r.status !== 'empty').map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-2 text-[13px]">
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{r.title}</span>
                    {r.asked && <span className="block truncate text-[11px] text-[#c97a00]">в таблице: «{r.asked}» — проверь, та ли книга</span>}
                  </span>
                  <span className="tabular-nums text-[var(--color-text-secondary)] text-right">
                    {r.old && r.old !== r.pages ? <><s>{r.old}</s> → </> : null}{r.pages}
                    {r.coef != null && <span className="block text-[11px] text-[var(--color-text-tertiary)]">× {r.coef} = {r.scored} засчитано</span>}
                  </span>
                  <span className={`w-28 text-right shrink-0 text-[12px] font-semibold ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label}</span>
                </div>
              ))}
            </div>
            {report.applied && <p className="mt-3 text-[12px] text-[var(--color-text-secondary)]">Теперь в «Отзывах» можно нажать «Начислить всем» — ученики получат монеты за книги, у которых страниц раньше не было.</p>}
          </div>
        )}
      </Modal>
    </>
  )
}
