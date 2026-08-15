import { notFound, redirect } from 'next/navigation'

import { getLocale } from 'next-intl/server'

import type { Metadata } from 'next'

import Application360View from '@/views/greenhouse/hiring/Application360View'
import { can } from '@/lib/entitlements/runtime'
import { getHiringApplicationById, getHiringDeskSnapshot } from '@/lib/hiring'
import {
  buildCandidateDocumentsViewModel,
  canAccessHiringCandidateDocument,
  resolveCandidateDocuments,
} from '@/lib/hiring/documents'
import { getHiringHandoffByApplicationId } from '@/lib/hiring/handoff'
import { captureWithDomain } from '@/lib/observability/capture'
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

  // TASK-1715 — el paquete documental se resuelve en servidor. `resolveCandidateDocuments`
  // es `server-only` y es un reader canónico del 360: NO degrada en silencio. Por eso el
  // fallo se captura acá y viaja como `documentsFailed`, para que el panel diga que falló
  // en vez de mostrar un candidato "sin documentos" que es indistinguible del vacío real.
  const canReadDocuments = canAccessHiringCandidateDocument(tenant)

  const [locale, snapshot, assessments, templates, handoff, documents] = await Promise.all([
    getLocale(),
    getHiringDeskSnapshot({ openingId: application.openingId, openingLimit: 80, applicationLimit: 120 }),
    canReadAssessment ? listAssessmentsForApplication(applicationId) : Promise.resolve([]),
    canAuthorAssessment ? listTemplates() : Promise.resolve([]),
    getHiringHandoffByApplicationId(applicationId),
    canReadDocuments
      ? resolveCandidateDocuments({ candidateFacetId: application.candidateFacetId })
          .then(buildCandidateDocumentsViewModel)
          .catch((error: unknown) => {
            captureWithDomain(error, 'hiring', {
              tags: { source: 'hiring:application-360-documents' },
              extra: { applicationId },
            })

            return null
          })
      : Promise.resolve(null),
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
      documents={documents}
      documentsFailed={canReadDocuments && documents === null}
      canRevealIdentity={can(tenant, 'hiring.candidate.reveal_identity', 'read', 'tenant')}
    />
  )
}
