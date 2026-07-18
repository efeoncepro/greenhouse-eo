/**
 * TASK-1339 — Growth CTA engine: lifecycle command set (dominio puro).
 *
 * La autorización (capability `growth.cta.*`) se aplica en la capa API; estos
 * commands son dominio puro sobre el store. Devuelven outcomes (no lanzan para
 * bloqueos esperados) — apto para el loop gobernado `propose → confirm → execute`
 * (Full API Parity §7.1: el LLM/agente nunca muta directo; la mutación vive en el
 * endpoint de confirmación humana que llama estos commands).
 *
 * State machine (arch/ADR): draft → review → published → paused → deprecated → archived.
 * `resume` (paused → published) es el inverso operativo de `pause` — sin él, la
 * pausa de emergencia (§16.3) sería one-way y obligaría a re-autorar. Published es
 * inmutable (trigger DB); publish es atómico y depreca la published anterior en la
 * misma tx (una sola published viva por CTA).
 */
import 'server-only'

import { mintEmbedKey } from '@/lib/growth/forms/embed-key'

import { resolveCtaAction } from './action-router'
import {
  type CtaPlacement,
  type CtaSurfaceKind,
  ctaActionPolicySchema,
  ctaContentSchema,
  ctaPriorityPolicySchema,
  ctaSuppressionPolicySchema,
  ctaTargetingPolicySchema,
  CTA_PLACEMENTS,
} from './contracts'
import {
  type TransitionResult,
  insertCtaDraft,
  insertSurfaceBinding,
  publishCtaVersionAtomic,
  transitionCtaVersionStatus,
  updateSurfaceEmbedKey,
  getSurfaceBindingById,
  getCtaVersionById,
} from './store'

// ─── Author ───────────────────────────────────────────────────────────────────

export interface AuthorCtaInput {
  slug: string
  name: string
  purpose: string
  ownerTeam?: string | null
  campaignSlug?: string | null
  locale?: string
  placement: CtaPlacement
  styleVariant?: string | null
  content: Record<string, unknown>
  visualAssetRef?: string | null
  actionPolicy: Record<string, unknown>
  targetingPolicy?: Record<string, unknown>
  /** TASK-1430: postura de supresión autorada (cap/dismiss/ventana). Sin ella el store persiste `{}`. */
  suppressionPolicy?: Record<string, unknown>
  priorityPolicy?: Record<string, unknown>
  createdBy?: string | null
}

export type AuthorCtaResult =
  | { ok: true; ctaId: string; ctaVersionId: string; version: number }
  | { ok: false; reason: 'invalid_input'; details: string[] }

/**
 * Crea una versión draft nueva (y la definición si el slug no existe). Valida el
 * shape de content/action/targeting/priority al autorar — un draft malformado no
 * entra al sistema (el gate duro adicional corre en publish).
 */
export const authorDraftCta = async (input: AuthorCtaInput): Promise<AuthorCtaResult> => {
  const details: string[] = []

  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)

  if (!slugOk) details.push('slug_invalid')
  if (!(CTA_PLACEMENTS as readonly string[]).includes(input.placement)) details.push('placement_invalid')
  if (!ctaContentSchema.safeParse(input.content).success) details.push('content_invalid')
  if (!ctaActionPolicySchema.safeParse(input.actionPolicy).success) details.push('action_policy_invalid')

  if (input.targetingPolicy !== undefined && !ctaTargetingPolicySchema.safeParse(input.targetingPolicy).success) {
    details.push('targeting_policy_invalid')
  }

  if (input.priorityPolicy !== undefined && !ctaPriorityPolicySchema.safeParse(input.priorityPolicy).success) {
    details.push('priority_policy_invalid')
  }

  if (input.suppressionPolicy !== undefined && !ctaSuppressionPolicySchema.safeParse(input.suppressionPolicy).success) {
    details.push('suppression_policy_invalid')
  }

  if (details.length > 0) return { ok: false, reason: 'invalid_input', details }

  const created = await insertCtaDraft({
    slug: input.slug,
    name: input.name,
    purpose: input.purpose,
    ownerTeam: input.ownerTeam ?? null,
    campaignSlug: input.campaignSlug ?? null,
    defaultLocale: input.locale ?? 'es-CL',
    createdBy: input.createdBy ?? null,
    locale: input.locale ?? 'es-CL',
    placement: input.placement,
    styleVariant: input.styleVariant ?? null,
    content: input.content,
    visualAssetRef: input.visualAssetRef ?? null,
    actionPolicy: input.actionPolicy,
    targetingPolicy: input.targetingPolicy ?? { routes: ['/**'], excludeRoutes: [] },
    suppressionPolicy: input.suppressionPolicy ?? undefined,
    priorityPolicy: input.priorityPolicy ?? { score: 100 },
  })

  return { ok: true, ...created }
}

