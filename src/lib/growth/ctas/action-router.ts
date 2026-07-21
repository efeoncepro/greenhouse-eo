/**
 * TASK-1339 → TASK-1431 — Growth CTA engine: action router (fachada estable).
 *
 * Desde TASK-1431 la resolución vive en el Action Registry (`action-registry.ts`):
 * un entry por kind con schema de policy, resolver server-side y proyección
 * browser-safe. Esta fachada conserva el contrato que consumen el gate de publish
 * (un CTA no publica con acción no resoluble) y el read path del arbiter (una
 * acción que no resuelve saca al CTA de render + breadcrumb) — boundary arch §12
 * intacto: el CTA guarda SOLO relaciones/destinos gobernados, nunca duplica al
 * dominio destino.
 */
import 'server-only'

import { type CtaActionResolution, resolveRegisteredCtaAction } from './action-registry'

export type ResolveCtaActionResult = CtaActionResolution

/**
 * Valida la action policy persistida contra el registry y resuelve el target
 * browser-safe. Fail-closed: kind sin entry registrado ⇒ `action_kind_unsupported`
 * (jamás un fallback silencioso a link genérico).
 */
export const resolveCtaAction = async (actionPolicyJson: unknown): Promise<ResolveCtaActionResult> =>
  resolveRegisteredCtaAction(actionPolicyJson)
