import { getLotDropdowns } from '@/lib/actions/lots'
import { LotFormPage } from '../lot-form'

export const dynamic = 'force-dynamic'

export default async function CreateLotPage() {
  const { categories, merchants, groups } = await getLotDropdowns()

  return (
    <LotFormPage
      categories={categories}
      merchants={merchants}
      groups={groups}
    />
  )
}
