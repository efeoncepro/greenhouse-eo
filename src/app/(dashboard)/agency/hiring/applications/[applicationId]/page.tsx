import { notFound, redirect } from 'next/navigation'

import { getLocale } from 'next-intl/server'

import type { Metadata } from 'next'

import Application360View from '@/views/greenhouse/hiring/Application360View'
import { can } from '@/lib/entitlements/runtime'
import { getHiringApplicationById, getHiringDeskSnapshot } from '@/lib/hiring'
import { listHiringApplicationNotes, type HiringApplicationNotesView } from '@/lib/hiring/application-notes'
import {
  buildCandidateDocumentsViewModel,
  canAccessHiringCandidateDocument,
  resolveCandidateDocuments,
} from '@/lib/hiring/documents'
import { getHiringHandoffByApplicationId } from '@/lib/hiring/handoff'
import { captureWithDomain } from '@/lib/observability/capture'
import { listAssessmentsForApplication, listTemplates } from '@/lib/hiring/assessment'
import {
  getAssessmentAccessRecoveryAvailability,
  type AssessmentAccessRecoveryAvailability,
} from '@/lib/hiring/assessment/access-recovery/availability'
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

  // TASK-1747 — las dos capabilities de recuperación son role-only y de tier MÁS ESTRECHO que
  // el de lectura: hay operadores que ven la card de assessment y NO pueden recuperar acceso.
  // Se resuelven por separado para no dibujar un affordance que siempre fallaría con 403.
  const canRecoverAccessEmail = can(tenant, 'hiring.assessment.recover_access_email', 'execute', 'tenant')
  const canRevealAccessLink = can(tenant, 'hiring.assessment.reveal_access_link', 'execute', 'tenant')

  const [locale, snapshot, assessments, templates, handoff, documents, notesView] = await Promise.all([
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

  // TASK-1747 — disponibilidad de recuperación por assessment.
  //
  // El reader es `server-only` y su docstring ya lo declara "token-free operator reader used by
  // Application 360": se consume acá y baja como prop, sin endpoint nuevo. Sirve para EXPLICAR
  // antes de intentar — la respuesta del POST colapsa la mayoría de las causas en un solo código,
  // así que sin esto la card no podría distinguir "consentimiento retirado" de "el correo cambió".
  //
  // Sólo se consulta para estados donde recuperar es concebible; en los terminales la card deriva
  // el mensaje del propio `status` y no gasta una query. Medido: máximo 2 assessments por
  // postulación, así que no hace falta un reader por lote.
  //
  // El `reasonCode` NO es cosmético: para un assessment `expired` el único motivo que puede
  // habilitarlo es `token_expired_before_start`. Consultarlo con el default lo mostraría siempre
  // como irrecuperable, que es precisamente la respuesta engañosa que esta task viene a matar.
  const RECOVERABLE_STATUSES = new Set(['assigned', 'sent', 'in_progress', 'expired'])
  const canRecoverAny = canRecoverAccessEmail || canRevealAccessLink

  const recoverableAssessments = canRecoverAny
    ? assessments.filter((entry) => RECOVERABLE_STATUSES.has(entry.status))
    : []

  let accessRecoveryFailed = false

  const accessRecoveryEntries = await Promise.all(
    recoverableAssessments.map(async (entry) => {
      try {
        const availability = await getAssessmentAccessRecoveryAvailability(
          entry.assessmentId,
          entry.status === 'expired' ? 'token_expired_before_start' : 'alternate_channel_requested',
        )

        return [entry.assessmentId, availability] as const
      } catch (error: unknown) {
        captureWithDomain(error, 'hiring', {
          tags: { source: 'hiring:application-360-access-recovery-availability' },
          extra: { applicationId, assessmentId: entry.assessmentId },
        })

        accessRecoveryFailed = true

        return [entry.assessmentId, null] as const
      }
    }),
  )

  // `null` = el reader falló (≠ "no se puede recuperar"): la card lo dice y ofrece reintentar,
  // igual que el precedente de documentos y notas de esta misma página.
  const accessRecovery: Record<string, AssessmentAccessRecoveryAvailability | null> =
    Object.fromEntries(accessRecoveryEntries)

  // Nombres de autores de nota (fallback honesto al id en la UI cuando no resuelve).
  const noteAuthorNames = notesView
    ? Object.fromEntries(await resolveUserDisplayNames(notesView.notes.map((note) => note.authorUserId)))
    : {}

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
      notes={notesView?.notes ?? null}
      notesFailed={notesView === null}
      hiddenNoteCount={notesView?.hiddenNoteCount ?? 0}
      viewerBlind={notesView?.viewerBlindUntilScorecardSubmitted ?? false}
      canAnnotate={canAnnotate}
      canScore={canScore}
      canAuthorAssessment={canAuthorAssessment}
      canRecoverAccessEmail={canRecoverAccessEmail}
      canRevealAccessLink={canRevealAccessLink}
      accessRecovery={accessRecovery}
      accessRecoveryFailed={accessRecoveryFailed}
      noteAuthorNames={noteAuthorNames}
    />
  )
}
