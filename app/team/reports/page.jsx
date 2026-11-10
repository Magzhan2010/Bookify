'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { PenLine, FileText } from 'lucide-react'
import { Button, Modal, Skeleton, EmptyState } from '../../../components/ui'
import { useTeam } from '../../../components/team/TeamContext'
import { PageHeader, Avatar, api } from '../../../components/team/ui'
import ReportForm from '../../../components/team/ReportForm'
import ReportCard from '../../../components/team/ReportCard'

export default function ReportsPage() {
  const { me } = useTeam()
  const [reports, setReports] = useState(null)
  const [people, setPeople] = useState([])
  const [myTasks, setMyTasks] = useState([])
  const [who, setWho] = useState('all')
  const [writing, setWriting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [r, p, t] = await Promise.all([
        api('/api/team/reports?limit=200'),
        api('/api/team/people'),
        api('/api/team/tasks?assignee=me')
      ])
      setReports(r); setPeople(p); setMyTasks(t.filter(x => x.status !== 'done'))
    } catch (e) {
      toast.error(e.message); setReports([])
    }
  }, [])
  useEffect(() => { load() }, [load])

  const shown = useMemo(
    () => (reports || []).filter(r => who === 'all' || String(r.user_id) === who),
    [reports, who]
  )

  // Кто сколько отчитался — сразу видно, кто что делает
  const counts = useMemo(() => {
    const m = new Map()
    for (const r of reports || []) m.set(r.user_id, (m.get(r.user_id) || 0) + 1)
    return m
  }, [reports])

  const remove = async r => {
    if (!confirm('Удалить отчёт?')) return
    try { await api(`/api/team/reports/${r.id}`, { method: 'DELETE' }); load() } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Работа"
        title="Отчёты"
        subtitle="Что каждый сделал и что из этого получилось. Отчёты видит вся команда."
        actions={<Button icon={PenLine} onClick={() => setWriting(true)}>Написать отчёт</Button>}
      />

      {people.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
          <PersonPill active={who === 'all'} onClick={() => setWho('all')} label="Все" count={reports?.length} />
          {people.map(p => (
            <PersonPill key={p.id} active={who === String(p.id)} onClick={() => setWho(String(p.id))}
              label={p.name.split(' ')[0]} count={counts.get(p.id) || 0} person={p} />
          ))}
        </div>
      )}

      {!reports ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-36 rounded-[20px]" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={FileText} title="Отчётов пока нет" description="Сделал что-то по проекту — расскажи команде." actionLabel="Написать отчёт" onAction={() => setWriting(true)} />
      ) : (
        <div className="space-y-3 max-w-3xl">
          <AnimatePresence initial={false}>
            {shown.map((r, i) => (
              <ReportCard key={r.id} report={r} i={i} canDelete={r.user_id === me.id || me.can_assign} onDelete={remove} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={writing} onClose={() => setWriting(false)} title="Новый отчёт" description="Коротко: что сделал и какой результат." size="lg">
        <ReportForm tasks={myTasks} isLead={me.is_lead} onDone={() => { setWriting(false); load() }} />
      </Modal>
    </div>
  )
}

function PersonPill({ active, onClick, label, count, person }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
        active
          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-card)]'
          : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
      } ${person ? '' : 'pl-3'}`}
    >
      {person && <Avatar name={person.name} src={person.avatar_url} size={22} />}
      {label}
      {count != null && <span className={`tabular-nums ${active ? 'opacity-70' : 'text-[var(--color-text-tertiary)]'}`}>{count}</span>}
    </button>
  )
}
