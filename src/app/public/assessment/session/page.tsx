import { cookies } from 'next/headers'

import type { Metadata } from 'next'

import AssessmentTakingPage from '@/components/greenhouse/hiring/assessment/AssessmentTakingPage'
import { buildPublicAssessmentViewWithClient } from '@/lib/hiring/assessment/public-taking'
import { getAssessmentByIdWithClient } from '@/lib/hiring/assessment/instances'
import { PUBLIC_ASSESSMENT_SESSION_COOKIE } from '@/lib/hiring/assessment/public-session/http'
import { withPublicAssessmentSession } from '@/lib/hiring/assessment/public-session/service'

export const metadata: Metadata = {
  title: 'Evaluación | Careers | Greenhouse',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}
export const dynamic = 'force-dynamic'

interface PublicAssessmentSessionPageProps {
  searchParams: Promise<{ unavailable?: string | string[] }>
}

export default async function PublicAssessmentSessionPage({ searchParams }: PublicAssessmentSessionPageProps) {
  const unavailable = (await searchParams).unavailable

  if (unavailable === '1' || (Array.isArray(unavailable) && unavailable.includes('1'))) {
    return <AssessmentTakingPage initialAssessment={null} />
  }

  const cookieStore = await cookies()
  const rawSession = cookieStore.get(PUBLIC_ASSESSMENT_SESSION_COOKIE)?.value ?? ''

  const assessment = await withPublicAssessmentSession(rawSession, async (client, session) => {
    const current = await getAssessmentByIdWithClient(client, session.assessmentId)

    return current ? buildPublicAssessmentViewWithClient(client, current) : null
  }).catch(() => null)

  return <AssessmentTakingPage initialAssessment={assessment} />
}
