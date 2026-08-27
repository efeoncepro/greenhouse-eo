import { notFound, redirect } from 'next/navigation'

import { getLocale } from 'next-intl/server'

import type { Metadata } from 'next'

import Application360View from '@/views/greenhouse/hiring/Application360View'
import { can } from '@/lib/entitlements/runtime'
import {
  getHiringApplicationById,
  getHiringApplicationQueueNavigation,
  getHiringDeskSnapshot,
} from '@/lib/hiring'
import { listHiringApplicationNotes, type HiringApplicationNotesView } from '@/lib/hiring/application-notes'
import {
  buildCandidateDocumentsViewModel,
  canAccessHiringCandidateDocument,
  resolveCandidateDocuments,
} from '@/lib/hiring/documents'
import { getHiringHandoffByApplicationId } from '@/lib/hiring/handoff'
import { captureWithDomain } from '@/lib/observability/capture'
import { listAssessmentsForApplication } from '@/lib/hiring/assessment'
import {
  getAssessmentAccessRecoveryAvailability,
  type AssessmentAccessRecoveryAvailability,
} from '@/lib/hiring/assessment/access-recovery'
import { resolveUserDisplayNames } from '@/lib/identity/user-display-names'
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

  // TASK-1737 — capability de escritura del expediente resuelta server-side; la UI solo
  // decide si dibuja affordances (composer / CTAs del dossier).
  const canAnnotate = can(tenant, 'hiring.application.annotate', 'execute', 'tenant')
  const canScore = can(tenant, 'hiring.assessment.score', 'execute', 'tenant')

  // TASK-1747 — las dos puertas de la recuperación son INDEPENDIENTES: quien puede reenviar por
  // correo no necesariamente puede revelar un enlace (el enlace se entrega en mano y exige
  // verificar identidad). Se resuelven acá porque el cliente NUNCA decide permisos.
  const canRecoverAccessByEmail = can(tenant, 'hiring.assessment.recover_access_email', 'execute', 'tenant')
  const canRevealAccessLink = can(tenant, 'hiring.assessment.reveal_access_link', 'execute', 'tenant')
  const canRecoverAccess = canRecoverAccessByEmail || canRevealAccessLink

  const [locale, snapshot, queueNavigation, assessments, handoff, documents, notesView] = await Promise.all([
    getLocale(),
    getHiringDeskSnapshot({
      openingId: application.openingId,
      focusApplicationId: applicationId,
      openingLimit: 80,
      applicationLimit: 120,
    }),
    getHiringApplicationQueueNavigation(applicationId),
    canReadAssessment ? listAssessmentsForApplication(applicationId) : Promise.resolve([]),
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
    // TASK-1737 — notas del expediente server-fed. El gate anti-anclaje vive en el reader
    // (viewer-aware): si el operador tiene scorecard propio abierto, el payload YA viene
    // filtrado. `null` = el reader FALLÓ (≠ expediente vacío): el tab degrada honesto.
    listHiringApplicationNotes(applicationId, tenant.userId).catch((error: unknown): HiringApplicationNotesView | null => {
      captureWithDomain(error, 'hiring', {
        tags: { source: 'hiring:application-360-expediente-notes' },
        extra: { applicationId },
      })

      return null
    }),
  ])

  const item = snapshot.applications.find((entry) => entry.application.applicationId === applicationId)

  if (!item) notFound()

  /*
   * TASK-1747 — disponibilidad de recuperación por test.
   *
   * Sólo se consulta para `candidate_test` (un scorecard de evaluador no tiene acceso que
   * recuperar) y sólo si el operador tiene al menos una de las dos puertas: preguntar por algo
   * que igual no vas a poder hacer es trabajo de base gratis.
   *
   * `null` significa que la LECTURA FALLÓ, que no es lo mismo que "no se puede recuperar": la
   * tarjeta lo dice en vez de esconder el cluster, porque un affordance ausente es indistinguible
   * de uno prohibido y deja al operador sin saber que existe el camino.
   */
  const recoveryTargets = canRecoverAccess
    ? assessments.filter((assessment) => assessment.method === 'candidate_test')
    : []

  const recoveryAvailability: Record<string, AssessmentAccessRecoveryAvailability | null> =
    Object.fromEntries(
      await Promise.all(
        recoveryTargets.map(async (assessment) => {
          try {
            return [assessment.assessmentId, await getAssessmentAccessRecoveryAvailability(assessment.assessmentId)] as const
          } catch (error: unknown) {
            captureWithDomain(error, 'hiring', {
              tags: { source: 'hiring:application-360-recovery-availability' },
              extra: { applicationId, assessmentId: assessment.assessmentId },
            })

            return [assessment.assessmentId, null] as const
          }
        }),
      ),
    )

  // Nombres de autores de nota (fallback honesto al id en la UI cuando no resuelve).
  const noteAuthorNames = notesView
    ? Object.fromEntries(await resolveUserDisplayNames(notesView.notes.map((note) => note.authorUserId)))
    : {}

  return (
    <Application360View
      key={applicationId}
      copy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringDesk}
      assessmentCopy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringAssessment}
      initialItem={item}
      queueNavigation={queueNavigation}
      initialAssessments={assessments}
      canAuthorAssessment={canAuthorAssessment}
      canRecoverAccessByEmail={canRecoverAccessByEmail}
      canRevealAccessLink={canRevealAccessLink}
      recoveryAvailability={recoveryAvailability}
      initialHandoff={handoff}
      canApproveHandoff={canApproveHandoff}
      documents={documents}
      documentsFailed={canReadDocuments && documents === null}
      canRevealIdentity={can(tenant, 'hiring.candidate.reveal_identity', 'read', 'tenant')}
      notes={notesView?.notes ?? null}
      notesFailed={notesView === null}
      hiddenNoteCount={notesView?.hiddenNoteCount ?? 0}
      viewerBlind={notesView?.viewerBlindUntilScorecardSubmitted ?? false}
      canAnnotate={canAnnotate}
      canScore={canScore}
      noteAuthorNames={noteAuthorNames}
    />
  )
}
