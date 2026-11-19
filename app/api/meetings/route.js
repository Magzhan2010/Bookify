import { NextResponse } from 'next/server'
import pool from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { resolveAudience, fmtWhen, notifyMeeting } from '../../../lib/meetings'

const canCall = me => me.platform_role === 'lead' || me.role === 'librarian'

/**
 * GET /api/meetings — мои ближайшие собрания (куда меня позвали) с моим ответом.
 * GET /api/meetings?manage=1 — для тимлида и библиотекаря: все собрания с ответами.
 * GET /api/meetings?options=1 — группы и классы для формы.
 */
export async function GET(req) {
  const guard = await requireAuth(req)
  if (!guard.ok) return guard.response
  const me = guard.payload
  const url = new URL(req.url)

  try {
    if (url.searchParams.get('options')) {
      if (!canCall(me)) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      const [teams, classes, counts] = await Promise.all([
        pool.query(`SELECT t.id, t.name, t.color, (SELECT COUNT(*) FROM team_memberships m WHERE m.team_id = t.id)::int AS n
                      FROM teams t ORDER BY t.created_at`),
        pool.query(`SELECT class_name, COUNT(*)::int AS n FROM users
                     WHERE role = 'student' AND class_name IS NOT NULL AND class_name <> ''
                     GROUP BY class_name ORDER BY class_name`),
        pool.query(`SELECT (SELECT COUNT(*) FROM team_members)::int AS team,
                           (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS students,
                           (SELECT COUNT(*) FROM users WHERE role = 'teacher')::int AS teachers`)
      ])
      return NextResponse.json({ teams: teams.rows, classes: classes.rows, counts: counts.rows[0] })
    }

    const manage = url.searchParams.get('manage') && canCall(me)

    // Куда позвали меня
    const mine = await pool.query(
      `SELECT m.id, m.title, m.place, m.starts_at, m.note, m.audience_label, m.cancelled_at,
              u.name AS created_by_name, i.response
         FROM meeting_invites i
         JOIN meetings m ON m.id = i.meeting_id
         LEFT JOIN users u ON u.id = m.created_by
        WHERE i.user_id = $1 AND m.starts_at > NOW() - INTERVAL '2 hours'
          AND (m.cancelled_at IS NULL OR m.cancelled_at > NOW() - INTERVAL '1 day')
        ORDER BY m.starts_at ASC LIMIT 20`,
      [me.id]
    )
    if (!manage) return NextResponse.json({ mine: mine.rows })

    const all = await pool.query(
      `SELECT m.id, m.title, m.place, m.starts_at, m.note, m.audience, m.audience_label, m.cancelled_at, m.created_at,
              m.created_by, u.name AS created_by_name,
              COALESCE((SELECT json_agg(json_build_object('id', x.id, 'name', x.name, 'avatar_url', x.avatar_url,
                                                          'class_name', x.class_name, 'response', i.response)
                                        ORDER BY i.responded_at DESC NULLS LAST, x.name)
                          FROM meeting_invites i JOIN users x ON x.id = i.user_id
                         WHERE i.meeting_id = m.id), '[]') AS invites
         FROM meetings m
         LEFT JOIN users u ON u.id = m.created_by
        WHERE m.starts_at > NOW() - INTERVAL '30 days'
        ORDER BY m.starts_at DESC LIMIT 60`
    )
    return NextResponse.json({ mine: mine.rows, all: all.rows })
  } catch (err) {
    console.error('[meetings GET]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}

/**
 * POST /api/meetings — созвать собрание. Только тимлид и библиотекарь.
 * { title, place, starts_at (ISO), note?, audience: { type, team_id?, class_name? } }
 */
export async function POST(req) {
  const guard = await requireAuth(req, ['tasker'])
  if (!guard.ok) return guard.response
  const me = guard.payload

  try {
    const b = await req.json().catch(() => ({}))
    const title = String(b.title || '').trim().slice(0, 120) || 'Собрание'
    const place = String(b.place || '').trim().slice(0, 80) || 'Библиотека'
    const note = String(b.note || '').trim().slice(0, 400) || null
    const startsAt = new Date(b.starts_at)
    if (isNaN(startsAt)) return NextResponse.json({ error: 'Укажи время' }, { status: 400 })
    if (startsAt < Date.now() - 5 * 60000) return NextResponse.json({ error: 'Это время уже прошло' }, { status: 400 })
    if (startsAt > Date.now() + 60 * 86400000) return NextResponse.json({ error: 'Не дальше чем на 2 месяца вперёд' }, { status: 400 })

    const aud = await resolveAudience(pool, b.audience)
    if (aud.error) return NextResponse.json({ error: aud.error }, { status: 400 })
    const ids = aud.ids.filter(id => id !== me.id)
    if (!ids.length) return NextResponse.json({ error: 'Некого позвать: в этой группе никого нет' }, { status: 400 })

    const client = await pool.connect()
    let meeting
    try {
      await client.query('BEGIN')
      const ins = await client.query(
        `INSERT INTO meetings (title, place, starts_at, note, audience, audience_label, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [title, place, startsAt.toISOString(), note, JSON.stringify(b.audience || {}), aud.label, me.id]
      )
      meeting = ins.rows[0]
      await client.query(
        `INSERT INTO meeting_invites (meeting_id, user_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`,
        [meeting.id, ids]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      throw e
    } finally {
      client.release()
    }

    const soon = startsAt - Date.now() < 30 * 60000
    await notifyMeeting(pool, ids, {
      kind: 'meeting',
      title: soon ? `🔔 Собрание прямо сейчас: ${title}` : `Собрание: ${title}`,
      body: `${place}, ${fmtWhen(startsAt)}. Зовёт ${me.name}.${note ? ' ' + note : ''} Ответь, придёшь ли.`,
      dedupe: `meet-${meeting.id}-`
    })

    return NextResponse.json({ ok: true, id: meeting.id, invited: ids.length })
  } catch (err) {
    console.error('[meetings POST]', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
