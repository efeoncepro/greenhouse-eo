import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, hiringNotFoundResponse, toHiringErrorResponse } from '@/lib/hiring'
import { listHiringApplicationNotes } from '@/lib/hiring/application-notes'
import { isViewerBlindForApplicationEvaluation } from '@/lib/hiring/assessment/instances'
import {
  HIRING_DOSSIER_PROMPT_VERSION,
  assembleEvaluationDossierPacket,
  computeDossierInputDigest,
  confirmEvaluationDossier,
  getCurrentDossierProposalForApplication,
  getDossierProposalById,
  getHiringDossierModel,
  isHiringDossierAiEnabled,
  proposeEvaluationDossier,
  renderEvaluationDossierMarkdown
} from '@/lib/hiring/dossier-ai'
import type { DossierProposalDecision, EvaluationDossierDraft } from '@/types/hiring-dossier-ai'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1735 — Expediente de Evaluación SMART (propose → confirm → execute).
 * GET: propuesta vigente + estado del flag (capability read).
 * POST {action:'propose'}: genera el borrador agéntico (flag-gated, idempotente por digest).
 * POST {action:'confirm'|'reject', proposalId, ...}: decisión humana terminal-once; el
 * confirm materializa la nota source='agent' vía recordHiringApplicationNote.
 * Internal-only: jamás candidato, cliente ni el review packet MCP de TASK-1718.
 * Los primitives viven en src/lib/hiring/dossier-ai/ (Full API Parity).
 */
export const dynamic = 'force-dynamic'

interface DossierBody {
  action?: 'propose' | DossierProposalDecision
  proposalId?: string
  editedBodyMd?: string
  decisionNote?: string
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.read' } })
  }

  try {
    const { id } = await params

    // TASK-1737 — gate anti-anclaje server-enforced: un evaluador con scorecard propio
    // ABIERTO no recibe el bloque proposal (juicio evaluativo lee scores por construcción).
    // La UI solo renderiza el estado honesto; la ceguera vive acá, no en la pantalla.
    if (await isViewerBlindForApplicationEvaluation(id, tenant.userId)) {
      const { hiddenNoteCount } = await listHiringApplicationNotes(id, tenant.userId)

      return NextResponse.json({
        aiEnabled: isHiringDossierAiEnabled(),
        proposal: null,
        viewerBlindUntilScorecardSubmitted: true,
        hiddenNoteCount
      })
    }

    const proposal = await getCurrentDossierProposalForApplication(id)

    // Precarga del modo edición (el render vive server-side; `renderEvaluationDossierMarkdown`
    // es server-only) + señal de staleness: digest vigente ≠ digest de la propuesta.
    // TASK-1737: el bodyMd se expone también para propuestas decididas — el panel compara
    // nota confirmada vs render canónico para preferir el render estructurado SOLO cuando
    // el humano no editó el cuerpo (lo editado siempre gana como fuente de la nota).
    let proposalBodyMd: string | null = null
    let proposalStale: boolean | null = null

    if (proposal) {
      const dossier = proposal.proposed.dossier as EvaluationDossierDraft | undefined

      if (dossier && typeof dossier.resumenEjecutivo === 'string') {
        proposalBodyMd = renderEvaluationDossierMarkdown(dossier)
      }
    }

    if (proposal?.status === 'proposed') {
      try {
        const packet = await assembleEvaluationDossierPacket(id)
        const currentDigest = computeDossierInputDigest(packet, getHiringDossierModel(), HIRING_DOSSIER_PROMPT_VERSION)

        proposalStale = currentDigest !== proposal.inputDigest
      } catch {
        // Fuentes no reconstruibles (p. ej. CV en proceso): staleness desconocida — la UI
        // no muestra el banner con una suposición. Nunca romper el GET por esta señal.
        proposalStale = null
      }
    }

    return NextResponse.json({
      aiEnabled: isHiringDossierAiEnabled(),
      proposal,
      proposalBodyMd,
      proposalStale,
      viewerBlindUntilScorecardSubmitted: false
    })
  } catch (error) {
    return toHiringErrorResponse(error, 'application_dossier_get')
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.annotate', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.annotate' } })
  }

  let body: DossierBody

  try {
    body = (await request.json()) as DossierBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const { id } = await params

    if (body.action === 'propose') {
      const proposal = await proposeEvaluationDossier(id, tenant.userId)

      return NextResponse.json({ proposal }, { status: 201 })
    }

    if (body.action === 'confirm' || body.action === 'reject') {
      if (!body.proposalId) {
        return hiringInvalidBodyResponse()
      }

      // La propuesta debe pertenecer a la application de la ruta (anti cross-wiring).
      const existing = await getDossierProposalById(body.proposalId)

      if (!existing || existing.applicationId !== id) {
        return hiringNotFoundResponse('La propuesta del expediente no existe.', 'hiring_dossier_proposal_not_found')
      }

      const result = await confirmEvaluationDossier({
        proposalId: body.proposalId,
        decision: body.action,
        editedBodyMd: body.editedBodyMd,
        decisionNote: body.decisionNote,
        actorUserId: tenant.userId
      })

      return NextResponse.json({ proposal: result.proposal, note: result.note })
    }

    return hiringInvalidBodyResponse()
  } catch (error) {
    return toHiringErrorResponse(error, 'application_dossier_post')
  }
}
