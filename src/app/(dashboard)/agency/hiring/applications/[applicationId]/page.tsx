import { notFound, redirect } from 'next/navigation'

import { getLocale } from 'next-intl/server'

import type { Metadata } from 'next'

import Application360View from '@/views/greenhouse/hiring/Application360View'
import { can } from '@/lib/entitlements/runtime'
import { getHiringApplicationById, getHiringDeskSnapshot } from '@/lib/hiring'
import { getHiringHandoffByApplicationId } from '@/lib/hiring/handoff'
import { listAssessmentsForApplication, listTemplates } from '@/lib/hiring/assessment'
import { getMicrocopy } from '@/lib/copy'
import { normalizeLocale } from '@/i18n/locales'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Postulación 360 | Hiring Desk | Greenhouse' }
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ applicationId: string }>
}

export default async function HiringApplicationPage({ params }: Props) {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'gestion.hiring_application_detail',
    fallback: false,
  })

  if (!hasAccess || !can(tenant, 'hiring.application.read', 'read', 'tenant')) redirect('/401')

  const { applicationId } = await params
  const application = await getHiringApplicationById(applicationId)

  if (!application) notFound()

  const canReadAssessment = can(tenant, 'hiring.assessment.read', 'read', 'tenant')
  const canAuthorAssessment = can(tenant, 'hiring.assessment.author', 'create', 'tenant')
  const canApproveHandoff = can(tenant, 'hiring.handoff.approve', 'execute', 'tenant')

  const [locale, snapshot, assessments, templates, handoff] = await Promise.all([
    getLocale(),
    getHiringDeskSnapshot({ openingId: application.openingId, openingLimit: 80, applicationLimit: 120 }),
    canReadAssessment ? listAssessmentsForApplication(applicationId) : Promise.resolve([]),
    canAuthorAssessment ? listTemplates() : Promise.resolve([]),
    getHiringHandoffByApplicationId(applicationId),
  ])

  const item = snapshot.applications.find((entry) => entry.application.applicationId === applicationId)

  if (!item) notFound()

  return (
    <Application360View
      copy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringDesk}
      assessmentCopy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringAssessment}
      initialItem={item}
      initialAssessments={assessments}
      templates={templates}
      initialHandoff={handoff}
      canApproveHandoff={canApproveHandoff}
    />
  )
}
