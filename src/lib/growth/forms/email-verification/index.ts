import 'server-only'

/**
 * TASK-1254 — Barrel server-only de email-verification. Re-exporta el orquestador + el
 * puerto del provider. Los módulos browser-safe (`tier1.ts`, `email-domain-data.ts`) NO
 * se re-exportan acá a propósito: el renderer y `validators/core.ts` los importan directo
 * (este index es server-only y los contaminaría).
 */
export { verifyEmail } from './orchestrator'
export type { EmailVerificationResult, EmailVerificationReasonCode, EmailQuality } from './orchestrator'
export { evaluateFormEmailGate } from './gate'
export type { EmailGateVerdict, EmailGateRejectionClass } from './gate'
export {
  resolveVerificationProvider,
  noopVerificationProvider,
  type EmailVerificationProvider,
  type DeliverabilityVerdict,
} from './provider'
