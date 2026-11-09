'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Modal, Button } from '../ui'

/**
 * Окно удаления ученика. Если у ученика есть книги на руках, предлагает
 * сразу считать их возвращёнными и удалить.
 */
export default function DeleteStudent({ student, open, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false)
  const [needForce, setNeedForce] = useState(0)

  const close = () => { setNeedForce(0); onClose() }

  const remove = async force => {
    setBusy(true)
    try {
      const res = await fetch(`/api/librarian/students/${student.id}${force ? '?force=1' : ''}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) { setNeedForce(data.active_books || 1); return }
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      toast.success(`${student.name} удалён`)
      setNeedForce(0)
      onDeleted?.(student.id)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Удалить ученика?"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Отмена</Button>
          {needForce ? (
            <Button variant="danger" icon={Trash2} loading={busy} onClick={() => remove(true)}>Вернуть книги и удалить</Button>
          ) : (
            <Button variant="danger" icon={Trash2} loading={busy} onClick={() => remove(false)}>Удалить</Button>
          )}
        </>
      }
    >
      {student && (
        <div className="text-[14px] text-[var(--color-text-secondary)] space-y-3">
          <p>
            <b className="text-[var(--color-text-primary)]">{student.name}</b>
            {student.class_name ? ` · ${student.class_name}` : ''} будет удалён вместе с историей, отзывами и монетами. Отменить нельзя.
          </p>
          {needForce > 0 && (
            <p className="p-3 rounded-xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] font-medium">
              У ученика на руках книг: {needForce}. Они будут отмечены как возвращённые.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
