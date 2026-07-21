/**
 * TASK-1431 — Growth CTA engine: Action Registry canónico (server-only).
 *
 * UN registry exhaustivo por `kind` concentra: schema de policy (zod), resolver
 * server-side, proyección browser-safe y metadata pública (la metadata vive en
 * `contracts.ts` para que cockpit/preview/tests la consuman sin server-only).
 * `resolveCtaAction()` (action-router) delega acá; publish gate y render compiler
 * consumen esa fachada — un kind sin entry registrado NO publica ni renderiza
 * (fail-closed, arch §12 amendment 2026-07-18).
 *
 * Extender una acción = agregar el kind al enum de `contracts.ts` + metadata +
 * entry acá + espejo/executor del renderer JUNTOS (parity tests vigilan drift).
 * `download_asset`/`embed_growth_form`/`hubspot_handoff` quedan demand-driven.
 */
import 'server-only'

import { z } from 'zod'

import { getPublishedRenderContractByRef } from '@/lib/growth/forms/readers'
import { getMeetingSurfaceAuthority } from '@/lib/growth/meetings/store'

import {
  CTA_ACTION_KIND_METADATA,
  CTA_UTM_ALLOWED_KEYS,
  type CtaActionFailureReason,
  type CtaActionKind,
  type CtaActionKindMetadata,
  type CtaActionNavigationContext,
  type CtaRenderAction,
  ctaBookMeetingPolicySchema,
  ctaLinkUrlPolicySchema,
  ctaOpenGrowthFormPolicySchema,
  ctaOpenMeetingSchedulerPolicySchema,
  ctaOpenThinkToolPolicySchema,
} from './contracts'

// ─── Resultado canónico de resolución ─────────────────────────────────────────

export type CtaActionResolution =
  | { ok: true; action: CtaRenderAction }
  | { ok: false; reason: CtaActionFailureReason }

// ─── Registry entry ───────────────────────────────────────────────────────────

export interface CtaActionRegistryEntry {
  metadata: CtaActionKindMetadata
  /** Schema server-side de la policy persistida en `cta_version.action_policy_json`. */
  policySchema: z.ZodTypeAny
  /** Resolver puro/read-only: policy validada → proyección browser-safe (o fallo canónico). */
  resolve: (policy: unknown) => Promise<CtaActionResolution>
}

/** Helper de tipado: ata el resolver al output de SU schema sin `any` en el registro. */
const registryEntry = <S extends z.ZodTypeAny>(
  metadata: CtaActionKindMetadata,
  policySchema: S,
  resolve: (policy: z.output<S>) => Promise<CtaActionResolution>,
): CtaActionRegistryEntry => ({
  metadata,
  policySchema,
  resolve: policy => resolve(policy as z.output<S>),
})

// ─── Gobernanza de destinos (anti open-redirect / protocolos peligrosos) ──────

/**
 * Valida un destino autorado y lo normaliza: acepta SOLO path root-relative
 * (`/algo`; rechaza protocol-relative `//host` y el truco WHATWG `/\host`) o URL
 * https absoluta SIN credenciales embebidas. `javascript:`/`data:`/`vbscript:`/
 * http/ftp/etc. quedan fuera por construcción (solo pasa `https:`).
 */
export const validateGovernedDestination = (
  raw: string,
): { ok: true; href: string; url: URL | null } | { ok: false } => {
  const trimmed = raw.trim()

  if (trimmed.length === 0) return { ok: false }

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return { ok: false }

    return { ok: true, href: trimmed, url: null }
  }

  let url: URL

  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false }
  }

  if (url.protocol !== 'https:') return { ok: false }
  if (url.username !== '' || url.password !== '') return { ok: false }
  if (url.hostname.length === 0) return { ok: false }

  return { ok: true, href: url.toString(), url }
}

/** Hub Think gobernado (repo `efeonce-think`): la policy guarda un PATH, jamás un host arbitrario. */
const THINK_HUB_URL_DEFAULT = 'https://think.efeoncepro.com'

export const resolveThinkHubBase = (env: NodeJS.ProcessEnv = process.env): string =>
  (env.GROWTH_CTA_THINK_HUB_URL?.trim() || env.PUBLIC_GRADER_HUB_URL?.trim() || THINK_HUB_URL_DEFAULT).replace(
    /\/+$/,
    '',
  )

