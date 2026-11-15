'use client'

import { useCallback, useEffect, useState } from 'react'
import { PageHeader, Segmented, api } from '../../../components/team/ui'
import { useTeam } from '../../../components/team/TeamContext'
import ReviewQueue from '../../../components/ReviewQueue'
import ReviewHistory from '../../../components/ReviewHistory'

/** Отзывы: три вкладки — сдали, на проверке, отклонённые. */
export default function TeamReviews() {
  const { me } = useTeam()
  const [tab, setTab] = useState('pending')
  const [counts, setCounts] = useState({})

  const loadCounts = useCallback(() => {
    api('/api/librarian/reviews?counts=1').then(setCounts).catch(() => {})
  }, [])
  useEffect(() => { loadCounts() }, [loadCounts, tab])

  const SUBTITLES = {
    approved: 'Все одобренные отзывы: кто сдал, какую книгу и кто проверил. Нажми на строку, чтобы прочитать.',
    pending: 'Прочитай отзыв, отметь бонусы за видео или TEDx и одобри — ученик сразу получит монеты. Если отклоняешь, напиши, что исправить.',
    rejected: 'Отзывы, которые вернули на доработку, с причиной. Когда ученик перепишет, отзыв снова появится «На проверке».'
  }

  return (
    <div>
      <PageHeader eyebrow="Ученики" title="Отзывы" subtitle={SUBTITLES[tab]} />
      <div className="mb-6">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'approved', label: 'Сдали', count: counts.approved },
            { value: 'pending', label: 'На проверке', count: counts.pending },
            { value: 'rejected', label: 'Отклонённые', count: counts.rejected }
          ]}
        />
      </div>
      {tab === 'pending'
        ? <ReviewQueue meId={me?.id} onChanged={loadCounts} />
        : <ReviewHistory key={tab} status={tab} />}
    </div>
  )
}
