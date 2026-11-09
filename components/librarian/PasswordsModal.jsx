'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileUp, KeyRound, Copy, Check, AlertTriangle } from 'lucide-react'
import { Modal, Button } from '../ui'

/**
 * Пароли списком: загрузить Word-таблицу (№ · имя · пароль) или вставить текст.
 * Сначала проверка (ничего не меняется), потом сохранение.
 * Участников команды сервер не трогает.
 */

// ---------- разбор файлов ----------

/** Достаёт word/document.xml из .docx (zip) средствами браузера. */
async function docxXml(file) {
  const buf = new Uint8Array(await file.arrayBuffer())
  const dv = new DataView(buf.buffer)
  // конец центрального каталога
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Это не похоже на файл Word')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  for (let n = 0; n < count; n++) {
    const method = dv.getUint16(p + 10, true)
    const csize = dv.getUint32(p + 20, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen))
    if (name === 'word/document.xml') {
      const lNameLen = dv.getUint16(local + 26, true)
      const lExtraLen = dv.getUint16(local + 28, true)
      const data = buf.subarray(local + 30 + lNameLen + lExtraLen, local + 30 + lNameLen + lExtraLen + csize)
      if (method === 0) return new TextDecoder().decode(data)
      const ds = new DecompressionStream('deflate-raw')
      const out = await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer()
      return new TextDecoder().decode(out)
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  throw new Error('В файле не нашлась таблица')
}

function rowsFromDocx(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  return [...doc.getElementsByTagNameNS(W, 'tr')].map(tr =>
    [...tr.getElementsByTagNameNS(W, 'tc')].map(tc =>
      [...tc.getElementsByTagNameNS(W, 't')].map(t => t.textContent).join('').trim()))
}

function rowsFromText(text) {
  return text.split(/\r?\n/).map(line => {
    const l = line.trim()
    if (!l) return []
    if (/[\t;|]/.test(l)) return l.split(/[\t;|]/).map(s => s.trim())
    if (l.includes(',')) return l.split(',').map(s => s.trim())
    const parts = l.split(/\s+/)
    return parts.length >= 3 ? [parts.slice(0, -1).join(' '), parts[parts.length - 1]] : [l]
  })
}

const HEADER = /^(фио|ф\.и\.о|имя|аты|оқушы|ученик|name|student|пароль|password|№)/i

/** Ячейки строки → { name, password }: номер отбрасываем, имя — первое, пароль — последнее. */
function toEntries(rows) {
  const out = []
  for (const cells of rows) {
    const c = cells.filter(Boolean)
    if (c.length && /^\d+[.)]?$/.test(c[0])) c.shift()
    if (c.length < 2) continue
    const name = c[0], password = c[c.length - 1]
    if (HEADER.test(name) || HEADER.test(password) || !/\p{L}/u.test(name)) continue
    out.push({ name, password })
  }
  return out
}

// ---------- интерфейс ----------

const STATUS = {
  updated: { label: 'Пароль поставлен', cls: 'text-[var(--color-success)]' },
  created: { label: 'Новый аккаунт', cls: 'text-[var(--color-brand)]' },
  team: { label: 'Команда — не трогаем', cls: 'text-[var(--color-text-tertiary)]' },
  not_found: { label: 'Не найден', cls: 'text-[var(--color-danger)]' },
  ambiguous: { label: 'Несколько совпадений', cls: 'text-[var(--color-danger)]' },
  invalid: { label: 'Пароль слишком короткий', cls: 'text-[var(--color-danger)]' },
  skipped: { label: 'Не ученик', cls: 'text-[var(--color-text-tertiary)]' }
}