/**
 * Hosts de booking gobernados: HubSpot Meetings por patrón (`meetings.hubspot.com`,
 * `meetings-eu1.hubspot.com`, …) + hosts extra explícitos por env (dominio custom
 * de scheduling), comma-separated. Nunca un host arbitrario del autor.
 */
const BOOKING_HOST_PATTERN = /^meetings(-[a-z0-9]+)?\.hubspot\.com$/

export const isGovernedBookingHost = (hostname: string, env: NodeJS.ProcessEnv = process.env): boolean => {
  const normalized = hostname.toLowerCase()

  if (BOOKING_HOST_PATTERN.test(normalized)) return true

  const extra = (env.GROWTH_CTA_BOOKING_URL_HOSTS ?? '')
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(host => host.length > 0)

  return extra.includes(normalized)
}

/** Aplica la policy de contexto: el opt-in del autor solo cuenta si el kind lo permite. */
const resolveNewContext = (navigationContext: CtaActionNavigationContext, optIn: boolean): boolean =>
  navigationContext === 'new_context_allowed' ? optIn : false

// ─── Resolvers por kind ───────────────────────────────────────────────────────

/**
 * `open_growth_form`: el form debe tener versión published viva (reader canónico de
 * Growth Forms — el CTA guarda SOLO la relación, jamás schema/validación/consent).
 * Proyecta slug + form_key estables; el form trae su contrato por su propia ruta.
 */
const resolveOpenGrowthForm = async (
  policy: z.output<typeof ctaOpenGrowthFormPolicySchema>,
): Promise<CtaActionResolution> => {
  const formContract = await getPublishedRenderContractByRef(policy.formRef)

  if (!formContract) return { ok: false, reason: 'action_destination_unavailable' }

  return {
    ok: true,
    action: {
      kind: 'open_growth_form',
      formSlug: formContract.form.slug,
      formKey: formContract.form.formKey,
    },
  }
}

/**
 * `link_url`: destino root-relative o https gobernado — el destino viene del autor
 * (capability `growth.cta.author` + publish gate), la validación cierra protocolos
 * peligrosos, credenciales y protocol-relative. Proyecta href + newContext.
 */
const resolveLinkUrl = async (policy: z.output<typeof ctaLinkUrlPolicySchema>): Promise<CtaActionResolution> => {
  const destination = validateGovernedDestination(policy.url)

  if (!destination.ok) return { ok: false, reason: 'action_destination_invalid' }

  return {
    ok: true,
    action: {
      kind: 'link_url',
      href: destination.href,
      newContext: resolveNewContext(CTA_ACTION_KIND_METADATA.link_url.navigationContext, policy.openInNewContext),
    },
  }
}

/**
 * `open_think_tool`: la policy guarda un PATH del hub Think + campaign context
 * UTM-allowlisted; el resolver compone la URL final sobre el host gobernado (por
 * construcción no hay open redirect: el autor jamás elige host). El path no admite
 * query/fragment propios — todo contexto viaja por la allowlist UTM.
 */
const resolveOpenThinkTool = async (
  policy: z.output<typeof ctaOpenThinkToolPolicySchema>,
): Promise<CtaActionResolution> => {
  const path = policy.toolPath.trim()

  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return { ok: false, reason: 'action_destination_invalid' }
  }

  if (path.includes('?') || path.includes('#') || path.includes('\\') || /\s/.test(path)) {
    return { ok: false, reason: 'action_destination_invalid' }
  }

  const base = validateGovernedDestination(resolveThinkHubBase())

  // Config del hub rota (env inválida) = destino no disponible, jamás un href roto.
  if (!base.ok || base.url === null) return { ok: false, reason: 'action_destination_unavailable' }

  const url = new URL(path, base.url)

  for (const key of CTA_UTM_ALLOWED_KEYS) {
    const value = policy.campaignUtm[key]

    if (value) url.searchParams.set(`utm_${key}`, value)
  }

  return {
    ok: true,
    action: {
      kind: 'open_think_tool',
      href: url.toString(),
      newContext: resolveNewContext(CTA_ACTION_KIND_METADATA.open_think_tool.navigationContext, policy.openInNewContext),
    },
  }
}

