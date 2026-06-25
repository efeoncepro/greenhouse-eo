/**
 * TASK-1231 — Growth Forms portable renderer · espejo browser-safe del `render_contract`.
 *
 * SSOT del contrato = `src/lib/growth/forms/contracts.ts` (TASK-1229). Acá vive un
 * **espejo de solo-tipos** para que el core portable no dependa de `zod` ni de los
 * imports server del dominio: el bundle público queda framework-light y sin deps.
 *
 * Drift guard: `src/lib/growth/forms/__tests__/renderer-contract-parity.test.ts`
 * verifica por asignabilidad bidireccional que este espejo no se desincronice de la
 * SoT. Si la SoT cambia el shape del `render_contract`, ese test rompe primero.
 *
 * Frontera dura: este contrato NUNCA contiene destination mapping, HubSpot property
 * names/GUIDs, URLs privadas, secrets ni scoring server-only.
 */

export type RendererFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'number'
  | 'date'
  | 'hidden'
  | 'consent'

export type RendererCompositionMode =
  | 'static'
  | 'conditional_simple'
  | 'multi_step_light'
  | 'computed_result'
  | 'async_result'
  | 'authenticated_or_tokenized'

export type RendererFormKind =
  | 'subscribe'
  | 'lead_magnet'
  | 'contact'
  | 'diagnostic_intake'
  | 'quote_request'
  | 'pricing_simulation'
  | 'document_upload'
  | 'event_registration'
  | 'survey'
  | 'preference'
  | 'application'

export interface RendererFieldCondition {
  field: string
  equals?: string | number | boolean
  includes?: string
}

export interface RendererFieldOption {
  value: string
  label?: string
  copyRef?: string
}

export interface RendererFieldDefinition {
  key: string
  type: RendererFieldType
  label?: string
  copyRef?: string
  placeholder?: string
  required?: boolean
  options?: RendererFieldOption[]
  maxLength?: number
  /** Token WHATWG (`email`, `name`, `tel`, `organization`, …). Lo declara el contract. */
  autocomplete?: string
  /** `email | tel | numeric | decimal | url | text`. Lo declara el contract. */
  inputMode?: string
  visibleWhen?: RendererFieldCondition[]
  requiredWhen?: RendererFieldCondition[]
}

export interface RendererConsentCheckbox {
  key: string
  label?: string
  copyRef?: string
  required?: boolean
}

export interface RendererConsentDisplay {
  consentPolicyVersion?: string
  noticeText?: string
  noticeCopyRef?: string
  privacyUrl?: string
  checkboxes?: RendererConsentCheckbox[]
}

export type RendererSuccessKind =
  | 'inline_message'
  | 'redirect'
  | 'asset_access'
  | 'review_pending'
  | 'tokenized_report'

export interface RendererSuccessBehavior {
  kind: RendererSuccessKind
  message?: string
  messageCopyRef?: string
  redirectUrl?: string
}

export interface RendererStep {
  key: string
  label?: string
  fieldKeys: string[]
}

export interface RendererSurfacePolicy {
  surfaceId?: string
  allowedOrigins?: string[]
  rendererChannel?: 'stable' | 'beta' | 'preview'
}

export interface RendererTelemetryPolicy {
  enabled?: boolean
  allowedEvents?: string[]
  gtmDataLayer?: boolean
  fieldLevelAnalyticsDisabled?: boolean
}

export interface RenderContract {
  contractVersion: string
  form: {
    formId: string
    slug: string
    formVersionId: string
    version: number
    locale: string
    formKind: RendererFormKind
  }
  composition: RendererCompositionMode
  fields: RendererFieldDefinition[]
  conditions?: RendererFieldCondition[]
  steps?: RendererStep[]
  copy?: Record<string, string>
  consent?: RendererConsentDisplay
  successBehavior: RendererSuccessBehavior
  styleVariant?: string
  surfacePolicy: RendererSurfacePolicy
  telemetryPolicy: RendererTelemetryPolicy
}

/** Resultado del submit público (espejo de `PublicSubmitOutcome` de la SoT). */
export type PublicSubmitOutcome =
  | 'accepted'
  | 'invalid'
  | 'consent_required'
  | 'surface_unauthorized'
  | 'rate_limited'
  | 'spam_rejected'
  | 'captcha_failed'
  | 'form_not_published'
  | 'disabled'

export interface PublicSubmitResult {
  outcome: PublicSubmitOutcome
  submissionId?: string
  reason?: string
}
