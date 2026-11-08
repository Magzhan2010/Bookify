'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Button } from '../ui'
import { Field, inputCls, api } from './ui'

/**
 * Форма отчёта: что сделал, что получилось, ссылка.
 * task — если отчёт по задаче (тогда можно сразу отправить её на проверку).
 */
export default function ReportForm({ task, tasks = [], isLead, onDone }) {
  const [form, setForm] = useState({ taskId: task?.id || '', did: '', result: '', link: '', status: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    if (form.did.trim().length < 3) return toast.error('Опиши, что сделано')
    setSaving(true)
    try {
      await api('/api/team/reports', {
        method: 'POST',
        body: { ...form, taskId: form.taskId || null, status: form.status || null }
      })
      toast.success('Отчёт опубликован — его видит вся команда')
      setForm(f => ({ ...f, did: '', result: '', link: '', status: '' }))
      onDone?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {!task && (
        <Field label="Задача">
          <select value={form.taskId} onChange={e => set('taskId', e.target.value)} className={inputCls}>
            <option value="">Без задачи — просто апдейт</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
      )}
      <Field label="Что сделал">
        <textarea
          value={form.did}
          onChange={e => set('did', e.target.value)}
          rows={3}
          placeholder="Например: обошли 9-е классы, собрали 14 отзывов"
          className={`${inputCls} resize-y`}
        />
      </Field>
      <Field label="Что получилось">
        <textarea
          value={form.result}
          onChange={e => set('result', e.target.value)}
          rows={2}
          placeholder="Результат, цифры, выводы"
          className={`${inputCls} resize-y`}
        />
      </Field>
      <Field label="Ссылка" hint="Фото, видео, документ — по желанию">
        <input value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://" className={inputCls} />
      </Field>
      {(task || form.taskId) && (
        <Field label="Статус задачи после отчёта">
          <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
            <option value="">Не менять</option>
            <option value="in_progress">Ещё в работе</option>
            <option value="review">Готово — на проверку тимлиду</option>
            {isLead && <option value="done">Закрыть задачу</option>}
          </select>
        </Field>
      )}
      <div className="flex justify-end pt-1">
        <Button type="submit" icon={Send} loading={saving}>Опубликовать отчёт</Button>
      </div>
    </form>
  )
}
