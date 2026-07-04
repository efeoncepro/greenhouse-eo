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
  | 'national_id'
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
  /** Validador declarativo del catálogo curado (TASK-1253). Default por `type` si se omite. */
  validator?: string
  /** Params del validador (ISO alpha-2 país para national_id / e164_phone). */
  validatorParams?: { country?: string }
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

// Success card capability (TASK-1319) — espejo de tipos browser-safe. La SoT
// (`successBehaviorSchema`) valida/acota; acá vive sólo el shape que el renderer consume.
export type RendererSuccessPresentation = 'inline_message' | 'success_card'
export type RendererSuccessActionKind = 'external_link' | 'download' | 'asset_access' | 'schedule'
export type RendererSuccessRewardKind =
  | 'none'
  | 'ebook'
  | 'guide'
  | 'template'
  | 'report_preview'
  | 'surprise'

export interface RendererSuccessCardAction {
  kind: RendererSuccessActionKind
  label?: string
  labelCopyRef?: string
  href?: string
  target?: '_self' | '_blank'
  telemetryKey?: string
}

export interface RendererSuccessCardReward {
  kind: RendererSuccessRewardKind
  title?: string
  titleCopyRef?: string
  body?: string
  bodyCopyRef?: string
  action?: RendererSuccessCardAction
}

export interface RendererSuccessCardStep {
  label?: string
  copyRef?: string
}

// TASK-1336 — Config del handoff `tokenized_report` (espejo browser-safe de la SoT). El renderer
// sustituye `{handle}` por el `submissionId` y resuelve la URL absoluta contra su `api.baseUrl`.
export interface RendererTokenizedReportBehavior {
  statusPathTemplate: string
}

export interface RendererSuccessBehavior {
  kind: RendererSuccessKind
  presentation?: RendererSuccessPresentation
  message?: string
  messageCopyRef?: string
  title?: string
  titleCopyRef?: string
  body?: string
  bodyCopyRef?: string
  steps?: RendererSuccessCardStep[]
  reward?: RendererSuccessCardReward
  actions?: RendererSuccessCardAction[]
  supportingNote?: string
  supportingNoteCopyRef?: string
  redirectUrl?: string
  tokenizedReport?: RendererTokenizedReportBehavior
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

export interface RendererCaptchaSecurity {
  provider: 'turnstile'
  required?: boolean
  mode: 'invisible'
  siteKey: string
  execution: 'submit'
}

export interface RendererSecurity {
  captcha?: RendererCaptchaSecurity
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
    /** TASK-1297 — identidad estable/opaca pública (UUID). NUNCA el HubSpot destination formGuid. */
    formKey: string
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
  security?: RendererSecurity
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
