import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { buildOrganizationWorkspaceSubjectFromTenant } from '@/lib/organization-workspace/build-projection-subject'
import { ENTRYPOINT_CONTEXTS, type EntrypointContext } from '@/lib/organization-workspace/projection-types'
import { isNexaSuggestedPromptsDataAwareEnabled } from '@/lib/nexa/flags'
import { resolveDataAwareSuggestedPrompts } from '@/lib/nexa/suggested-prompts-data-aware'
import { NEXA_SUGGESTED_PROMPTS_CONTRACT_VERSION } from '@/lib/nexa/suggested-prompts-contract'
import type { NexaPromptContextKey } from '@/lib/nexa/suggested-prompts'
import { captureWithDomain } from '@/lib/observability/capture'

// TASK-1087 — GET /api/nexa/suggested-prompts?context=<key>&entityId=<id>[&entrypoint=<ctx>]
// Devuelve prompts data-aware (Tier 2) o `template_fallback` honesto. NUNCA 5xx: si el flag está
// off, falta entityId, no hay señal o el reader degrada → `source: 'template_fallback'` (200) y el
// panel cae a Tier 1/1.5. El subject sale del tenant en sesión (anti-tamper); el reader gatea por
// la projection del workspace (anti-oracle). Gateo del flag también server-side (defense in depth).
export const dynamic = 'force-dynamic'

const VALID_CONTEXTS: NexaPromptContextKey[] = ['general', 'finance', 'client', 'payroll']

const parseContext = (raw: string | null): NexaPromptContextKey =>
  raw && (VALID_CONTEXTS as string[]).includes(raw) ? (raw as NexaPromptContextKey) : 'general'

const parseEntrypoint = (raw: string | null): EntrypointContext =>
  raw && (ENTRYPOINT_CONTEXTS as readonly string[]).includes(raw) ? (raw as EntrypointContext) : 'agency'

export async function GET(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const context = parseContext(url.searchParams.get('context'))
  const entityId = url.searchParams.get('entityId')
  const entityName = url.searchParams.get('entityName')

  // Fallback honesto cuando el flag está off — el panel ya tiene los prompts Tier 1/1.5.
  if (!isNexaSuggestedPromptsDataAwareEnabled()) {
    return NextResponse.json({
      contractVersion: NEXA_SUGGESTED_PROMPTS_CONTRACT_VERSION,
      context,
      entityName: entityName?.trim() || undefined,
      prompts: [],
      source: 'template_fallback'
    })
  }

  try {
    const payload = await resolveDataAwareSuggestedPrompts({
      subject: buildOrganizationWorkspaceSubjectFromTenant(tenant),
      context,
      entityId,
      entityName,
      entrypointContext: parseEntrypoint(url.searchParams.get('entrypoint'))
    })

    return NextResponse.json(payload)
  } catch (error) {
    // El composer ya degrada internamente; este catch es el último cinturón. NUNCA 5xx — los
    // prompts son un realce, no un recurso crítico: degradar a template es el comportamiento correcto.
    captureWithDomain(error, 'agency', {
      tags: { source: 'nexa_suggested_prompts_route' },
      extra: { context, entityId }
    })

    return NextResponse.json({
      contractVersion: NEXA_SUGGESTED_PROMPTS_CONTRACT_VERSION,
      context,
      entityName: entityName?.trim() || undefined,
      prompts: [],
      source: 'template_fallback'
    })
  }
}
