import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import {
  listHiringApplicationNotes,
  recordHiringApplicationNote,
  type HiringApplicationNoteKind
} from '@/lib/hiring/application-notes'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1735 — Expediente de Evaluación (notas append-only per-application).
 * GET lista las notas (capability read); POST registra una nota (capability annotate).
 * Internal-only: esta superficie jamás se expone a candidato, cliente ni al review
 * packet MCP de TASK-1718. El primitive vive en src/lib/hiring/application-notes.ts.
 */
export const dynamic = 'force-dynamic'

interface NoteBody {
  kind?: HiringApplicationNoteKind
  bodyMd?: string
  contextJson?: Record<string, unknown>
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.read' } })
  }

  try {
    const { id } = await params

    // TASK-1737 — viewer-aware: el gate anti-anclaje vive en el reader (server).
    // Un evaluador con scorecard propio abierto recibe el payload YA filtrado.
    const { notes, hiddenNoteCount, viewerBlindUntilScorecardSubmitted } = await listHiringApplicationNotes(
      id,
      tenant.userId
    )

    return NextResponse.json({ notes, hiddenNoteCount, viewerBlindUntilScorecardSubmitted })
  } catch (error) {
    return toHiringErrorResponse(error, 'application_notes_list')
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.annotate', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.annotate' } })
  }

  let body: NoteBody

  try {
    body = (await request.json()) as NoteBody
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const { id } = await params

    const note = await recordHiringApplicationNote({
      applicationId: id,
      kind: body.kind as HiringApplicationNoteKind,
      bodyMd: body.bodyMd ?? '',
      authorUserId: tenant.userId,
      // Auditoría 2026-08-16: source='agent' es exclusivo del confirm del dossier
      // (provenance gobernado); la ruta manual siempre registra 'human'.
      source: 'human',
      contextJson: body.contextJson
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'application_notes_record')
  }
}
