'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useArea } from '../../../lib/useArea'
import TvLink from '../../../components/librarian/TvLink'
import { motion } from 'framer-motion'
import {
  ArrowUpRight, ArrowDownRight, Minus, BookOpen, Users, MessageSquare, Coins, Gift, Clock,
  AlertTriangle, Inbox, Loader2, Table2, LineChart
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

const EASE = [0.2, 0.8, 0.2, 1]
const PERIODS = [
  { days: 7, label: 'Неделя' },
  { days: 30, label: 'Месяц' },
  { days: 90, label: 'Квартал' },
  { days: 365, label: 'Год' }
]
const SERIES = [
  { key: 'issues', label: 'Выдачи', color: 'var(--chart-1)' },
  { key: 'returns', label: 'Возвраты', color: 'var(--chart-2)' },
  { key: 'reviews', label: 'Отзывы', color: 'var(--chart-3)' }
]
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8) // 8:00–19:00

export default function AnalyticsPage() {
  const { team, base } = useArea()
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hidden, setHidden] = useState({})
  const [asTable, setAsTable] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    const token = localStorage.getItem('token')
    fetch(`/api/librarian/analytics/advanced?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Ошибка')
        if (alive) setData(d)
      })
      .catch(e => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [days])

  const k = data?.kpi || {}
  const s = data?.snapshot || {}

  return (
    <div className="max-w-[1300px] mx-auto space-y-6">
      {/* Заголовок + период */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">Аналитика</h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-1">
            Как читает школа — в сравнении с предыдущим периодом такой же длины.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <TvLink />
        <div className="flex p-1 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] w-fit">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`relative px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                days === p.days ? 'text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {days === p.days && (
                <motion.span layoutId="period-pill" className="absolute inset-0 rounded-full bg-[var(--color-brand)]" transition={{ duration: 0.4, ease: EASE }} />
              )}
              <span className="relative">{p.label}</span>
            </button>
          ))}
        </div>
        </div>
      </div>

      {error && <div className="p-4 rounded-2xl bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-[14px]">{error}</div>}

      {!data && loading ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[var(--color-brand)]" /></div>
      ) : data && (
        <div className={`space-y-6 transition-opacity duration-300 ${loading ? 'opacity-50' : ''}`}>
          {/* Показатели периода */}
          <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi icon={BookOpen} label="Выдано книг" value={k.issues} prev={k.issues_prev} i={0} />
            <Kpi icon={BookOpen} label="Возвращено" value={k.returns} prev={k.returns_prev} i={1} />
            <Kpi icon={Users} label="Активных читателей" value={k.readers} prev={k.readers_prev} i={2} />
            <Kpi icon={MessageSquare} label="Отзывов" value={k.reviews} prev={k.reviews_prev} i={3} />
            <Kpi icon={Coins} label="Монет начислено" value={k.coins} prev={k.coins_prev} i={4} />
            <Kpi icon={Clock} label="Дней на книгу" value={k.avg_days ?? '—'} prev={k.avg_days_prev} i={5} lowerIsBetter suffix="" />
          </section>

          {/* Сейчас */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <NowTile label="На руках сейчас" value={s.on_hands} href={team ? undefined : "/librarian/returns"} />
            <NowTile label="Просрочено" value={s.overdue} href={team ? undefined : "/librarian/lookup?overdue=true"} alert={s.overdue > 0} icon={AlertTriangle} />
            <NowTile label="Заявок ждут" value={s.open_requests} href={team ? undefined : "/librarian/requests"} icon={Inbox} />
            <NowTile label="Отзывов и призов ждут" value={(s.pending_reviews || 0) + (s.pending_prizes || 0)} href={team ? undefined : "/librarian"} icon={Gift} />
          </section>

          {/* Активность во времени */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Активность</h3>
                <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">
                  По {data.bucket === 'day' ? 'дням' : data.bucket === 'week' ? 'неделям' : 'месяцам'} · нажми на ряд в легенде, чтобы скрыть его
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {SERIES.map(sr => (
                  <button
                    key={sr.key}
                    onClick={() => setHidden(h => ({ ...h, [sr.key]: !h[sr.key] }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-opacity ${
                      hidden[sr.key] ? 'opacity-40 border-[var(--color-border)]' : 'border-[var(--color-border)]'
                    } text-[var(--color-text-secondary)]`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: sr.color }} />
                    {sr.label}
                    <span className="text-[var(--color-text-primary)] font-semibold tabular-nums">
                      {data.timeline.reduce((a, r) => a + r[sr.key], 0)}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => setAsTable(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]"
                  title={asTable ? 'Показать график' : 'Показать таблицей'}
                >
                  {asTable ? <LineChart size={13} /> : <Table2 size={13} />} {asTable ? 'График' : 'Таблица'}
                </button>
              </div>
            </div>
            {asTable ? (
              <div className="max-h-80 overflow-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full text-[13px]">
                  <thead className="bg-[var(--color-bg-soft)] text-[var(--color-text-tertiary)] sticky top-0">
                    <tr><th className="text-left px-3 py-2 font-medium">Период</th>{SERIES.map(sr => <th key={sr.key} className="text-right px-3 py-2 font-medium">{sr.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.timeline.map(r => (
                      <tr key={r.bucket} className="border-t border-[var(--color-border)]">
                        <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">{fmtBucket(r.bucket, data.bucket, true)}</td>
                        {SERIES.map(sr => <td key={sr.key} className="px-3 py-1.5 text-right tabular-nums text-[var(--color-text-primary)]">{r[sr.key]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      {SERIES.map(sr => (
                        <linearGradient key={sr.key} id={`g-${sr.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={sr.color} stopOpacity={0.22} />
                          <stop offset="100%" stopColor={sr.color} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      tickFormatter={b => fmtBucket(b, data.bucket)}
                      tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                      axisLine={false} tickLine={false} minTickGap={20}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      labelFormatter={b => fmtBucket(b, data.bucket, true)}
                      cursor={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1, strokeDasharray: '3 3' }}
                      contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                      labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                      itemStyle={{ color: 'var(--color-text-secondary)' }}
                    />
                    {SERIES.filter(sr => !hidden[sr.key]).map(sr => (
                      <Area
                        key={sr.key}
                        type="monotone"
                        dataKey={sr.key}
                        name={sr.label}
                        stroke={sr.color}
                        strokeWidth={2}
                        fill={`url(#g-${sr.key})`}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-bg-card)' }}
                        animationDuration={900}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Тепловая карта */}
            <Card>
              <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Когда берут книги</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 mb-4">День недели × час, чем темнее — тем больше выдач</p>
              <Heatmap rows={data.heatmap} />
            </Card>

            {/* Воронка */}
            <Card>
              <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Вовлечённость учеников</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 mb-4">За всё время: сколько учеников дошли до каждого шага</p>
              <Funnel f={data.funnel} />
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Популярные книги</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 mb-4">Чаще всего выдавали за период</p>
              <RankedList
                items={data.top_books.map(b => ({ key: b.id, label: b.title, sub: b.author, n: b.n, img: b.cover_url, href: `/books/${b.id}` }))}
                unit="выдач"
                empty="За период книг не выдавали"
              />
            </Card>
            <Card>
              <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Жанры</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 mb-4">Что выбирают за период</p>
              <RankedList
                items={data.genres.map(g => ({ key: g.genre, label: g.genre, n: g.n }))}
                unit="выдач"
                showShare
                empty="Нет данных за период"
              />
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Классы */}
            <Card className="lg:col-span-2">
              <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Классы</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 mb-4">Доля учеников, бравших книги за период, и выдачи на ученика</p>
              <ClassTable rows={data.classes} />
            </Card>
            {/* Длительность */}
            <Card>
              <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Сколько читают</h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 mb-4">Время от выдачи до возврата</p>
              <RankedList items={data.duration.map(d => ({ key: d.label, label: d.label, n: d.n }))} unit="книг" keepOrder showShare empty="Возвратов за период нет" />
            </Card>
          </div>

          <Card>
            <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Самые активные читатели периода</h3>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 mb-4">По числу сданных книг</p>
            {data.top_readers.length === 0 ? (
              <div className="text-[13px] text-[var(--color-text-tertiary)] py-6 text-center">За период книг не сдавали</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.top_readers.map((r, i) => (
                  <Link key={r.id} href={`${base}/students/${r.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-border)] transition-colors">
                    <span className="w-7 text-center text-[15px] font-semibold text-[var(--color-text-tertiary)]">{['🥇', '🥈', '🥉'][i] || i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium text-[var(--color-text-primary)] truncate">{r.name}</div>
                      <div className="text-[12px] text-[var(--color-text-tertiary)]">{r.class_name ? `${r.class_name} класс` : '—'}</div>
                    </div>
                    <span className="text-[18px] font-semibold tabular-nums text-[var(--color-text-primary)]">{r.n}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Card({ children, className = '' }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={`bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[24px] p-5 sm:p-6 ${className}`}
    >
      {children}
    </motion.section>
  )
}

function Kpi({ icon: Icon, label, value, prev, i, lowerIsBetter = false }) {
  const v = typeof value === 'number' ? value : null
  const p = typeof prev === 'number' ? prev : null
  let delta = null
  if (v !== null && p !== null) delta = p === 0 ? (v > 0 ? 100 : 0) : Math.round(((v - p) / p) * 100)
  const good = delta === null || delta === 0 ? null : (lowerIsBetter ? delta < 0 : delta > 0)
  const Arrow = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04, duration: 0.5, ease: EASE }}
      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[20px] p-4"
    >
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)]">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-2 text-[30px] font-semibold tracking-tight leading-none tabular-nums text-[var(--color-text-primary)]">
        {value ?? 0}
      </div>
      <div className="mt-2 h-5 flex items-center gap-1 text-[12px]">
        {delta !== null && (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${
              good === null ? 'text-[var(--color-text-tertiary)]' : good ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
            }`}
            title={`Предыдущий период: ${p}`}
          >
            <Arrow size={13} /> {Math.abs(delta)}%
          </span>
        )}
        <span className="text-[var(--color-text-tertiary)]">{p !== null ? `было ${p}` : ''}</span>
      </div>
    </motion.div>
  )
}

function NowTile({ label, value, href, alert, icon: Icon }) {
  const Tag = href ? Link : 'div'
  return (
    <Tag
      href={href}
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-[18px] border transition-colors ${
        alert
          ? 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 hover:bg-[var(--color-danger)]/10'
          : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-soft)]'
      }`}
    >
      <span className="text-[13px] text-[var(--color-text-secondary)] flex items-center gap-1.5">
        {Icon && <Icon size={14} className={alert ? 'text-[var(--color-danger)]' : ''} />} {label}
      </span>
      <span className={`text-[20px] font-semibold tabular-nums ${alert ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'}`}>
        {value ?? 0}
      </span>
    </Tag>
  )
}

function Heatmap({ rows }) {
  const { grid, max } = useMemo(() => {
    const g = {}
    let m = 0
    rows.forEach(r => {
      const key = `${r.dow}-${r.hour}`
      g[key] = (g[key] || 0) + r.n
      m = Math.max(m, g[key])
    })
    return { grid: g, max: m }
  }, [rows])

  if (!max) return <div className="text-[13px] text-[var(--color-text-tertiary)] py-10 text-center">За период выдач не было</div>

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-[3px] min-w-full" style={{ gridTemplateColumns: `28px repeat(${HOURS.length}, minmax(22px, 1fr))` }}>
        <div />
        {HOURS.map(h => (
          <div key={h} className="text-[10px] text-center text-[var(--color-text-tertiary)]">{h}</div>
        ))}
        {DOW.map((d, di) => (
          <div key={d} className="contents">
            <div className="text-[11px] text-[var(--color-text-tertiary)] flex items-center">{d}</div>
            {HOURS.map(h => {
              const n = grid[`${di + 1}-${h}`] || 0
              const a = n ? 0.15 + (n / max) * 0.85 : 0
              return (
                <div
                  key={h}
                  title={`${d}, ${h}:00–${h + 1}:00 — ${n} выдач`}
                  className="h-6 rounded-[5px] transition-transform hover:scale-110"
                  style={{ background: n ? `rgba(var(--chart-seq), ${a})` : 'var(--color-bg-soft)' }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function Funnel({ f }) {
  const steps = [
    { label: 'Зарегистрированы', n: f.students },
    { label: 'Брали книгу', n: f.borrowed },
    { label: 'Сдали книгу', n: f.finished },
    { label: 'Написали отзыв', n: f.reviewed },
    { label: 'Получили монеты', n: f.earned },
    { label: 'Обменяли на приз', n: f.prized }
  ]
  const top = Math.max(1, steps[0].n)
  return (
    <div className="space-y-2.5">
      {steps.map((st, i) => {
        const pct = Math.round((st.n / top) * 100)
        return (
          <div key={st.label} title={`${st.label}: ${st.n} (${pct}% от всех)`}>
            <div className="flex justify-between text-[13px] mb-1">
              <span className="text-[var(--color-text-secondary)]">{st.label}</span>
              <span className="tabular-nums text-[var(--color-text-primary)] font-medium">{st.n} <span className="text-[var(--color-text-tertiary)] font-normal">· {pct}%</span></span>
            </div>
            <div className="h-2.5 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.08, duration: 0.9, ease: EASE }}
                className="h-full rounded-full"
                style={{ background: `rgba(var(--chart-seq), ${1 - i * 0.12})` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RankedList({ items, unit, empty, showShare = false, keepOrder = false }) {
  const total = items.reduce((a, b) => a + b.n, 0)
  const max = Math.max(1, ...items.map(i => i.n))
  if (!items.length || !total) return <div className="text-[13px] text-[var(--color-text-tertiary)] py-8 text-center">{empty}</div>
  const list = keepOrder ? items : [...items].sort((a, b) => b.n - a.n)
  return (
    <div className="space-y-3">
      {list.map((it, i) => {
        const Row = it.href ? Link : 'div'
        return (
          <Row key={it.key} href={it.href} className="flex items-center gap-3 group" title={`${it.label}: ${it.n} ${unit}`}>
            {it.img !== undefined && (
              <div className="w-8 h-11 rounded-md bg-[var(--color-bg-soft)] overflow-hidden shrink-0">
                {it.img && <img src={it.img} alt="" className="w-full h-full object-cover" loading="lazy" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-3 text-[13px] mb-1">
                <span className="truncate text-[var(--color-text-primary)] group-hover:text-[var(--color-brand)] transition-colors">{it.label}</span>
                <span className="tabular-nums text-[var(--color-text-secondary)] whitespace-nowrap">
                  {it.n}{showShare ? ` · ${Math.round((it.n / total) * 100)}%` : ''}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(it.n / max) * 100}%` }}
                  transition={{ delay: i * 0.05, duration: 0.8, ease: EASE }}
                  className="h-full rounded-full bg-[var(--chart-1)]"
                />
              </div>
              {it.sub && <div className="text-[11px] text-[var(--color-text-tertiary)] truncate mt-0.5">{it.sub}</div>}
            </div>
          </Row>
        )
      })}
    </div>
  )
}

function ClassTable({ rows }) {
  if (!rows.length) return <div className="text-[13px] text-[var(--color-text-tertiary)] py-8 text-center">Классы не указаны</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="text-[var(--color-text-tertiary)] text-left">
          <tr>
            <th className="font-medium pb-2">Класс</th>
            <th className="font-medium pb-2 text-right">Учеников</th>
            <th className="font-medium pb-2 pl-4">Участие</th>
            <th className="font-medium pb-2 text-right">Выдачи</th>
            <th className="font-medium pb-2 text-right">Возвраты</th>
            <th className="font-medium pb-2 text-right">На ученика</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.class_name} className="border-t border-[var(--color-border)]">
              <td className="py-2.5 font-medium text-[var(--color-text-primary)]">{r.class_name}</td>
              <td className="py-2.5 text-right tabular-nums text-[var(--color-text-secondary)]">{r.students}</td>
              <td className="py-2.5 pl-4 w-[35%]">
                <div className="flex items-center gap-2" title={`${r.readers} из ${r.students} брали книги`}>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.participation}%` }}
                      transition={{ duration: 0.8, ease: EASE }}
                      className="h-full rounded-full bg-[var(--chart-2)]"
                    />
                  </div>
                  <span className="tabular-nums text-[var(--color-text-secondary)] w-10 text-right">{r.participation}%</span>
                </div>
              </td>
              <td className="py-2.5 text-right tabular-nums text-[var(--color-text-primary)]">{r.issues}</td>
              <td className="py-2.5 text-right tabular-nums text-[var(--color-text-primary)]">{r.returns}</td>
              <td className="py-2.5 text-right tabular-nums font-medium text-[var(--color-text-primary)]">{r.per_student}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function fmtBucket(b, bucket, long = false) {
  if (!b) return ''
  const [y, m, d] = String(b).split('-').map(Number)
  if (bucket === 'month') return long ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1]
  if (bucket === 'week') return long ? `неделя с ${d} ${MONTHS[m - 1]}` : `${d} ${MONTHS[m - 1]}`
  if (long) {
    return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
  }
  return `${d} ${MONTHS[m - 1]}`
}
