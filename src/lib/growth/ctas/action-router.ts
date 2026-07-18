/**
 * TASK-1339 — Growth CTA engine: action router (solo `open_growth_form` en V1).
 *
 * Resuelve la política de acción de una versión contra el contrato PUBLICADO de
 * Growth Forms vía su reader canónico. Boundary duro (arch §12/§20): el CTA guarda
 * SOLO la relación (`formRef`); NUNCA copia field schema, validación ni consent —
 * el form sigue siendo la autoridad del submit. La resolución se usa en dos puntos:
 * el gate de publish (un CTA no publica apuntando a un form que no resuelve) y el
 * read path del arbiter (un form despublicado saca al CTA de render + breadcrumb
 * `form_handoff_failed`).
 */
import 'server-only'

import { getPublishedRenderContractByRef } from '@/lib/growth/forms/readers'

import { type CtaRenderAction, ctaActionPolicySchema } from './contracts'

export type ResolveCtaActionResult =
  | { ok: true; action: CtaRenderAction }
  | { ok: false; reason: 'action_policy_invalid' | 'action_kind_unsupported' | 'form_not_resolvable' }

/**
 * Valida la action policy persistida y resuelve el target browser-safe.
 * Para `open_growth_form`: el form debe tener versión published viva; devolvemos
 * slug + form_key estables (lo único que el renderer necesita para montar
 * `<greenhouse-form>`; el form trae su propio contrato por su propia ruta pública).
 */
export const resolveCtaAction = async (actionPolicyJson: unknown): Promise<ResolveCtaActionResult> => {
  const policy = ctaActionPolicySchema.safeParse(actionPolicyJson ?? {})

  if (!policy.success) return { ok: false, reason: 'action_policy_invalid' }

  if (policy.data.kind !== 'open_growth_form') {
    return { ok: false, reason: 'action_kind_unsupported' }
  }

  const formContract = await getPublishedRenderContractByRef(policy.data.formRef)

  if (!formContract) return { ok: false, reason: 'form_not_resolvable' }

  return {
    ok: true,
    action: {
      kind: 'open_growth_form',
      formSlug: formContract.form.slug,
      formKey: formContract.form.formKey,
    },
  }
}
