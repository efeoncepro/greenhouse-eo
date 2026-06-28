import 'server-only'

/**
 * TASK-1263 — Helper canónico del gate de correo corporativo por política del form.
 *
 * Full API Parity / "un primitive, muchos consumers": la decisión del gate vive ACÁ una
 * sola vez y la consumen idéntico `submitForm` (motor genérico) y las dos fachadas del
 * intake del grader (`createPublicGraderRun` a-medida + `createPublicGraderRunViaFormsEngine`
 * forms-engine). Antes de TASK-1263 la lógica vivía inline en `submitForm`, donde el intake
 * del grader NUNCA pasa → publicar `emailPolicy` no gateaba el grader. Este helper centraliza
 * el flag + la resolución de política + `verifyEmail` (Tier1-first) + la decisión de rechazo.
 *
 * Contrato:
 *   - flag OFF, `emailPolicy.mode='off'`, o sintaxis inválida → `{ gated: false }`. El gate
 *     NO opina (el rechazo sintáctico es responsabilidad de cada path: el renderer / el
 *     validador del intake). El caller sigue su flujo normal.
 *   - `block_field` + (no corporativo | desechable) → `{ gated: true, rejected: true, ... }`
 *     con `rejectionClass` para el signal de rejection rate. El caller debe abortar ANTES de
 *     aceptar/encolar (no gastar AI, no persistir el lead).
 *   - `warn` / `tag_only` / `block_field` que pasa → `{ gated: true, rejected: false, ... }`
 *     con `quality`/`domainClass` para etiquetar la calidad del lead (no bloquea).
 *
 * El email es PII: este helper NO lo loggea ni lo retorna; solo veredicto.
 */
import { resolveEmailPolicy } from '../contracts'
import { isFormsEmailVerificationEnabled } from '../flags'

import { verifyEmail } from './orchestrator'

export type EmailGateRejectionClass = 'email_not_corporate' | 'email_disposable'

export type EmailGateVerdict =
  | { gated: false; rejected: false; rejectionClass: null; quality: null; domainClass: null }
  | {
      gated: true
      rejected: boolean
      rejectionClass: EmailGateRejectionClass | null
      quality: 'verified' | 'suspect' | 'unknown'
      domainClass: 'corporate' | 'personal' | 'disposable'
    }

const NOT_GATED: EmailGateVerdict = { gated: false, rejected: false, rejectionClass: null, quality: null, domainClass: null }

/**
 * Evalúa el gate de email para un form. `validationSchemaJson` = la columna del form_version
 * publicado (de donde sale `emailPolicy`); `fields` = el blob de campos normalizados (se lee
 * el campo declarado por `policy.field`, default `email`).
 */
export const evaluateFormEmailGate = async (
  validationSchemaJson: unknown,
  fields: Record<string, unknown>,
): Promise<EmailGateVerdict> => {
  if (!isFormsEmailVerificationEnabled()) return NOT_GATED

  const policy = resolveEmailPolicy(validationSchemaJson)

  if (policy.mode === 'off') return NOT_GATED

  const verdict = await verifyEmail(fields[policy.field])

  // Sintaxis inválida: el gate corporativo no opina (lo cubre el validador sintáctico de
  // cada path). No marcamos calidad ni rechazamos acá para no duplicar ese contrato.
  if (!verdict.syntaxValid) return NOT_GATED

  const domainClass = verdict.isDisposable ? 'disposable' : verdict.isCorporate ? 'corporate' : 'personal'
  const failsCorporate = verdict.reasonCode === 'email_not_corporate' || verdict.reasonCode === 'email_disposable'
  const rejected = policy.mode === 'block_field' && failsCorporate

  const rejectionClass: EmailGateRejectionClass | null = rejected
    ? verdict.reasonCode === 'email_disposable'
      ? 'email_disposable'
      : 'email_not_corporate'
    : null

  return { gated: true, rejected, rejectionClass, quality: verdict.quality, domainClass }
}