/**
 * `book_meeting`: URL https de un host de booking gobernado. Navegación-only —
 * NUNCA muta CRM por click (el adapter `hubspot_handoff` es demand-driven futuro).
 */
const resolveBookMeeting = async (policy: z.output<typeof ctaBookMeetingPolicySchema>): Promise<CtaActionResolution> => {
  const destination = validateGovernedDestination(policy.meetingUrl)

  if (!destination.ok || destination.url === null) return { ok: false, reason: 'action_destination_invalid' }

  if (!isGovernedBookingHost(destination.url.hostname)) return { ok: false, reason: 'action_destination_invalid' }

  return {
    ok: true,
    action: {
      kind: 'book_meeting',
      href: destination.href,
      newContext: resolveNewContext(CTA_ACTION_KIND_METADATA.book_meeting.navigationContext, policy.openInNewContext),
    },
  }
}

const resolveOpenMeetingScheduler = async (
  policy: z.output<typeof ctaOpenMeetingSchedulerPolicySchema>,
): Promise<CtaActionResolution> => {
  const authority = await getMeetingSurfaceAuthority(policy.meetingSurfaceId, policy.schedulerKey)

  if (!authority) return { ok: false, reason: 'action_destination_unavailable' }

  const fallback = validateGovernedDestination(authority.fallbackUrl)

  if (!fallback.ok || fallback.url === null || !isGovernedBookingHost(fallback.url.hostname)) {
    return { ok: false, reason: 'action_destination_invalid' }
  }

  return {
    ok: true,
    action: {
      kind: 'open_meeting_scheduler',
      meetingSurfaceId: authority.surfaceId,
      schedulerKey: authority.schedulerKey,
      fallbackHref: fallback.href,
    },
  }
}

// ─── Registry exhaustivo (Record por kind — TS obliga a cubrir el enum) ────────

export const CTA_ACTION_REGISTRY: Readonly<Record<CtaActionKind, CtaActionRegistryEntry>> = {
  open_growth_form: registryEntry(
    CTA_ACTION_KIND_METADATA.open_growth_form,
    ctaOpenGrowthFormPolicySchema,
    resolveOpenGrowthForm,
  ),
  link_url: registryEntry(CTA_ACTION_KIND_METADATA.link_url, ctaLinkUrlPolicySchema, resolveLinkUrl),
  open_think_tool: registryEntry(
    CTA_ACTION_KIND_METADATA.open_think_tool,
    ctaOpenThinkToolPolicySchema,
    resolveOpenThinkTool,
  ),
  book_meeting: registryEntry(CTA_ACTION_KIND_METADATA.book_meeting, ctaBookMeetingPolicySchema, resolveBookMeeting),
  open_meeting_scheduler: registryEntry(
    CTA_ACTION_KIND_METADATA.open_meeting_scheduler,
    ctaOpenMeetingSchedulerPolicySchema,
    resolveOpenMeetingScheduler,
  ),
}

// ─── Resolución canónica (única puerta: publish gate + render path) ───────────

const kindProbeSchema = z.object({ kind: z.string() })

/**
 * Valida la action policy persistida contra el registry y resuelve la proyección
 * browser-safe. Orden de fallo: shape sin `kind` ⇒ `action_policy_invalid`; kind sin
 * entry ⇒ `action_kind_unsupported`; policy que no pasa SU schema ⇒
 * `action_policy_invalid`; destino ⇒ lo que declare el resolver del kind.
 */
export const resolveRegisteredCtaAction = async (actionPolicyJson: unknown): Promise<CtaActionResolution> => {
  const probe = kindProbeSchema.safeParse(actionPolicyJson ?? {})

  if (!probe.success) return { ok: false, reason: 'action_policy_invalid' }

  const entry = (CTA_ACTION_REGISTRY as Record<string, CtaActionRegistryEntry | undefined>)[probe.data.kind]

  if (!entry) return { ok: false, reason: 'action_kind_unsupported' }

  const policy = entry.policySchema.safeParse(actionPolicyJson)

  if (!policy.success) return { ok: false, reason: 'action_policy_invalid' }

  return entry.resolve(policy.data)
}
