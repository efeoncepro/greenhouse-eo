import type { Metadata } from 'next'

import TalentReviewQueueView from '@/views/greenhouse/admin/TalentReviewQueueView'

export const metadata: Metadata = { title: 'Verificación de talento | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const TalentReviewPage = () => <TalentReviewQueueView />

export default TalentReviewPage
