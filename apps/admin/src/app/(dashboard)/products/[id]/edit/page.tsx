import { notFound } from 'next/navigation'
import { getLot, getLotDropdowns } from '@/lib/actions/lots'
import { LotFormPage } from '../../lot-form'

export const dynamic = 'force-dynamic'

export default async function EditLotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [lot, { categories, merchants, groups }] = await Promise.all([
    getLot(id),
    getLotDropdowns(),
  ])

  if (!lot) notFound()

  return (
    <LotFormPage
      editing={lot}
      categories={categories}
      merchants={merchants}
      groups={groups}
    />
  )
}
