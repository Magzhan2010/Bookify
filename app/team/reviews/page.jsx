'use client'

import { PageHeader } from '../../../components/team/ui'
import { useTeam } from '../../../components/team/TeamContext'
import ReviewQueue from '../../../components/ReviewQueue'

export default function TeamReviews() {
  const { me } = useTeam()
  return (
    <div>
      <PageHeader
        eyebrow="Ученики"
        title="Отзывы"
        subtitle="Прочитай отзыв, отметь бонусы за видео или TEDx и одобри — ученик сразу получит монеты. Если отклоняешь, напиши, что исправить."
      />
      <ReviewQueue meId={me?.id} />
    </div>
  )
}
