'use client'

import { motion } from 'framer-motion'
import { Link2, Trash2, CheckCircle2 } from 'lucide-react'
import { Avatar, timeAgo } from './ui'

export default function ReportCard({ report: r, canDelete, onDelete, showTask = true, i = 0 }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.3 }}
      className="rounded-[20px] bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5"
    >
      <header className="flex items-start gap-3">
        <Avatar name={r.user_name} src={r.user_avatar} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">{r.user_name}</div>
          <div className="text-[12px] text-[var(--color-text-tertiary)] flex flex-wrap items-center gap-x-1.5">
            {showTask && (
              r.task_title ? (
                <span className="inline-flex items-center gap-1">
                  {r.team_color && <span className="w-2 h-2 rounded-full" style={{ background: r.team_color }} />}
                  {r.task_title}
                  {r.task_status === 'done' && <CheckCircle2 size={12} className="text-[var(--color-success)]" />}
                </span>
              ) : <span>Апдейт без задачи</span>
            )}
            {showTask && <span>·</span>}
            <span>{timeAgo(r.created_at)}</span>
          </div>
        </div>
        {canDelete && (
          <button onClick={() => onDelete(r)} aria-label="Удалить отчёт" className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">
            <Trash2 size={14} />
          </button>
        )}
      </header>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-1">Сделано</div>
          <p className="text-[14px] leading-relaxed whitespace-pre-line">{r.did}</p>
        </div>
        {r.result && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-1">Результат</div>
            <p className="text-[14px] leading-relaxed whitespace-pre-line">{r.result}</p>
          </div>
        )}
      </div>

      {r.link && (
        <a href={r.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-brand)] hover:underline break-all">
          <Link2 size={13} /> {r.link.replace(/^https?:\/\//, '').slice(0, 60)}
        </a>
      )}
    </motion.article>
  )
}
