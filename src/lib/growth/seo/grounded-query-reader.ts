/**
 * TASK-1666 — Reader del draft grounded (app, Nexa, lane ecosystem y MCP).
 *
 * Devuelve el draft AEO con su provenance SEO legible SOLO al tenant autorizado: profile→org
 * validado server-side y `setId` resuelto dentro del historial de ESE profile — un ID ajeno
 * responde anti-oracle (`draft_not_found`) sin distinguir "no existe" de "no es tuyo". El
 * `groundingMode` se DERIVA de los hechos persistidos (estrategia + versión del cerebro +
 * refs), nunca se afirma de memoria.
 */

import 'server-only'

import { can } from '@/lib/entitlements/runtime'
import { type TenantEntitlementSubject } from '@/lib/entitlements/types'
import { isGraderEnabled } from '@/lib/growth/ai-visibility/flags'
import { AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION } from '@/lib/growth/ai-visibility/prompt-packs/authoring/author-system-prompt'
import { readGraderPromptSets } from '@/lib/growth/ai-visibility/prompt-packs/prompt-set-command'
import { type PromptSetGenerationStrategy, type PromptSetStatus } from '@/lib/growth/ai-visibility/prompt-packs/prompt-set-store'
import { getGraderProfile } from '@/lib/growth/ai-visibility/store'
import { captureWithDomain } from '@/lib/observability/capture'

import { isSeoModuleEnabled } from './flags'
import { GROUNDED_QUERY_FALLBACK_NOTICE, type GroundedQueryErrorCode } from './grounded-query-bridge'

export interface GroundedQueryDraftPromptView {
  id: string
  family: string
  fanOutType: string
  intentStage: string
  namesBrand: boolean
  text: string
  rationale: string | null
  groundingRef: string | null
}

export type ReadGroundedQueryDraftResult =
  | {
      ok: true
      setId: string
      profileId: string
      version: number
      status: PromptSetStatus
      generationStrategy: PromptSetGenerationStrategy
      systemPromptVersion: string | null
      groundingMode: 'grounded_llm' | 'baseline_fallback'
      prompts: GroundedQueryDraftPromptView[]
      /** Refs opacas `seo.discovery.*` (run/candidates/context hash). */
      sourceRefs: string[]
      /** Fuentes AEO existentes (category/business_model/brand intelligence/competitors). */
      aeoSources: string[]
      createdBy: string
      createdAt: string
      approvedBy: string | null
      approvedAt: string | null
      fallbackNotice: string | null
    }
  | { ok: false; errorCode: GroundedQueryErrorCode; status: number }

export const readGroundedQueryDraft = async (input: {
  subject: TenantEntitlementSubject
  organizationId: string
  profileId: string
  setId: string
  env?: NodeJS.ProcessEnv
}): Promise<ReadGroundedQueryDraftResult> => {
  const env = input.env ?? process.env

  if (!isSeoModuleEnabled(env) || !isGraderEnabled(env)) {
    return { ok: false, errorCode: 'grounded_query_disabled', status: 409 }
  }

  // El draft contiene prompts AEO: leerlo exige la MISMA capability que gestionarlos.
  if (!can(input.subject, 'growth.ai_visibility.prompt_set.manage', 'execute', 'tenant')) {
    return { ok: false, errorCode: 'aeo_forbidden', status: 403 }
  }

  try {
    const profile = await getGraderProfile(input.profileId)

    if (!profile || profile.organizationId !== input.organizationId) {
      return { ok: false, errorCode: 'profile_not_found', status: 404 }
    }

    const sets = await readGraderPromptSets({ subject: input.subject, profileId: input.profileId })
    const row = sets.versions.find(version => version.setId === input.setId)

    if (!row) return { ok: false, errorCode: 'draft_not_found', status: 404 }

    const grounded =
      row.generationStrategy === 'llm' && row.systemPromptVersion === AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION

    return {
      ok: true,
      setId: row.setId,
      profileId: row.profileId,
      version: row.version,
      status: row.status,
      generationStrategy: row.generationStrategy,
      systemPromptVersion: row.systemPromptVersion,
      groundingMode: grounded ? 'grounded_llm' : 'baseline_fallback',
      prompts: row.prompts.map(prompt => ({
        id: prompt.id,
        family: prompt.family,
        fanOutType: prompt.fanOutType,
        intentStage: prompt.intentStage,
        namesBrand: prompt.namesBrand,
        text: prompt.text,
        rationale: prompt.rationale ?? null,
        groundingRef: prompt.groundingRef ?? null
      })),
      sourceRefs: row.groundingSources.filter(source => source.startsWith('seo.discovery.')),
      aeoSources: row.groundingSources.filter(source => !source.startsWith('seo.discovery.')),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
      fallbackNotice: grounded ? null : GROUNDED_QUERY_FALLBACK_NOTICE
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_grounded_query_reader' },
      extra: { profileId: input.profileId, setId: input.setId }
    })

    return { ok: false, errorCode: 'draft_conflict', status: 502 }
  }
}