export default function PasswordsModal({ open, onClose, onDone }) {
  const [entries, setEntries] = useState([])
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [createMissing, setCreateMissing] = useState(false)
  const [report, setReport] = useState(null) // { applied, result }
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef(null)

  const reset = () => { setEntries([]); setText(''); setFileName(''); setReport(null); setCreateMissing(false) }
  const close = () => { reset(); onClose() }

  const pickFile = async e => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const rows = /\.docx$/i.test(f.name) ? rowsFromDocx(await docxXml(f)) : rowsFromText(await f.text())
      const list = toEntries(rows)
      if (!list.length) throw new Error('Не нашли строк «имя — пароль»')
      setEntries(list); setFileName(f.name); setText(''); setReport(null)
    } catch (err) {
      toast.error(err.message || 'Не получилось прочитать файл')
    }
  }

  const fromText = v => {
    setText(v); setFileName(''); setReport(null)
    setEntries(toEntries(rowsFromText(v)))
  }

  const run = async apply => {
    setBusy(true)
    try {
      const result = []
      for (let i = 0; i < entries.length; i += 40) {
        const res = await fetch('/api/librarian/students/passwords', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: entries.slice(i, i + 40), apply, createMissing })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Ошибка')
        result.push(...data.result)
      }
      setReport({ applied: apply, result })
      if (apply) {
        const n = result.filter(r => r.status === 'updated' || r.status === 'created').length
        toast.success(`Готово: пароли у ${n} учеников`)
        onDone?.()
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const counts = report ? report.result.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {}) : {}
  const willChange = (counts.updated || 0) + (counts.created || 0)

  const copyList = async () => {
    const lines = report.result
      .filter(r => r.status === 'updated' || r.status === 'created')
      .map(r => `${r.name}\t${r.email}\t${r.password}`)
    try {
      await navigator.clipboard.writeText(['Имя\tЛогин\tПароль', ...lines].join('\n'))
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { toast.error('Не удалось скопировать') }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Пароли списком"
      description="Загрузи таблицу Word (№ · имя · пароль) или вставь список. Пароли участников команды не меняются."
      size="lg"
      footer={
        report?.applied ? (
          <>
            <Button variant="secondary" icon={copied ? Check : Copy} onClick={copyList}>{copied ? 'Скопировано' : 'Скопировать логины и пароли'}</Button>
            <Button onClick={close}>Готово</Button>
          </>
        ) : report ? (
          <>
            <Button variant="secondary" onClick={() => setReport(null)}>Назад</Button>
            <Button icon={KeyRound} loading={busy} disabled={!willChange} onClick={() => run(true)}>
              Сохранить пароли ({willChange})
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>Отмена</Button>
            <Button loading={busy} disabled={!entries.length} onClick={() => run(false)}>Проверить ({entries.length})</Button>
          </>
        )
      }
    >
      {!report ? (
        <div className="space-y-4">
          <input ref={fileRef} type="file" accept=".docx,.csv,.txt" className="hidden" onChange={pickFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-7 rounded-2xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-brand-soft)] transition-colors"
          >
            <FileUp size={26} className="text-[var(--color-brand)]" />
            <span className="text-[14px] font-semibold">{fileName || 'Загрузить файл Word (.docx)'}</span>
            <span className="text-[12px] text-[var(--color-text-tertiary)]">или .csv / .txt</span>
          </button>
          <div className="text-center text-[12px] text-[var(--color-text-tertiary)]">или вставь таблицу из Word / Excel</div>
          <textarea
            value={text}
            onChange={e => fromText(e.target.value)}
            rows={5}
            placeholder={'Adamov Musa\tпароль\nAbdilbar Khalid\tпароль'}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent text-[13px] font-mono outline-none focus:border-[var(--color-brand)]/40 resize-y"
          />
          {entries.length > 0 && (
            <div className="text-[13px] text-[var(--color-text-secondary)]">
              Найдено строк: <b className="text-[var(--color-text-primary)]">{entries.length}</b> · первая: {entries[0].name}
            </div>
          )}
          <label className="flex items-center gap-2.5 text-[13px] cursor-pointer">
            <input type="checkbox" checked={createMissing} onChange={e => setCreateMissing(e.target.checked)} className="w-4 h-4 accent-[var(--color-brand)]" />
            Создать аккаунты для тех, кого ещё нет на сайте
          </label>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(counts).map(([k, n]) => (
              <span key={k} className={`px-3 py-1.5 rounded-full bg-[var(--color-bg-soft)] text-[12px] font-semibold ${STATUS[k]?.cls}`}>
                {STATUS[k]?.label}: {n}
              </span>
            ))}
          </div>
          {!report.applied && (
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-3 flex items-start gap-2">
              <AlertTriangle size={15} className="text-[#c97a00] shrink-0 mt-0.5" />
              Это проверка — пока ничего не изменилось. После сохранения ученикам нужно будет войти заново с новым паролем.
            </p>
          )}
          <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {report.result.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                <span className="flex-1 min-w-0 truncate font-medium">{r.name}</span>
                <span className="hidden sm:block w-56 truncate text-[var(--color-text-tertiary)]">{r.email || '—'}</span>
                <span className={`shrink-0 text-[12px] font-semibold ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
