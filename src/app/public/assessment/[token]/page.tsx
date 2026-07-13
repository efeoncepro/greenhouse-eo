import type { Metadata } from 'next'

import AssessmentTakingPage from '@/components/greenhouse/hiring/assessment/AssessmentTakingPage'

export const metadata: Metadata = { title: 'Evaluación | Careers | Greenhouse' }
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PublicAssessmentPage({ params }: Props) {
  const { token } = await params

  return <AssessmentTakingPage token={token} />
}