// ─── Lifecycle transitions ────────────────────────────────────────────────────

export const submitCtaReview = async (ctaVersionId: string): Promise<TransitionResult> =>
  transitionCtaVersionStatus(ctaVersionId, ['draft'], 'review')

export type PublishCtaResult =
  | { ok: true }
  | {
      ok: false
      reason: 'not_found' | 'invalid_transition' | 'action_not_resolvable'
      fromStatus?: string
      blockingReasons?: string[]
    }

/**
 * Publish atómico con gate: la acción DEBE resolver contra Growth Forms antes de
 * publicar (un CTA publicado apuntando a un form muerto es un handoff roto en
 * producción). El snapshot queda inmutable (trigger DB) y la published anterior se
 * deprecia en la misma tx.
 */
export const publishCtaVersion = async (ctaVersionId: string): Promise<PublishCtaResult> => {
  const version = await getCtaVersionById(ctaVersionId)

  if (!version) return { ok: false, reason: 'not_found' }

  const action = await resolveCtaAction(version.action_policy_json)

  if (!action.ok) {
    return { ok: false, reason: 'action_not_resolvable', blockingReasons: [action.reason] }
  }

  const content = ctaContentSchema.safeParse(version.content_json ?? {})

  if (!content.success) {
    return { ok: false, reason: 'action_not_resolvable', blockingReasons: ['content_invalid'] }
  }

  const result = await publishCtaVersionAtomic(ctaVersionId)

  if (!result.ok) return { ok: false, reason: result.reason ?? 'invalid_transition', fromStatus: result.fromStatus }

  return { ok: true }
}

/** Pausa de emergencia por versión (arch §16.3 — per-version stop; reversible con resume). */
export const pauseCtaVersion = async (ctaVersionId: string): Promise<TransitionResult> =>
  transitionCtaVersionStatus(ctaVersionId, ['published'], 'paused')

/** Reanuda una versión pausada. El índice parcial único defiende contra doble published. */
export const resumeCtaVersion = async (ctaVersionId: string): Promise<TransitionResult> =>
  transitionCtaVersionStatus(ctaVersionId, ['paused'], 'published')

export const deprecateCtaVersion = async (ctaVersionId: string): Promise<TransitionResult> =>
  transitionCtaVersionStatus(ctaVersionId, ['published', 'paused'], 'deprecated')

export const archiveCtaVersion = async (ctaVersionId: string): Promise<TransitionResult> =>
  transitionCtaVersionStatus(ctaVersionId, ['deprecated'], 'archived')

// ─── Surface bindings ─────────────────────────────────────────────────────────

export interface RegisterCtaSurfaceInput {
  surfaceKind: CtaSurfaceKind
  surfaceName: string
  originAllowlist: string[]
  allowedCtaSlugs?: string[]
}

export interface RegisterCtaSurfaceResult {
  surfaceId: string
  embedKeyId: string
  /** Secreto crudo — se entrega UNA sola vez; solo el hash se persiste. */
  embedKeySecret: string
}

/** Registra una surface con credencial minteada (config del host, no secreto de visitante). */
export const registerCtaSurface = async (input: RegisterCtaSurfaceInput): Promise<RegisterCtaSurfaceResult> => {
  const minted = mintEmbedKey()

  const { surfaceId } = await insertSurfaceBinding({
    surfaceKind: input.surfaceKind,
    surfaceName: input.surfaceName,
    originAllowlist: input.originAllowlist,
    allowedCtaSlugs: input.allowedCtaSlugs ?? [],
    embedKeyId: minted.embedKeyId,
    embedKeyHash: minted.embedKeyHash,
  })

  return { surfaceId, embedKeyId: minted.embedKeyId, embedKeySecret: minted.secret }
}

export type RotateEmbedKeyResult =
  | { ok: true; embedKeyId: string; embedKeySecret: string }
  | { ok: false; reason: 'not_found' }

/** Rota la credencial per-surface; invalida la anterior en el acto. */
export const rotateCtaSurfaceEmbedKey = async (surfaceId: string): Promise<RotateEmbedKeyResult> => {
  const surface = await getSurfaceBindingById(surfaceId)

  if (!surface) return { ok: false, reason: 'not_found' }

  const minted = mintEmbedKey()
  const updated = await updateSurfaceEmbedKey(surfaceId, minted.embedKeyId, minted.embedKeyHash)

  if (!updated) return { ok: false, reason: 'not_found' }

  return { ok: true, embedKeyId: minted.embedKeyId, embedKeySecret: minted.secret }
}
