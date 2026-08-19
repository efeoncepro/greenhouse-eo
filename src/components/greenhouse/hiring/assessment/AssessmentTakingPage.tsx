import { getLocale } from 'next-intl/server'

import { CareersPublicShell } from '@/components/greenhouse/careers/CareersPublicShell'
import { getMicrocopy } from '@/lib/copy'
import { normalizeLocale } from '@/i18n/locales'
import { resolvePublicAssessmentViewByToken } from '@/lib/hiring/assessment'

import AssessmentTakingClient from './AssessmentTakingClient'

interface AssessmentTakingPageProps {
  token?: string
  initialAssessment?: Awaited<ReturnType<typeof resolvePublicAssessmentViewByToken>>
}

const AssessmentTakingPage = async ({ token, initialAssessment }: AssessmentTakingPageProps) => {
  const locale = normalizeLocale(await getLocale()) ?? undefined
  const copy = getMicrocopy(locale)

  const assessment = initialAssessment === undefined && token
    ? await resolvePublicAssessmentViewByToken(token).catch(() => null)
    : initialAssessment ?? null

  return (
    <CareersPublicShell copy={copy.careers} locale={locale ?? 'es-CL'} backHref='/public/careers' backLabel={copy.careers.header.backToJobs}>
      <AssessmentTakingClient token={token} copy={copy.hiringAssessment} initialAssessment={assessment} />
    </CareersPublicShell>
  )
}

export default AssessmentTakingPage
