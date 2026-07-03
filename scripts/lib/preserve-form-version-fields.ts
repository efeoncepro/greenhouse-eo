/**
 * TASK-1321 — Helper canónico para clonar→republicar una versión de Growth Form sin DROPEAR
 * columnas gobernadas.
 *
 * Bug class (regresión live 2026-07-02): los scripts `activate-*.ts` construían el input de
 * `authorDraftForm` a mano, pasando sólo un subset de las columnas de `form_version`. Cualquier
 * columna omitida se **pierde silenciosamente** en la versión nueva:
 *   - omitir `style_variant` → el renderer pierde `diagnostic_premium` → selects premium a nativos.
 *   - omitir `copy_refs_json` → se pierde TODO el copy (labels/help/errores).
 *   - omitir `ui_policy_json` → se pierde Turnstile/seguridad.
 *   - omitir `*_policy_json` → se pierde governance (data classification / analytics / retención…).
 *
 * Este helper mapea la fila publicada vigente a TODAS las columnas preservables del input de
 * `authorDraftForm`. Patrón de uso — spread PRIMERO, overrides DESPUÉS (ganan por precedencia):
 *
 *   await authorDraftForm({
 *     slug, name, formKind, purpose, riskProfile, createdBy,   // identidad (no viven en la versión)
 *     ...preserveFormVersionFields(current),                    // preserva TODO lo gobernado
 *     fieldSchema: nextFields,                                  // <- overrides explícitos
 *     copyRefs: nextCopy,                                       //    (lo que este script cambia)
 *   })
 *
 * `fieldSchema` NO está en el helper a propósito: es siempre "lo que el script cambia" y debe ser
 * un override explícito (nunca se preserva-por-accidente).
 */

/** Subconjunto de `FormVersionRow` con las columnas gobernadas que se preservan al clonar. */
export interface PreservableFormVersionRow {
  locale: string
  validation_schema_json: unknown
  copy_refs_json: unknown
  style_variant: string | null
  ui_policy_json: unknown
  success_behavior_json: unknown
  consent_policy_version: string | null
  data_classification_json: unknown
  destination_policy_json: unknown
  analytics_policy_json: unknown
  retention_policy_json: unknown
  commercial_handoff_policy_json: unknown
}

export interface PreservedFormVersionFields {
  locale: string
  validationSchema: unknown
  copyRefs: unknown
  styleVariant: string | null
  uiPolicy: unknown
  successBehavior: unknown
  consentPolicyVersion?: string
  dataClassification: unknown
  destinationPolicy: unknown
  analyticsPolicy: unknown
  retentionPolicy: unknown
  commercialHandoffPolicy: unknown
}

/** Columnas de `form_version` que este helper preserva (fuente de verdad para el guardrail). */
export const PRESERVED_FORM_VERSION_COLUMNS = [
  'locale',
  'validationSchema',
  'copyRefs',
  'styleVariant',
  'uiPolicy',
  'successBehavior',
  'consentPolicyVersion',
  'dataClassification',
  'destinationPolicy',
  'analyticsPolicy',
  'retentionPolicy',
  'commercialHandoffPolicy',
] as const

/**
 * Mapea la versión publicada vigente a los campos preservables de `authorDraftForm`. Spread esto
 * PRIMERO y agregá tus overrides después (fieldSchema, copyRefs modificado, uiPolicy con captcha…).
 */
export const preserveFormVersionFields = (
  current: PreservableFormVersionRow,
): PreservedFormVersionFields => ({
  locale: current.locale,
  validationSchema: current.validation_schema_json,
  copyRefs: current.copy_refs_json,
  styleVariant: current.style_variant,
  uiPolicy: current.ui_policy_json,
  successBehavior: current.success_behavior_json,
  consentPolicyVersion: current.consent_policy_version ?? undefined,
  dataClassification: current.data_classification_json,
  destinationPolicy: current.destination_policy_json,
  analyticsPolicy: current.analytics_policy_json,
  retentionPolicy: current.retention_policy_json,
  commercialHandoffPolicy: current.commercial_handoff_policy_json,
})
