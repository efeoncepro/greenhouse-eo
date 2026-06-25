/**
 * TASK-1253 — Barrel del validator registry (server convenience).
 *
 * Re-exporta SOLO el core puro. NUNCA agregar aquí re-exports server-only: el
 * renderer importa `./core` directo, pero mantener este barrel puro evita que
 * un import server-only se cuele a un consumer isomórfico por accidente.
 */
export {
  NAMED_VALIDATORS,
  resolveValidatorName,
  validateFormValue,
  validateFieldValue,
  type NamedValidator,
  type FormValidatorReasonCode,
  type FormFieldValidationResult,
  type ValidatorParams,
  type ValidatorFieldShape,
} from './core'
