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

import {
  CTA_ACTION_KIND_METADATA,
  type CtaActionFailureReason,
  type CtaActionKind,
  type CtaActionKindMetadata,
  type CtaRenderAction,
  ctaOpenGrowthFormPolicySchema,
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

// ─── Registry exhaustivo (Record por kind — TS obliga a cubrir el enum) ────────

export const CTA_ACTION_REGISTRY: Readonly<Record<CtaActionKind, CtaActionRegistryEntry>> = {
  open_growth_form: registryEntry(
    CTA_ACTION_KIND_METADATA.open_growth_form,
    ctaOpenGrowthFormPolicySchema,
    resolveOpenGrowthForm,
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
