import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import {
  listHiringApplicationNotes,
  recordHiringApplicationNote,
  type HiringApplicationNoteKind,
  type HiringApplicationNoteSource
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
  source?: HiringApplicationNoteSource
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
    const notes = await listHiringApplicationNotes(id)

    return NextResponse.json({ notes })
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
      source: body.source,
      contextJson: body.contextJson
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'application_notes_record')
  }
}
