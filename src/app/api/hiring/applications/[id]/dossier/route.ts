import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, hiringNotFoundResponse, toHiringErrorResponse } from '@/lib/hiring'
import {
  confirmEvaluationDossier,
  getCurrentDossierProposalForApplication,
  getDossierProposalById,
  isHiringDossierAiEnabled,
  proposeEvaluationDossier
} from '@/lib/hiring/dossier-ai'
import type { DossierProposalDecision } from '@/types/hiring-dossier-ai'
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
    const proposal = await getCurrentDossierProposalForApplication(id)

    return NextResponse.json({ aiEnabled: isHiringDossierAiEnabled(), proposal })
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
