'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Users, Copy, Download, KeyRound, AlertTriangle } from 'lucide-react'
import { Modal, Button, Input } from '../ui'

const CHUNK = 40

/**
 * Добавление учеников библиотекарем: по одному или списком.
 * Логин и пароль генерируются автоматически; после создания показываем
 * таблицу с паролями — скопировать или скачать для раздачи.
 */
export default function AddStudentsModal({ open, onClose, onAdded, classes = [] }) {
  const [tab, setTab] = useState('one')
  const [one, setOne] = useState({ name: '', className: '', email: '' })
  const [listClass, setListClass] = useState('')
  const [listText, setListText] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState(null) // { created, skipped }

  // Строка списка: «Имя» или «Имя;Класс» (разделитель ; , или табуляция)
  const parsedList = useMemo(() => (
    listText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => {
        const [name, cls] = l.split(/[;\t]|,(?=\s*\d)/).map(x => (x || '').trim())
        return { name, className: cls || listClass || null }
      })
      .filter(s => s.name)
  ), [listText, listClass])

  const reset = () => {
    setOne({ name: '', className: '', email: '' })
    setListText('')
    setResult(null)
    setProgress('')
  }

  const close = () => {
    if (result?.created?.length) onAdded?.()
    reset()
    onClose()
  }

  const send = async (students) => {
    const token = localStorage.getItem('token')
    const created = []
    const skipped = []
    for (let i = 0; i < students.length; i += CHUNK) {
      const part = students.slice(i, i + CHUNK)
      if (students.length > CHUNK) setProgress(`${Math.min(i + CHUNK, students.length)} из ${students.length}`)
      const res = await fetch('/api/librarian/students/bulk', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: part })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      created.push(...d.created)
      skipped.push(...d.skipped)
    }
    return { created, skipped }
  }

  const submit = async () => {
    const students = tab === 'one'
      ? [{ name: one.name.trim(), className: one.className.trim() || null, email: one.email.trim() || null }]
      : parsedList
    if (!students.length || !students[0].name) {
      toast.error(tab === 'one' ? 'Впиши имя ученика' : 'Вставь список имён')
      return
    }
    setSaving(true)
    try {
      const r = await send(students)
      setResult(r)
      if (r.created.length) toast.success(`Создано учеников: ${r.created.length}`)
      if (r.skipped.length) toast.warning(`Пропущено: ${r.skipped.length}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
      setProgress('')
    }
  }

  const asText = () =>
    result.created.map(s => `${s.name}\t${s.class_name || ''}\t${s.email}\t${s.password}`).join('\n')

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(`Имя\tКласс\tЛогин\tПароль\n${asText()}`)
      toast.success('Скопировано — вставь в Excel или Google Таблицу')
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  const downloadCsv = () => {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = ['Имя;Класс;Логин;Пароль', ...result.created.map(s =>
      [s.name, s.class_name, s.email, s.password].map(esc).join(';'))]
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ucheniki-paroli-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={result ? 'Ученики добавлены' : 'Добавить учеников'}
      description={result ? undefined : 'Логин и пароль создадутся автоматически — ты получишь их списком для раздачи.'}
      footer={result ? (
        <>
          <Button variant="secondary" onClick={reset}>Добавить ещё</Button>
          <Button onClick={close}>Готово</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={close}>Отмена</Button>
          <Button onClick={submit} loading={saving} icon={UserPlus}>
            {progress ? `Создаю… ${progress}` : tab === 'one' ? 'Создать' : `Создать (${parsedList.length})`}
          </Button>
        </>
      )}
    >
      {!result ? (
        <>
          <div className="flex gap-1 p-1 mb-4 rounded-xl bg-[var(--color-bg-soft)] w-fit">
            {[{ k: 'one', l: 'Один ученик', i: UserPlus }, { k: 'list', l: 'Списком', i: Users }].map(t => {
              const Icon = t.i
              return (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`px-3.5 py-2 rounded-lg text-[13px] font-medium flex items-center gap-1.5 ${
                    tab === t.k ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  <Icon size={14} /> {t.l}
                </button>
              )
            })}
          </div>

          <datalist id="class-list">
            {classes.map(c => <option key={c} value={c} />)}
          </datalist>

          {tab === 'one' ? (
            <div className="space-y-3">
              <Input label="Имя и фамилия" required value={one.name} onChange={e => setOne({ ...one, name: e.target.value })} placeholder="Серіков Арман" />
              <Input label="Класс" value={one.className} onChange={e => setOne({ ...one, className: e.target.value })} placeholder="7" list="class-list" />
              <Input
                label="Email (необязательно)"
                value={one.email}
                onChange={e => setOne({ ...one, email: e.target.value })}
                placeholder="создастся сам: serikov.arman@dls.school"
                hint="Оставь пустым — логин построится из имени"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                label="Класс для всех"
                value={listClass}
                onChange={e => setListClass(e.target.value)}
                placeholder="7"
                list="class-list"
                hint="Можно указать класс в строке: «Имя;8» — он важнее общего"
              />
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Список — по одному ученику в строке
                </label>
                <textarea
                  value={listText}
                  onChange={e => setListText(e.target.value)}
                  rows={8}
                  placeholder={'Серіков Арман\nНұрланова Аружан\nТоқтаров Әли;8'}
                  className="w-full bg-[var(--color-bg-soft)] border border-transparent px-4 py-3 rounded-xl text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/30 focus:bg-[var(--color-bg-card)] transition-all resize-y font-mono"
                />
                <div className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
                  Учеников в списке: <b className="text-[var(--color-text-primary)]">{parsedList.length}</b>. Можно вставить столбец из Excel.
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="mb-3 p-3 rounded-xl bg-[var(--color-warning)]/10 text-[13px] text-[var(--color-text-primary)] flex gap-2">
            <AlertTriangle size={16} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
            Пароли видны только сейчас. Скачай или скопируй список и раздай ученикам.
          </div>
          {result.created.length > 0 && (
            <>
              <div className="flex gap-2 mb-3">
                <Button size="sm" variant="secondary" icon={Copy} onClick={copyAll}>Скопировать</Button>
                <Button size="sm" variant="secondary" icon={Download} onClick={downloadCsv}>Скачать для Excel</Button>
              </div>
              <div className="max-h-72 overflow-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full text-[13px]">
                  <thead className="bg-[var(--color-bg-soft)] text-[var(--color-text-tertiary)] text-left sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">Имя</th>
                      <th className="px-3 py-2 font-medium">Класс</th>
                      <th className="px-3 py-2 font-medium">Логин</th>
                      <th className="px-3 py-2 font-medium"><KeyRound size={12} className="inline" /> Пароль</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.created.map(s => (
                      <tr key={s.id} className="border-t border-[var(--color-border)]">
                        <td className="px-3 py-2 text-[var(--color-text-primary)]">{s.name}</td>
                        <td className="px-3 py-2 text-[var(--color-text-secondary)]">{s.class_name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[12px] text-[var(--color-text-secondary)]">{s.email}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-[var(--color-text-primary)]">{s.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {result.skipped.length > 0 && (
            <div className="mt-3 text-[12px] text-[var(--color-danger)]">
              Пропущены: {result.skipped.map(s => `${s.name} (${s.reason})`).join(', ')}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
