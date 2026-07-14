/**
 * TASK-1231 — Growth Forms portable renderer · motor framework-light.
 *
 * Construye el form en light DOM desde un `render_contract`, maneja el piso `forms-ux`
 * (validation timing 3-stage, error inline 4-elementos, submit enabled con focus al
 * primer inválido + pending + anti doble-submit, preservar datos en error de server,
 * máscara forgiving) y el piso `a11y` (IDREF en el mismo árbol, role=alert, targets
 * ≥24px). Soporta `static`, `conditional_simple` y `multi_step_light`.
 *
 * Es independiente de `customElements` para poder testearse con jsdom; el custom
 * element (`element.ts`) lo instancia y le pasa el host + el contrato ya cargado.
 */
import type {
  PublicSubmitOutcome,
  RenderContract,
  RendererFieldDefinition,
  RendererSuccessBehavior,
  RendererSuccessCardAction,
  RendererSuccessCardReward,
  RendererSuccessCardStep,
  RendererStep
} from './contract'
import { isFieldRequired, isFieldVisible, type FieldValues } from './conditions'
import {
  formatNationalPhoneDisplay,
  maskOpsFor,
  nationalFromStored,
  parseE164,
  PHONE_COUNTRIES,
  stripNationalDigits,
  toE164
} from './mask'
import { resolveSystemCopy, type RendererSystemCopy } from './copy'
import { validateField, validateFields, type FieldErrors } from './validation'
import { createTelemetryEmitter, type TelemetryEmitter, type TelemetryPayload } from './telemetry'
import { submitPublicForm, verifyPublicEmail, type RendererApiConfig } from './api-client'
import { RENDERER_VERSION } from './version'
import { TurnstileTokenClient } from './turnstile'
import { resolveValidatorName, validateFormValue } from '@/lib/growth/forms/validators/core'

export interface FormRendererOptions {
  root: HTMLElement
  contract: RenderContract
  api: RendererApiConfig
  /** Override de locale del embed; si no, usa `contract.form.locale`. */
  locale?: string
  /** Contexto de página (browser-safe) para telemetría/submit. */
  pageContext?: { pageUri?: string; pageName?: string; referrer?: string }
  /** Valores iniciales browser-safe que el host conoce (p.ej. public IDs en campos hidden). */
  initialValues?: Record<string, string | number | boolean | string[]>
  /** Inyector de fetch (tests). */
  fetchImpl?: typeof fetch
  doc?: Document
  /** Fuerza el esquema de color (si no, hereda `prefers-color-scheme`). */
  colorScheme?: 'light' | 'dark'
  /**
   * `true` cuando el core se monta DENTRO de un host `<greenhouse-form>` (custom element).
   * En ese caso el host ES el scope: declara los tokens `--ghf-*`, `container-type`,
   * `display` y la box-sizing (`greenhouse-form *`). El wrapper interno NO debe llevar
   * `.ghf-scope`, porque ese selector re-declara los tokens base y SOMBREA los overrides
   * del host (`greenhouse-form { --ghf-* }` y `appearance="bare"` dejaban de propagar al
   * contenido). Cuando es `false`/undefined (mount standalone en un div suelto, p. ej. el
   * preview interno de Greenhouse), el root SÍ recibe `.ghf-scope` como scope raíz.
   */
  hosted?: boolean
}

const el = <K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  attrs: Record<string, string> = {},
  text?: string
): HTMLElementTagNameMap[K] => {
  const node = doc.createElement(tag)

  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  if (text !== undefined) node.textContent = text

  return node
}

let idSeq = 0
const SVG_NS = 'http://www.w3.org/2000/svg'

type PresentationIcon = NonNullable<NonNullable<RendererFieldDefinition['presentation']>['icon']>
type RendererIconName = PresentationIcon | 'send' | 'spinner'

export class FormRenderer {
  private readonly doc: Document
  private readonly contract: RenderContract
  private readonly api: RendererApiConfig
  private readonly copy: RendererSystemCopy
  private readonly telemetry: TelemetryEmitter
  private readonly pageContext: NonNullable<FormRendererOptions['pageContext']>
  private readonly fetchImpl: typeof fetch
  private readonly instanceId = `ghf-${++idSeq}`
  private turnstile: TurnstileTokenClient | null = null

  private values: FieldValues = {}
  private errors: FieldErrors = {}
  /** Estado de los checkboxes de consentimiento (en state, no en DOM: sobrevive re-render). */
  private readonly consentState: Record<string, boolean> = {}
  private readonly fileValues = new Map<string, File>()
  /** Campos que ya perdieron foco al menos una vez (stage 2 del timing). */
  private readonly touched = new Set<string>()
  private currentStep = 0
  private submitting = false
  private started = false
  private destroyed = false

  // ─── Email verification (TASK-1256 Slice 2) ──────────────────────────────────
  /** Estado de la verificación de correo por campo (UX; la autoridad es `submitForm`). */
  private readonly emailVerifyState = new Map<string, 'verifying' | 'done'>()
  /** Typo-suggest devuelto por `/verify-email` por campo (afán "¿quisiste decir …?"). */
  private readonly emailSuggestions = new Map<string, string>()
  /** Timers de debounce de verificación por campo. */
  private readonly verifyTimers = new Map<string, ReturnType<typeof setTimeout>>()
  /** Endpoint OFF (404 `disabled`) → degradación honesta: dejar de llamar. */
  private emailVerifyDisabled = false
  private static readonly EMAIL_VERIFY_DEBOUNCE_MS = 450

  /** País seleccionado por campo de teléfono (selector in-field estilo HubSpot). */
  private readonly telCountry = new Map<string, string>()

  // ─── Validación reactiva (TASK-1256 Slice 1c) ────────────────────────────────
  /** Estado live por campo: neutro mientras se completa, success al validar, error al fallar. */
  private readonly fieldStatus = new Map<string, 'neutral' | 'success' | 'error'>()
  /** Timers de "punish late": muestran el error tras una pausa, no en cada tecla. */
  private readonly statusTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private static readonly STATUS_ERROR_DEBOUNCE_MS = 600

  // ─── UX hardening (TASK-1256 Slice 1d) ───────────────────────────────────────
  /** Hubo un intento de submit → muestra el resumen de errores accesible. */
  private submitAttempted = false
  /** Se restauró un borrador PII-safe de localStorage → muestra el aviso una vez. */
  private draftRestored = false
  private draftSaveTimer: ReturnType<typeof setTimeout> | null = null
  private static readonly DRAFT_DEBOUNCE_MS = 600
  private static readonly DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

  constructor(private readonly opts: FormRendererOptions) {
    this.doc = opts.doc ?? document
    this.contract = opts.contract
    this.api = opts.api
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.pageContext = opts.pageContext ?? {}
    this.copy = resolveSystemCopy(opts.locale ?? this.contract.form.locale)

    const base: TelemetryPayload = {
      form_id: this.contract.form.formId,
      form_key: this.contract.form.formKey,
      form_slug: this.contract.form.slug,
      form_version_id: this.contract.form.formVersionId,
      form_kind: this.contract.form.formKind,
      contract_version: this.contract.contractVersion,
      renderer_version: RENDERER_VERSION,
      locale: this.contract.form.locale,
      ...(this.contract.surfacePolicy.surfaceId ? { surface_id: this.contract.surfacePolicy.surfaceId } : {}),
      ...(this.pageContext.pageUri ? { page_uri: this.pageContext.pageUri } : {}),
      ...(this.pageContext.pageName ? { page_name: this.pageContext.pageName } : {})
    }

    this.telemetry = createTelemetryEmitter(opts.root, this.contract.telemetryPolicy, base)

    for (const field of this.contract.fields) {
      if (field.type === 'consent' || field.type === 'checkbox') this.values[field.key] = false
      else if (field.type === 'multiselect') this.values[field.key] = []
      else this.values[field.key] = ''
    }

    for (const [key, value] of Object.entries(opts.initialValues ?? {})) {
      const field = this.contract.fields.find(candidate => candidate.key === key)

      if (!field) continue
      if (field.type === 'file' || field.type === 'consent' || field.type === 'checkbox') continue

      if (field.type === 'multiselect') {
        this.values[key] = Array.isArray(value) ? value.map(String) : []
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        this.values[key] = String(value)
      }
    }

    // Restaura un borrador PII-safe (sin cédula/consent) si existe (TASK-1256 Slice 1d).
    try {
      if (this.restoreDraft()) this.draftRestored = true
    } catch {
      // best-effort: un borrador corrupto nunca rompe el montaje.
    }
  }

  // ─── Steps ──────────────────────────────────────────────────────────────────

  private get steps(): RendererStep[] | null {
    if (this.contract.composition !== 'multi_step_light') return null
    const steps = this.contract.steps

    return steps && steps.length > 0 ? steps : null
  }

  private fieldsForStep(): RendererFieldDefinition[] {
    const steps = this.steps

    if (!steps) return this.contract.fields
    const keys = new Set(steps[this.currentStep]?.fieldKeys ?? [])

    return this.contract.fields.filter(f => keys.has(f.key))
  }

  // ─── Render ───────────────────────────────────────────────────────────────--

  mount(): void {
    // El scope del renderer (tokens `--ghf-*` + container-type + box-sizing) lo provee
    // `.ghf-scope` en el mount standalone (div suelto / preview interno Greenhouse).
    // Dentro de un host `<greenhouse-form>` el HOST ya es el scope: añadir `.ghf-scope`
    // al wrapper interno re-declararía los tokens base y sombrearía los overrides del
    // host (`greenhouse-form { --ghf-* }` y `appearance="bare"`). Por eso solo se marca
    // cuando NO está hosted. Ver `FormRendererOptions.hosted`.
    if (!this.opts.hosted) {
      this.opts.root.classList.add('ghf-scope')
    }

    if (this.opts.colorScheme) this.opts.root.setAttribute('data-color-scheme', this.opts.colorScheme)
    if (this.contract.styleVariant) this.opts.root.setAttribute('data-ghf-style-variant', this.contract.styleVariant)
    this.telemetry.emit('gh_form_viewed', {})
    this.renderForm()
  }

  destroy(): void {
    this.destroyed = true
    for (const timer of this.verifyTimers.values()) clearTimeout(timer)
    this.verifyTimers.clear()
    for (const timer of this.statusTimers.values()) clearTimeout(timer)
    this.statusTimers.clear()
    if (this.draftSaveTimer) clearTimeout(this.draftSaveTimer)
    this.turnstile?.destroy()
    this.turnstile = null
    this.opts.root.replaceChildren()
  }

  private renderForm(): void {
    if (this.destroyed) return
    const root = this.opts.root

    root.replaceChildren()

    const form = el(this.doc, 'form', { class: 'ghf-form', novalidate: 'novalidate' })

    form.addEventListener('submit', e => {
      e.preventDefault()
      void this.handlePrimaryAction()
    })

    // Aviso de borrador recuperado (una sola vez, no intrusivo) — TASK-1256 Slice 1d.
    if (this.draftRestored) {
      form.appendChild(el(this.doc, 'p', { class: 'ghf-draft-note', role: 'status' }, this.copy.draftRestored))
    }

    // Resumen de errores accesible (patrón GOV.UK) tras un intento de envío.
    if (this.submitAttempted) {
      const summary = this.buildErrorSummary()

      if (summary) form.appendChild(summary)
    }

    const steps = this.steps

    if (steps) {
      form.appendChild(this.renderStepProgress(steps))
    }

    if (this.usesCareersStaticFidelity()) {
      form.appendChild(this.renderCareersStaticProgress())
      form.appendChild(this.renderCareersStaticFields())
    } else {
      const fieldsWrap = el(this.doc, 'div', { class: 'ghf-fields' })

      for (const field of this.fieldsForStep()) {
        if (field.type === 'hidden') continue
        if (!isFieldVisible(field, this.values)) continue
        fieldsWrap.appendChild(this.renderField(field))
      }

      form.appendChild(fieldsWrap)
    }

    if (steps && this.currentStep > 0) {
      form.appendChild(this.renderIntakeSummary(steps))
    }

    if (this.isLastStep()) {
      const consentNode = this.renderConsent()

      if (consentNode) form.appendChild(consentNode)
    }

    // Honeypot anti-bot (oculto, no requerido). Nombre impredecible para evitar autofill legítimo.
    const honey = el(this.doc, 'div', { class: 'ghf-honeypot', 'aria-hidden': 'true' })

    const honeyInput = el(this.doc, 'input', {
      type: 'text',
      name: `${this.instanceId}_url_optional`,
      tabindex: '-1',
      autocomplete: 'new-password',
      readonly: 'readonly',
      'data-lpignore': 'true',
      'data-1p-ignore': 'true',
      'data-bwignore': 'true'
    })

    honeyInput.dataset.ghfHoneypot = 'true'
    honey.appendChild(honeyInput)
    form.appendChild(honey)

    form.appendChild(this.renderActions())

    const summary = el(this.doc, 'p', { class: 'ghf-summary', role: 'alert', 'aria-live': 'assertive' })

    summary.dataset.ghfSummary = 'true'
    form.appendChild(summary)

    root.appendChild(form)

    // Re-aplica el estado de verificación de correo (sobrevive a re-renders completos).
    for (const f of this.fieldsForStep()) {
      if (f.type === 'email' && (this.emailVerifyState.has(f.key) || this.emailSuggestions.has(f.key))) {
        this.patchEmailVerifyDom(f)
      }
    }

    this.patchReadinessHint()
  }

  private usesCareersStaticFidelity(): boolean {
    return (
      this.contract.styleVariant === 'careers-html-fidelity' &&
      this.contract.form.formKind === 'application' &&
      this.contract.composition === 'static'
    )
  }

  private renderCareersStaticProgress(): HTMLElement {
    const percent = this.careersStaticProgressPercent()
    const shell = el(this.doc, 'div', { class: 'ghf-careers-progress-shell' })
    const meta = el(this.doc, 'div', { class: 'ghf-careers-progress-meta' })

    const track = el(this.doc, 'div', {
      class: 'ghf-careers-progress-track',
      role: 'progressbar',
      'aria-label': 'Progreso de postulación',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': String(percent)
    })

    const bar = el(this.doc, 'div', { class: 'ghf-careers-progress-bar' })

    bar.dataset.ghfCareersProgressBar = 'true'
    bar.style.width = `${percent}%`
    meta.appendChild(el(this.doc, 'span', {}, 'Completa tu postulación'))
    meta.appendChild(
      el(this.doc, 'span', { class: 'ghf-careers-progress-percent', 'data-ghf-careers-progress-percent': 'true' }, `${percent}%`)
    )
    track.appendChild(bar)
    shell.appendChild(meta)
    shell.appendChild(track)

    return shell
  }

  private careersStaticProgressPercent(): number {
    const total = Math.max(1, this.remainingBlockers() + this.completedRequiredBlockers())
    const completed = Math.max(0, total - this.remainingBlockers())

    return Math.round((completed / total) * 100)
  }

  private patchCareersStaticProgress(): void {
    if (!this.usesCareersStaticFidelity()) return
    const percent = this.careersStaticProgressPercent()
    const label = this.opts.root.querySelector<HTMLElement>('[data-ghf-careers-progress-percent]')
    const bar = this.opts.root.querySelector<HTMLElement>('[data-ghf-careers-progress-bar]')
    const track = this.opts.root.querySelector<HTMLElement>('.ghf-careers-progress-track')

    if (label) label.textContent = `${percent}%`
    if (bar) bar.style.width = `${percent}%`
    if (track) track.setAttribute('aria-valuenow', String(percent))
  }

  private completedRequiredBlockers(): number {
    let count = 0

    for (const field of this.contract.fields) {
      if (field.type === 'hidden') continue
      if (!isFieldVisible(field, this.values)) continue
      if (!isFieldRequired(field, this.values)) continue
      if (!validateField(field, this.values, this.copy)) count += 1
    }

    for (const box of this.contract.consent?.checkboxes ?? []) {
      if (box.required !== false && this.consentState[box.key] === true) count += 1
    }

    return count
  }

  private renderCareersStaticFields(): HTMLElement {
    const visibleFields = this.fieldsForStep().filter(field => field.type !== 'hidden' && isFieldVisible(field, this.values))
    const byKey = new Map(visibleFields.map(field => [field.key, field]))
    const consumed = new Set<string>()
    const shell = el(this.doc, 'div', { class: 'ghf-careers-fields' })

    const sections = [
      { marker: '01', title: 'Tus datos', fieldKeys: ['firstName', 'lastName', 'email', 'phone'] },
      { marker: '02', title: 'Tu perfil', fieldKeys: ['portfolioUrl', 'linkedinUrl', 'availability', 'cvFile'] },
      { marker: '03', title: 'Cuéntanos más', fieldKeys: ['message'] }
    ]

    for (const section of sections) {
      const fields = section.fieldKeys.map(key => byKey.get(key)).filter((field): field is RendererFieldDefinition => Boolean(field))

      if (fields.length === 0) continue
      fields.forEach(field => consumed.add(field.key))
      shell.appendChild(this.renderCareersStaticSection(section.marker, section.title, fields))
    }

    const fallback = visibleFields.filter(field => !consumed.has(field.key))

    if (fallback.length > 0) shell.appendChild(this.renderCareersStaticSection('04', 'Datos adicionales', fallback))

    return shell
  }

  private renderCareersStaticSection(marker: string, title: string, fields: RendererFieldDefinition[]): HTMLElement {
    const section = el(this.doc, 'section', { class: 'ghf-careers-section', 'aria-label': title })
    const header = el(this.doc, 'div', { class: 'ghf-careers-section-header' })
    const fieldsWrap = el(this.doc, 'div', { class: 'ghf-fields ghf-careers-section-fields' })

    header.appendChild(el(this.doc, 'span', { class: 'ghf-careers-section-marker', 'aria-hidden': 'true' }, marker))
    header.appendChild(el(this.doc, 'span', { class: 'ghf-careers-section-title' }, title))
    header.appendChild(el(this.doc, 'span', { class: 'ghf-careers-section-rule', 'aria-hidden': 'true' }))

    for (const field of fields) fieldsWrap.appendChild(this.renderField(field))

    section.appendChild(header)
    section.appendChild(fieldsWrap)

    return section
  }

  private renderStepProgress(steps: RendererStep[]): HTMLElement {
    const shell = el(this.doc, 'div', { class: 'ghf-progress-shell' })
    const currentLabel = steps[this.currentStep]?.label?.trim()

    const progress = el(
      this.doc,
      'p',
      { class: 'ghf-progress', 'aria-live': 'polite', tabindex: '-1' },
      `${currentLabel ? `${currentLabel} · ` : ''}${this.copy.stepProgress(this.currentStep + 1, steps.length)} · ${this.copy.stepEffort(steps.length)}`
    )

    const nav = el(this.doc, 'nav', { class: 'ghf-stepper', 'aria-label': this.copy.stepperAria })
    const list = el(this.doc, 'ol', { class: 'ghf-stepper-list' })

    steps.forEach((step, index) => {
      const label = step.label?.trim() || this.copy.stepProgress(index + 1, steps.length)
      const state = index < this.currentStep ? 'complete' : index === this.currentStep ? 'current' : 'upcoming'
      const item = el(this.doc, 'li', { class: 'ghf-stepper-item', 'data-state': state })

      const marker = el(
        this.doc,
        'span',
        { class: 'ghf-stepper-marker', 'aria-hidden': 'true' },
        state === 'complete' ? '✓' : String(index + 1)
      )

      const text = el(this.doc, 'span', { class: 'ghf-stepper-label' }, label)

      const status =
        state === 'complete'
          ? this.copy.stepStatusComplete(label)
          : state === 'current'
            ? this.copy.stepStatusCurrent(label)
            : this.copy.stepStatusUpcoming(label)

      if (state === 'current') item.setAttribute('aria-current', 'step')
      item.appendChild(marker)
      item.appendChild(text)
      item.appendChild(el(this.doc, 'span', { class: 'ghf-sr-only' }, status))
      list.appendChild(item)
    })

    nav.appendChild(list)
    shell.appendChild(progress)
    shell.appendChild(nav)

    return shell
  }

  private renderIntakeSummary(steps: RendererStep[]): HTMLElement {
    const summary = el(this.doc, 'aside', { class: 'ghf-intake-summary', 'aria-label': this.copy.intakeSummaryTitle })
    const title = el(this.doc, 'p', { class: 'ghf-intake-summary__title' }, this.copy.intakeSummaryTitle)
    const list = el(this.doc, 'ul', { class: 'ghf-intake-summary__list' })
    let completedSteps = 0

    for (const step of steps) {
      const label = step.label?.trim() || step.key

      const visibleFields = this.contract.fields.filter(
        field => step.fieldKeys.includes(field.key) && field.type !== 'hidden' && isFieldVisible(field, this.values)
      )

      const requiredFields = visibleFields.filter(field => isFieldRequired(field, this.values))
      const requiredErrors = validateFields(requiredFields, this.values, this.copy)
      const hasAnyValue = visibleFields.some(field => !this.isFieldEmpty(field.key))
      const missingRequired = Object.keys(requiredErrors).length

      const status =
        requiredFields.length === 0
          ? hasAnyValue
            ? this.copy.stepSummaryOptionalAdded(label)
            : this.copy.stepSummaryOptionalAvailable(label)
          : missingRequired === 0
            ? this.copy.stepSummaryComplete(label)
            : this.copy.stepSummaryPending(label, missingRequired)

      if (requiredFields.length === 0 ? hasAnyValue : missingRequired === 0) completedSteps += 1

      const marker = requiredFields.length === 0 ? (hasAnyValue ? '✓' : '○') : missingRequired === 0 ? '✓' : '•'
      const item = el(this.doc, 'li', { class: 'ghf-intake-summary__item' })

      item.appendChild(el(this.doc, 'span', { 'aria-hidden': 'true' }, marker))
      item.appendChild(el(this.doc, 'span', {}, status))
      list.appendChild(item)
    }

    summary.appendChild(title)
    summary.appendChild(
      el(
        this.doc,
        'p',
        { class: 'ghf-intake-summary__meta' },
        `${this.copy.intakeSummaryProgress(completedSteps, steps.length)} · ${this.copy.intakeSummaryPrivacy}`
      )
    )
    summary.appendChild(list)

    return summary
  }

  private renderField(field: RendererFieldDefinition): HTMLElement {
    const fieldId = `${this.instanceId}-${field.key}`
    const errorId = `${fieldId}-error`
    const rawHelpText = this.contract.copy?.[`${field.key}.help`]

    const helpText =
      rawHelpText && !(this.contract.styleVariant === 'careers-html-fidelity' && field.type === 'file')
        ? rawHelpText
        : undefined

    const helpId = helpText ? `${fieldId}-help` : undefined
    const required = isFieldRequired(field, this.values)
    const error = this.errors[field.key]
    const fullWidth = this.fieldPrefersFullWidth(field)

    const wrap = el(this.doc, 'div', {
      class: `ghf-field${fullWidth ? ' ghf-field--full' : ''}`,
      'data-invalid': error ? 'true' : 'false',
      'data-status': this.fieldStatus.get(field.key) ?? 'neutral',
      'data-ghf-field-key': field.key,
    })

    const label = this.fieldLabel(field)

    if (field.type !== 'checkbox' && field.type !== 'consent') {
      const labelEl = el(this.doc, 'label', { class: 'ghf-label', for: fieldId })

      if (field.presentation?.icon && !this.usesInlineControlIcons()) {
        labelEl.appendChild(
          el(
            this.doc,
            'span',
            { class: 'ghf-field-icon', 'aria-hidden': 'true', 'data-icon': field.presentation.icon },
            this.fieldIconGlyph(field.presentation.icon)
          )
        )
      }

      labelEl.appendChild(el(this.doc, 'span', {}, label))

      if (required) labelEl.appendChild(el(this.doc, 'span', { class: 'ghf-required', 'aria-hidden': 'true' }, '*'))
      else if (!this.labelAlreadyMarksOptional(label))
        labelEl.appendChild(el(this.doc, 'span', { class: 'ghf-optional' }, '(opcional)'))
      wrap.appendChild(labelEl)
    }

    const describedBy = [helpId, error ? errorId : undefined].filter(Boolean).join(' ')
    const control = this.renderControl(field, fieldId, required, describedBy)

    // Campos de entrada de una línea muestran el ícono de estado reactivo (✓ al validar).
    const supportsStatusIcon = ['text', 'email', 'tel', 'url', 'national_id', 'number', 'date'].includes(field.type)

    if (field.type === 'checkbox' || field.type === 'consent') {
      // Layout label-al-lado para checkboxes.
      const checkWrap = el(this.doc, 'label', { class: 'ghf-check', for: fieldId })

      checkWrap.appendChild(control)
      checkWrap.appendChild(el(this.doc, 'span', {}, label))
      wrap.appendChild(checkWrap)
    } else if (control.classList.contains('ghf-tag-input')) {
      wrap.appendChild(control)
    } else if (field.type === 'select' || field.type === 'multiselect') {
      const hasLeadingIcon = this.shouldRenderControlIcon(field)

      const controlWrap = el(this.doc, 'div', {
        class: `ghf-control ghf-control--select${hasLeadingIcon ? ' ghf-control--with-icon' : ''}`
      })

      const customSelect = control.classList.contains('ghf-select-composite')

      if (hasLeadingIcon && field.presentation?.icon) {
        controlWrap.appendChild(this.renderIcon(field.presentation.icon, 'ghf-control-icon'))
      }

      controlWrap.appendChild(control)
      if (field.type === 'select' && !customSelect)
        controlWrap.appendChild(el(this.doc, 'span', { class: 'ghf-select-icon', 'aria-hidden': 'true' }))
      wrap.appendChild(controlWrap)
    } else if (supportsStatusIcon) {
      const hasLeadingIcon = this.shouldRenderControlIcon(field) && field.type !== 'tel'

      const controlWrap = el(this.doc, 'div', {
        class: `ghf-control${field.type === 'tel' ? ' ghf-control--tel' : ''}${hasLeadingIcon ? ' ghf-control--with-icon' : ''}`
      })

      if (hasLeadingIcon && field.presentation?.icon) {
        controlWrap.appendChild(this.renderIcon(field.presentation.icon, 'ghf-control-icon'))
      }

      controlWrap.appendChild(control)
      controlWrap.appendChild(el(this.doc, 'span', { class: 'ghf-status-icon', 'aria-hidden': 'true' }))
      wrap.appendChild(controlWrap)
    } else if (this.shouldRenderControlIcon(field)) {
      const controlWrap = el(this.doc, 'div', { class: 'ghf-control ghf-control--textarea ghf-control--with-icon' })

      if (field.presentation?.icon) controlWrap.appendChild(this.renderIcon(field.presentation.icon, 'ghf-control-icon'))
      controlWrap.appendChild(control)
      wrap.appendChild(controlWrap)
    } else {
      wrap.appendChild(control)
    }

    if (helpText && helpId) wrap.appendChild(el(this.doc, 'p', { class: 'ghf-help', id: helpId }, helpText))
    if (error) wrap.appendChild(el(this.doc, 'p', { class: 'ghf-error', id: errorId, role: 'alert' }, error))

    // Contador de caracteres para campos con límite (aria-hidden: el maxlength nativo es
    // el contrato SR; el contador es ayuda visual). TASK-1256 Slice 1d.
    if (field.maxLength && field.type === 'textarea') {
      const current = typeof this.values[field.key] === 'string' ? (this.values[field.key] as string).length : 0

      const counter = el(
        this.doc,
        'p',
        { class: 'ghf-counter', 'aria-hidden': 'true' },
        `${current} / ${field.maxLength}`
      )

      counter.dataset.near = current >= field.maxLength * 0.9 ? 'true' : 'false'
      wrap.appendChild(counter)
    }

    return wrap
  }

  private fieldPrefersFullWidth(field: RendererFieldDefinition): boolean {
    if (this.usesCareersStaticFidelity()) {
      if (field.key === 'firstName' || field.key === 'lastName') return false
      if (['email', 'tel', 'select', 'url', 'date', 'number'].includes(field.type)) return true
    }

    if (
      field.type === 'textarea' ||
      field.type === 'multiselect' ||
      field.type === 'checkbox' ||
      field.type === 'consent' ||
      field.type === 'file'
    ) {
      return true
    }

    if (field.type === 'url' || field.type === 'national_id') return true

    if (field.type === 'text') {
      return !field.maxLength || field.maxLength > 160
    }

    return false
  }

  private fieldLabel(field: RendererFieldDefinition): string {
    if (field.label) return field.label
    if (field.copyRef && this.contract.copy?.[field.copyRef]) return this.contract.copy[field.copyRef]

    return field.key
  }

  private labelAlreadyMarksOptional(label: string): boolean {
    return /\b(opcional|optional)\b/i.test(label)
  }

  private renderControl(
    field: RendererFieldDefinition,
    fieldId: string,
    required: boolean,
    describedBy: string
  ): HTMLElement {
    const common: Record<string, string> = { id: fieldId, name: field.key }

    if (describedBy) common['aria-describedby'] = describedBy
    if (this.errors[field.key]) common['aria-invalid'] = 'true'
    if (required) common['aria-required'] = 'true'
    if (field.autocomplete) common.autocomplete = field.autocomplete
    if (field.inputMode) common.inputmode = field.inputMode

    const current = this.values[field.key]

    switch (field.type) {
      case 'textarea': {
        const ta = el(this.doc, 'textarea', { ...common, class: 'ghf-textarea' })

        if (field.maxLength) ta.setAttribute('maxlength', String(field.maxLength))
        if (field.placeholder) ta.setAttribute('placeholder', field.placeholder)
        ta.value = typeof current === 'string' ? current : ''
        this.wireText(field, ta)

        return ta
      }

      case 'select':
        if (this.usesPremiumSelect()) return this.renderPremiumSelectControl(field, common)

      case 'multiselect': {
        if (field.type === 'multiselect' && field.freeEntry) return this.renderTagMultiSelectControl(field, common)

        const select = el(this.doc, 'select', { ...common, class: 'ghf-select' })

        if (field.type === 'multiselect') select.setAttribute('multiple', 'multiple')
        const hasBlankOption = field.options?.some(opt => opt.value === '') ?? false

        if (!required && field.type === 'select' && !hasBlankOption) {
          select.appendChild(el(this.doc, 'option', { value: '' }, field.placeholder ?? '—'))
        }

        for (const opt of field.options ?? []) {
          select.appendChild(el(this.doc, 'option', { value: opt.value }, opt.label ?? opt.value))
        }

        select.addEventListener('change', () => {
          this.values[field.key] =
            field.type === 'multiselect' ? Array.from(select.selectedOptions).map(o => o.value) : select.value
          this.onValueChange(field)
        })

        return select
      }

      case 'checkbox':

      case 'consent': {
        const cb = el(this.doc, 'input', { ...common, type: 'checkbox' })

        cb.checked = current === true
        cb.addEventListener('change', () => {
          this.values[field.key] = cb.checked
          this.touched.add(field.key)
          this.onValueChange(field)
        })

        return cb
      }

      case 'tel':
        return this.renderTelControl(field, common)

      case 'file':
        return this.renderFileControl(field, common)

      default: {
        const inputType =
          field.type === 'number'
            ? 'number'
            : field.type === 'date'
              ? 'date'
              : field.type === 'email'
                ? 'email'
                : field.type === 'url'
                  ? 'url'
                  : 'text'

        const input = el(this.doc, 'input', { ...common, type: inputType, class: 'ghf-input' })

        if (field.maxLength) input.setAttribute('maxlength', String(field.maxLength))
        if (field.placeholder) input.setAttribute('placeholder', field.placeholder)
        input.value = typeof current === 'string' ? current : ''
        this.wireText(field, input)

        return input
      }
    }
  }

  private usesPremiumSelect(): boolean {
    return this.contract.styleVariant === 'diagnostic_premium' || this.contract.styleVariant === 'careers-html-fidelity'
  }

  private usesInlineControlIcons(): boolean {
    return this.contract.styleVariant === 'careers-html-fidelity'
  }

  private shouldRenderControlIcon(field: RendererFieldDefinition): boolean {
    if (!this.usesInlineControlIcons() || !field.presentation?.icon) return false

    return ['text', 'email', 'tel', 'url', 'national_id', 'number', 'date', 'textarea', 'select'].includes(field.type)
  }

  private renderIcon(icon: RendererIconName, className: string): HTMLElement {
    const wrap = el(this.doc, 'span', { class: className, 'aria-hidden': 'true', 'data-icon': icon })

    if (icon === 'linkedin') {
      wrap.appendChild(el(this.doc, 'span', { class: 'ghf-icon-text' }, 'in'))

      return wrap
    }

    const svg = this.doc.createElementNS(SVG_NS, 'svg')

    const append = (tag: string, attrs: Record<string, string>) => {
      const node = this.doc.createElementNS(SVG_NS, tag)

      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
      svg.appendChild(node)
    }

    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')

    switch (icon) {
      case 'mail':
        append('rect', { x: '3', y: '5', width: '18', height: '14', rx: '2' })
        append('path', { d: 'm4 7 8 6 8-6' })
        break
      case 'phone':
        append('path', {
          d: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z'
        })
        break
      case 'link':
        append('path', { d: 'M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2' })
        append('path', { d: 'M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.2-1.2' })
        break
      case 'globe':
        append('circle', { cx: '12', cy: '12', r: '10' })
        append('path', { d: 'M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20' })
        break
      case 'briefcase':
        append('path', { d: 'M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1' })
        append('rect', { x: '3', y: '7', width: '18', height: '13', rx: '2' })
        append('path', { d: 'M3 13h18M12 13v2' })
        break
      case 'calendar':
        append('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2' })
        append('path', { d: 'M16 2v4M8 2v4M3 10h18' })
        break
      case 'clock':
        append('circle', { cx: '12', cy: '12', r: '10' })
        append('path', { d: 'M12 6v6l4 2' })
        break
      case 'message':
        append('path', { d: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z' })
        break
      case 'file':
        append('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' })
        append('path', { d: 'M17 8a5 5 0 0 0-9.8-1.5A4.5 4.5 0 0 0 7.5 15H9' })
        append('path', { d: 'M12 12v7M8.5 15.5 12 12l3.5 3.5' })
        break
      case 'send':
        append('path', { d: 'm22 2-7 20-4-9-9-4Z' })
        append('path', { d: 'M22 2 11 13' })
        break
      case 'spinner':
        append('path', { d: 'M21 12a9 9 0 1 1-6.2-8.6' })
        break
      case 'user':
      default:
        append('circle', { cx: '12', cy: '7', r: '4' })
        append('path', { d: 'M5.5 21a6.5 6.5 0 0 1 13 0' })
        break
    }

    wrap.appendChild(svg)

    return wrap
  }

  private fieldIconGlyph(icon: PresentationIcon): string {
    switch (icon) {
      case 'mail':
        return '@'
      case 'phone':
        return '+'
      case 'link':
      case 'globe':
        return '↗'
      case 'linkedin':
        return 'in'
      case 'briefcase':
        return '·'
      case 'calendar':
        return '31'
      case 'clock':
        return '12'
      case 'message':
        return '…'
      case 'file':
        return 'CV'
      case 'user':
      default:
        return 'ID'
    }
  }

  private selectOptionsFor(field: RendererFieldDefinition): { value: string; label: string }[] {
    const hasBlankOption = field.options?.some(opt => opt.value === '') ?? false
    const options = [...(field.options ?? [])]

    if (!isFieldRequired(field, this.values) && !hasBlankOption) {
      options.unshift({ value: '', label: field.placeholder ?? '—' })
    }

    return options.map(option => ({
      value: option.value,
      label:
        option.copyRef && this.contract.copy?.[option.copyRef]
          ? this.contract.copy[option.copyRef]
          : (option.label ?? option.value)
    }))
  }

  private renderPremiumSelectControl(field: RendererFieldDefinition, common: Record<string, string>): HTMLElement {
    const options = this.selectOptionsFor(field)
    const current = typeof this.values[field.key] === 'string' ? (this.values[field.key] as string) : ''
    const selectedIndex = options.findIndex(option => option.value === current)
    const initialIndex = selectedIndex >= 0 ? selectedIndex : 0
    const listId = `${common.id}-listbox`
    let activeIndex = initialIndex
    let open = false

    const wrap = el(this.doc, 'div', { class: 'ghf-select-composite' })

    const trigger = el(this.doc, 'button', {
      ...common,
      type: 'button',
      class: 'ghf-select ghf-select-trigger',
      role: 'combobox',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': listId
    })

    const valueText = el(this.doc, 'span', { class: 'ghf-select-value' })
    const icon = el(this.doc, 'span', { class: 'ghf-select-icon', 'aria-hidden': 'true' })
    const list = el(this.doc, 'div', { class: 'ghf-select-list', id: listId, role: 'listbox', hidden: 'hidden' })

    const renderSelected = () => {
      const selected = options.find(option => option.value === this.values[field.key]) ?? options[0]

      valueText.textContent = selected?.label ?? ''
      trigger.dataset.placeholder = selected?.value ? 'false' : 'true'
    }

    const setActive = (index: number) => {
      activeIndex = Math.max(0, Math.min(options.length - 1, index))

      list.querySelectorAll<HTMLElement>('.ghf-select-option').forEach((option, optionIndex) => {
        const isActive = optionIndex === activeIndex

        option.dataset.active = isActive ? 'true' : 'false'

        if (isActive) {
          trigger.setAttribute('aria-activedescendant', option.id)
          option.scrollIntoView?.({ block: 'nearest' })
        }
      })
    }

    const setOpen = (next: boolean) => {
      open = next
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false')
      wrap.dataset.open = open ? 'true' : 'false'
      const fieldWrap = wrap.closest('.ghf-field')

      if (fieldWrap) {
        if (open) fieldWrap.setAttribute('data-overlay-open', 'true')
        else fieldWrap.removeAttribute('data-overlay-open')
      }

      if (open) {
        list.hidden = false
        setActive(activeIndex)
      } else {
        list.hidden = true
        trigger.removeAttribute('aria-activedescendant')
      }
    }

    const choose = (index: number) => {
      const option = options[index]

      if (!option) return
      this.values[field.key] = option.value
      this.touched.add(field.key)
      renderSelected()
      list.querySelectorAll<HTMLElement>('.ghf-select-option').forEach((item, optionIndex) => {
        item.setAttribute('aria-selected', optionIndex === index ? 'true' : 'false')
      })
      setActive(index)
      setOpen(false)
      trigger.focus()
      this.liveStatus(field)
      this.onValueChange(field)
    }

    trigger.appendChild(valueText)
    trigger.appendChild(icon)
    wrap.appendChild(trigger)

    options.forEach((option, index) => {
      const item = el(this.doc, 'div', {
        id: `${common.id}-option-${index}`,
        class: 'ghf-select-option',
        role: 'option',
        'aria-selected': index === initialIndex ? 'true' : 'false',
        'data-value': option.value
      })

      item.appendChild(el(this.doc, 'span', { class: 'ghf-select-option-label' }, option.label))
      item.addEventListener('mousedown', event => event.preventDefault())
      item.addEventListener('click', () => choose(index))
      list.appendChild(item)
    })

    wrap.appendChild(list)
    renderSelected()
    setActive(initialIndex)

    trigger.addEventListener('click', () => setOpen(!open))
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!open) setOpen(true)
        setActive(activeIndex + 1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (!open) setOpen(true)
        setActive(activeIndex - 1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        if (!open) setOpen(true)
        setActive(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        if (!open) setOpen(true)
        setActive(options.length - 1)
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (open) choose(activeIndex)
        else setOpen(true)
      } else if (event.key === 'Escape') {
        if (open) {
          event.preventDefault()
          setOpen(false)
        }
      }
    })

    wrap.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!wrap.contains(this.doc.activeElement)) setOpen(false)
      }, 0)
    })

    return wrap
  }

  private renderTagMultiSelectControl(field: RendererFieldDefinition, common: Record<string, string>): HTMLElement {
    const maxItems = Math.max(1, Math.min(field.maxItems ?? 5, 50))
    const wrap = el(this.doc, 'div', { class: 'ghf-tag-input', 'data-maxed': 'false' })
    const list = el(this.doc, 'div', { class: 'ghf-tag-list', 'aria-live': 'polite' })

    const input = el(this.doc, 'input', {
      ...common,
      type: 'text',
      class: 'ghf-tag-entry',
      autocomplete: 'off',
      inputmode: 'text',
    })

    if (field.placeholder) input.setAttribute('placeholder', field.placeholder)
    if (field.maxLength) input.setAttribute('maxlength', String(field.maxLength))

    const currentValues = (): string[] => {
      const value = this.values[field.key]

      return Array.isArray(value) ? value : []
    }

    const setValues = (values: string[]) => {
      this.values[field.key] = values
      this.touched.add(field.key)
      this.liveStatus(field)
      this.onValueChange(field)
    }

    const renderTags = () => {
      const values = currentValues()

      list.replaceChildren()
      wrap.dataset.maxed = values.length >= maxItems ? 'true' : 'false'
      input.disabled = values.length >= maxItems
      input.setAttribute('aria-disabled', input.disabled ? 'true' : 'false')
      input.setAttribute('placeholder', values.length >= maxItems ? `Máximo ${maxItems}` : field.placeholder ?? '')

      values.forEach((value, index) => {
        const chip = el(this.doc, 'span', { class: 'ghf-tag-chip' })
        const label = el(this.doc, 'span', { class: 'ghf-tag-label' }, value)

        const remove = el(this.doc, 'button', {
          type: 'button',
          class: 'ghf-tag-remove',
          'aria-label': `Quitar ${value}`,
        }, '×')

        remove.addEventListener('click', () => {
          setValues(currentValues().filter((_, itemIndex) => itemIndex !== index))
          renderTags()
          input.focus()
        })

        chip.appendChild(label)
        chip.appendChild(remove)
        list.appendChild(chip)
      })
    }

    const addTag = (raw: string): boolean => {
      const next = raw.replace(/,$/, '').trim().replace(/\s+/g, ' ')

      if (!next) return false

      const values = currentValues()
      const exists = values.some(value => value.toLocaleLowerCase('es-CL') === next.toLocaleLowerCase('es-CL'))

      if (exists || values.length >= maxItems) return false

      setValues([...values, next])
      input.value = ''
      renderTags()

      return true
    }

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault()
        addTag(input.value)
      } else if (event.key === 'Backspace' && input.value === '') {
        const values = currentValues()

        if (values.length > 0) {
          event.preventDefault()
          setValues(values.slice(0, -1))
          renderTags()
        }
      }
    })

    input.addEventListener('input', () => {
      if (input.value.includes(',')) {
        const parts = input.value.split(',')
        const rest = parts.pop() ?? ''

        parts.forEach(part => addTag(part))
        input.value = rest
      }

      this.maybeStart()
      this.onFieldEdited()
    })

    input.addEventListener('blur', () => {
      addTag(input.value)
      this.revalidateField(field)
    })

    wrap.appendChild(list)
    wrap.appendChild(input)
    renderTags()

    return wrap
  }

  private renderFileControl(field: RendererFieldDefinition, common: Record<string, string>): HTMLElement {
    if (this.contract.styleVariant === 'careers-html-fidelity') return this.renderCareersFileControl(field, common)

    const wrap = el(this.doc, 'div', { class: 'ghf-file' })
    const input = el(this.doc, 'input', { ...common, type: 'file', class: 'ghf-file-input' })
    const status = el(this.doc, 'p', { class: 'ghf-file-status', 'aria-live': 'polite' })
    const policy = field.uploadPolicy
    const selected = this.fileValues.get(field.key)

    if (policy?.acceptedMimeTypes.length) input.setAttribute('accept', policy.acceptedMimeTypes.join(','))
    if (selected) status.textContent = this.copy.fileSelected
    else if (policy?.maxBytes) status.textContent = this.copy.fileHint(policy.maxBytes)

    input.addEventListener('change', () => {
      const file = input.files?.[0] ?? null

      delete this.errors[field.key]

      if (!file) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        status.textContent = policy?.maxBytes ? this.copy.fileHint(policy.maxBytes) : ''
        this.touched.add(field.key)
        this.revalidateField(field)
        this.onValueChange(field)

        return
      }

      if (!policy) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        this.errors[field.key] = this.copy.fileUnsupported
        status.textContent = ''
        this.touched.add(field.key)
        this.patchFieldErrorDom(field.key)
        this.setFieldStatus(field, 'error')
        this.maybeStart()
        this.onFieldEdited()

        return
      }

      if (file.size <= 0) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        this.errors[field.key] = this.copy.fileEmpty
        status.textContent = ''
        this.touched.add(field.key)
        this.patchFieldErrorDom(field.key)
        this.setFieldStatus(field, 'error')
        this.maybeStart()
        this.onFieldEdited()

        return
      }

      if (file.size > policy.maxBytes) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        this.errors[field.key] = this.copy.fileTooLarge(policy.maxBytes)
        status.textContent = ''
        this.touched.add(field.key)
        this.patchFieldErrorDom(field.key)
        this.setFieldStatus(field, 'error')
        this.maybeStart()
        this.onFieldEdited()

        return
      }

      if (file.type && !policy.acceptedMimeTypes.includes(file.type)) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        this.errors[field.key] = this.copy.fileUnsupported
        status.textContent = ''
        this.touched.add(field.key)
        this.patchFieldErrorDom(field.key)
        this.setFieldStatus(field, 'error')
        this.maybeStart()
        this.onFieldEdited()

        return
      }

      this.fileValues.set(field.key, file)
      this.values[field.key] = 'selected'
      status.textContent = this.copy.fileSelected
      this.touched.add(field.key)
      this.revalidateField(field)
      this.onValueChange(field)
    })

    wrap.appendChild(input)
    wrap.appendChild(status)

    return wrap
  }

  private renderCareersFileControl(field: RendererFieldDefinition, common: Record<string, string>): HTMLElement {
    const wrap = el(this.doc, 'div', { class: 'ghf-file' })
    const input = el(this.doc, 'input', { ...common, type: 'file', class: 'ghf-file-input' })
    const dropzone = el(this.doc, 'label', { class: 'ghf-file-dropzone', for: common.id })
    const copyWrap = el(this.doc, 'span', { class: 'ghf-file-dropzone-copy' })
    const status = el(this.doc, 'p', { class: 'ghf-file-status', 'aria-live': 'polite' })
    const policy = field.uploadPolicy
    const selected = this.fileValues.get(field.key)
    const help = this.contract.copy?.[`${field.key}.help`]?.trim()
    const [headline] = help ? help.split('. ') : []

    if (policy?.acceptedMimeTypes.length) input.setAttribute('accept', policy.acceptedMimeTypes.join(','))

    copyWrap.appendChild(
      el(this.doc, 'span', { class: 'ghf-file-dropzone-title' }, headline?.replace(/\.$/, '') || this.fieldLabel(field))
    )

    if (policy?.maxBytes) {
      copyWrap.appendChild(el(this.doc, 'span', { class: 'ghf-file-dropzone-hint' }, this.copy.fileHint(policy.maxBytes)))
    }

    dropzone.appendChild(this.renderIcon(field.presentation?.icon ?? 'file', 'ghf-file-dropzone-icon'))
    dropzone.appendChild(copyWrap)

    const setStatus = (hasSelectedFile: boolean) => {
      wrap.dataset.selected = hasSelectedFile ? 'true' : 'false'
      status.textContent = hasSelectedFile ? this.copy.fileSelected : ''
    }

    setStatus(Boolean(selected))

    input.addEventListener('change', () => {
      const file = input.files?.[0] ?? null

      delete this.errors[field.key]

      if (!file) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        setStatus(false)
        this.touched.add(field.key)
        this.revalidateField(field)
        this.onValueChange(field)

        return
      }

      if (!policy) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        this.errors[field.key] = this.copy.fileUnsupported
        setStatus(false)
        this.touched.add(field.key)
        this.patchFieldErrorDom(field.key)
        this.setFieldStatus(field, 'error')
        this.maybeStart()
        this.onFieldEdited()

        return
      }

      if (file.size <= 0) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        this.errors[field.key] = this.copy.fileEmpty
        setStatus(false)
        this.touched.add(field.key)
        this.patchFieldErrorDom(field.key)
        this.setFieldStatus(field, 'error')
        this.maybeStart()
        this.onFieldEdited()

        return
      }

      if (file.size > policy.maxBytes) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        this.errors[field.key] = this.copy.fileTooLarge(policy.maxBytes)
        setStatus(false)
        this.touched.add(field.key)
        this.patchFieldErrorDom(field.key)
        this.setFieldStatus(field, 'error')
        this.maybeStart()
        this.onFieldEdited()

        return
      }

      if (file.type && !policy.acceptedMimeTypes.includes(file.type)) {
        this.fileValues.delete(field.key)
        this.values[field.key] = ''
        this.errors[field.key] = this.copy.fileUnsupported
        setStatus(false)
        this.touched.add(field.key)
        this.patchFieldErrorDom(field.key)
        this.setFieldStatus(field, 'error')
        this.maybeStart()
        this.onFieldEdited()

        return
      }

      this.fileValues.set(field.key, file)
      this.values[field.key] = 'selected'
      setStatus(true)
      this.touched.add(field.key)
      this.revalidateField(field)
      this.onValueChange(field)
    })

    wrap.appendChild(input)
    wrap.appendChild(dropzone)
    wrap.appendChild(status)

    return wrap
  }

  /**
   * Campo de teléfono internacional (estilo HubSpot): selector de país in-field
   * (bandera + calling code) + input nacional. El valor almacenado/enviado es E.164
   * (`+CC<nacional>`); el server valida. Pegar un `+CC…` detecta el país. Formateo
   * on-blur (robusto: sin saltos de cursor / IME). a11y: `<select>` nativo etiquetado.
   */
  private renderTelControl(field: RendererFieldDefinition, common: Record<string, string>): HTMLElement {
    const initialCountry = (this.telCountry.get(field.key) ?? field.validatorParams?.country ?? 'CL').toUpperCase()

    this.telCountry.set(field.key, initialCountry)

    const wrapper = el(this.doc, 'div', { class: 'ghf-tel' })

    const select = el(this.doc, 'select', { class: 'ghf-tel-country', 'aria-label': this.copy.phoneCountryAria })

    select.dataset.ghfTelCountry = field.key

    for (const country of PHONE_COUNTRIES) {
      const option = el(this.doc, 'option', { value: country.code }, `${country.flag} +${country.callingCode}`)

      option.title = country.name
      if (country.code === initialCountry) option.setAttribute('selected', 'selected')
      select.appendChild(option)
    }

    const input = el(this.doc, 'input', { ...common, type: 'tel', class: 'ghf-input ghf-tel-input' })

    if (field.placeholder) input.setAttribute('placeholder', field.placeholder)
    const national = nationalFromStored(this.fieldStr(field.key), initialCountry)

    input.value = national ? formatNationalPhoneDisplay(national, initialCountry) : ''

    const recompute = (countryOverride?: string) => {
      const country = (countryOverride ?? this.telCountry.get(field.key) ?? initialCountry).toUpperCase()
      const digits = stripNationalDigits(input.value)

      this.values[field.key] = toE164(country, digits)
    }

    select.addEventListener('change', () => {
      const next = select.value.toUpperCase()

      this.telCountry.set(field.key, next)
      const digits = stripNationalDigits(input.value)

      input.value = digits ? formatNationalPhoneDisplay(digits, next) : ''
      recompute(next)
      this.liveStatus(field)
      this.onFieldEdited()
      this.onValueChange(field)
    })

    input.addEventListener('input', () => {
      // Pegado de un número con +CC → detectar país y reflejarlo en el selector.
      const parsed = parseE164(input.value)

      if (parsed) {
        this.telCountry.set(field.key, parsed.country)
        select.value = parsed.country
        input.value = parsed.national
      }

      // Máscara EN VIVO del número nacional, con el caret preservado.
      const country = this.telCountry.get(field.key) ?? initialCountry

      this.applyMaskedLive(input, value => formatNationalPhoneDisplay(value, country), FormRenderer.isDigit)
      recompute()
      this.maybeStart()
      this.liveStatus(field)
      this.onFieldEdited()
    })

    input.addEventListener('blur', () => {
      this.touched.add(field.key)
      const country = this.telCountry.get(field.key) ?? initialCountry
      const digits = stripNationalDigits(input.value)

      if (digits) input.value = formatNationalPhoneDisplay(digits, country)
      recompute(country)
      this.revalidateField(field)
    })

    wrapper.appendChild(select)

    if (this.shouldRenderControlIcon(field) && field.presentation?.icon) {
      const inputShell = el(this.doc, 'div', { class: 'ghf-tel-input-shell ghf-control--with-icon' })

      inputShell.appendChild(this.renderIcon(field.presentation.icon, 'ghf-control-icon'))
      inputShell.appendChild(input)
      wrapper.appendChild(inputShell)
    } else {
      wrapper.appendChild(input)
    }

    return wrapper
  }

  // ─── Validación reactiva (TASK-1256 Slice 1c) ────────────────────────────────

  /** ¿El campo tiene validación real (≠ texto libre / consent)? → muestra ✓ al validar. */
  private hasMeaningfulValidator(field: RendererFieldDefinition): boolean {
    const name = resolveValidatorName(field)

    return name !== 'text' && name !== 'consent'
  }

  private isFieldEmpty(key: string): boolean {
    const value = this.values[key]

    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'boolean') return value === false

    return (value ?? '').toString().trim() === ''
  }

  private setFieldStatus(field: RendererFieldDefinition, status: 'neutral' | 'success' | 'error'): void {
    this.fieldStatus.set(field.key, status)
    const control = this.opts.root.querySelector<HTMLElement>(`[name="${CSS.escape(field.key)}"]`)
    const wrap = control?.closest('.ghf-field')

    if (wrap) (wrap as HTMLElement).dataset.status = status
  }

  /**
   * Evaluación reactiva on-input ("reward early, punish late", forms-ux):
   *  - vacío → neutro (no se grita "requerido" mientras se tipea; eso es on-blur).
   *  - válido → ✓ success inmediato (si el campo tiene validación real).
   *  - inválido: si venía de success → error inmediato (rompiste algo válido);
   *    si no → error diferido tras una pausa (debounce), nunca en cada tecla.
   */
  private liveStatus(field: RendererFieldDefinition): void {
    const key = field.key
    const pending = this.statusTimers.get(key)

    if (pending) {
      clearTimeout(pending)
      this.statusTimers.delete(key)
    }

    if (this.isFieldEmpty(key)) {
      delete this.errors[key]
      this.patchFieldErrorDom(key)
      this.setFieldStatus(field, 'neutral')

      return
    }

    const error = this.validateRendererField(field)

    if (!error) {
      delete this.errors[key]
      this.patchFieldErrorDom(key)
      this.setFieldStatus(field, this.hasMeaningfulValidator(field) ? 'success' : 'neutral')

      return
    }

    // Inválido no-vacío.
    if (this.fieldStatus.get(key) === 'success' || this.errors[key]) {
      // Venías de válido (o ya estaba en error): mostrar el error de inmediato.
      this.errors[key] = error
      this.touched.add(key)
      this.patchFieldErrorDom(key)
      this.setFieldStatus(field, 'error')

      return
    }

    // Primera vez inválido mientras tipea: aún neutro; el error aparece tras la pausa.
    this.setFieldStatus(field, 'neutral')
    this.statusTimers.set(
      key,
      setTimeout(() => {
        this.statusTimers.delete(key)
        if (this.destroyed || this.isFieldEmpty(key)) return
        const late = this.validateRendererField(field)

        if (late) {
          this.errors[key] = late
          this.touched.add(key)
          this.patchFieldErrorDom(key)
          this.setFieldStatus(field, 'error')
        }
      }, FormRenderer.STATUS_ERROR_DEBOUNCE_MS)
    )
  }

  /**
   * Aplica una máscara de display EN VIVO preservando el caret: cuenta los chars
   * "significativos" (según `isSig`) antes del caret, reformatea, y reubica el caret
   * tras la misma cantidad. Evita el salto de cursor del formateo as-you-type.
   */
  private applyMaskedLive(
    input: HTMLInputElement,
    format: (value: string) => string,
    isSig: (char: string) => boolean
  ): void {
    const previous = input.value
    const caret = input.selectionStart ?? previous.length

    let sigBefore = 0

    for (let i = 0; i < caret; i += 1) {
      if (isSig(previous[i])) sigBefore += 1
    }

    const formatted = format(previous)

    if (formatted === previous) return
    input.value = formatted

    if (sigBefore === 0) {
      try {
        input.setSelectionRange(0, 0)
      } catch {
        // jsdom / inputs sin selección: ignorar.
      }

      return
    }

    let seen = 0
    let position = formatted.length

    for (let i = 0; i < formatted.length; i += 1) {
      if (isSig(formatted[i])) {
        seen += 1

        if (seen === sigBefore) {
          position = i + 1
          break
        }
      }
    }

    try {
      input.setSelectionRange(position, position)
    } catch {
      // jsdom / inputs sin selección: ignorar.
    }
  }

  private static readonly isDigit = (char: string): boolean => char >= '0' && char <= '9'

  // ─── UX hardening (TASK-1256 Slice 1d) ───────────────────────────────────────

  /** Llamar tras cualquier edición de campo: refresca hint de listo + guarda borrador. */
  private onFieldEdited(): void {
    this.patchCareersStaticProgress()
    this.patchReadinessHint()
    this.patchIntakeSummary()
    this.scheduleDraftSave()
  }

  /** Cuántos campos visibles bloquean el envío (requeridos vacíos + inválidos + consent). */
  private remainingBlockers(): number {
    const visible = this.fieldsForStep().filter(f => f.type !== 'hidden' && isFieldVisible(f, this.values))
    let count = Object.keys(validateFields(visible, this.values, this.copy)).length

    if (this.isLastStep()) {
      for (const box of this.contract.consent?.checkboxes ?? []) {
        if (box.required !== false && this.consentState[box.key] !== true) count += 1
      }
    }

    return count
  }

  /** Hint vivo junto al submit: "Faltan N campos" → "Listo para enviar ✓". */
  private patchReadinessHint(): void {
    const node = this.opts.root.querySelector<HTMLElement>('[data-ghf-readiness]')

    if (!node) return

    if (!this.started) {
      node.textContent = ''
      node.removeAttribute('data-ready')

      return
    }

    const remaining = this.remainingBlockers()

    if (remaining === 0) {
      node.textContent = this.readyToSendLabel()
      node.dataset.ready = 'true'
      // Sin bloqueos: limpia el summary assertive de un intento de envío previo.
      this.setSummary('')
    } else {
      node.textContent = this.copy.fieldsRemaining(remaining)
      node.dataset.ready = 'false'
    }
  }

  private patchIntakeSummary(): void {
    const steps = this.steps
    const existing = this.opts.root.querySelector<HTMLElement>('.ghf-intake-summary')

    if (!steps || !existing) return
    existing.replaceWith(this.renderIntakeSummary(steps))
  }

  /** Actualiza el contador de caracteres de un campo con `maxLength`. */
  private patchCounter(field: RendererFieldDefinition, input: HTMLInputElement | HTMLTextAreaElement): void {
    if (!field.maxLength) return
    const wrap = input.closest('.ghf-field')
    const counter = wrap?.querySelector<HTMLElement>('.ghf-counter')

    if (!counter) return
    const length = input.value.length

    counter.textContent = `${length} / ${field.maxLength}`
    counter.dataset.near = length >= field.maxLength * 0.9 ? 'true' : 'false'
  }

  // ─── Borrador PII-safe (localStorage) ────────────────────────────────────────

  private draftKey(): string {
    return `ghf-draft:${this.contract.form.slug}:${this.contract.form.formVersionId}`
  }

  /** Un campo NO se persiste si es PII regulada (cédula), consentimiento u oculto. */
  private isDraftablePersisted(field: RendererFieldDefinition): boolean {
    if (field.type === 'national_id' || resolveValidatorName(field) === 'national_id') return false
    if (field.type === 'consent' || field.type === 'checkbox' || field.type === 'hidden') return false
    if (field.type === 'file') return false

    return true
  }

  private scheduleDraftSave(): void {
    if (this.draftSaveTimer) clearTimeout(this.draftSaveTimer)
    this.draftSaveTimer = setTimeout(() => this.persistDraft(), FormRenderer.DRAFT_DEBOUNCE_MS)
  }

  private persistDraft(): void {
    if (typeof window === 'undefined' || !window.localStorage) return

    const values: Record<string, string | string[]> = {}

    for (const field of this.contract.fields) {
      if (!this.isDraftablePersisted(field)) continue
      const value = this.values[field.key]

      if (typeof value === 'string' && value.trim() !== '') values[field.key] = value
      else if (Array.isArray(value) && value.length > 0) values[field.key] = value
    }

    try {
      if (Object.keys(values).length === 0) {
        window.localStorage.removeItem(this.draftKey())

        return
      }

      window.localStorage.setItem(this.draftKey(), JSON.stringify({ savedAt: Date.now(), values }))
    } catch {
      // cuota llena / modo privado: el borrador es best-effort, no romper el form.
    }
  }

  /** Restaura valores NO-PII del borrador en `this.values`. Devuelve true si restauró algo. */
  private restoreDraft(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false

    let raw: string | null = null

    try {
      raw = window.localStorage.getItem(this.draftKey())
    } catch {
      return false
    }

    if (!raw) return false

    let parsed: { savedAt?: number; values?: Record<string, unknown> }

    try {
      parsed = JSON.parse(raw) as typeof parsed
    } catch {
      this.clearDraft()

      return false
    }

    if (typeof parsed?.savedAt === 'number' && Date.now() - parsed.savedAt > FormRenderer.DRAFT_TTL_MS) {
      this.clearDraft()

      return false
    }

    const stored = parsed?.values ?? {}
    let restored = false

    for (const field of this.contract.fields) {
      if (!this.isDraftablePersisted(field)) continue
      const value = stored[field.key]

      if (typeof value === 'string' && value.trim() !== '') {
        this.values[field.key] = value
        restored = true
      } else if (Array.isArray(value) && value.length > 0) {
        this.values[field.key] = value.map(String)
        restored = true
      }
    }

    return restored
  }

  private clearDraft(): void {
    if (typeof window === 'undefined' || !window.localStorage) return

    try {
      window.localStorage.removeItem(this.draftKey())
    } catch {
      // ignore
    }
  }

  /** Resumen de errores accesible (patrón GOV.UK): título + links que enfocan el campo. */
  private buildErrorSummary(): HTMLElement | null {
    const entries: { focusSelector: string; text: string }[] = []

    for (const field of this.fieldsForStep()) {
      if (field.type === 'hidden' || !isFieldVisible(field, this.values)) continue
      const error = this.errors[field.key]

      if (error)
        entries.push({
          focusSelector: `[name="${CSS.escape(field.key)}"]`,
          text: `${this.fieldLabel(field)}: ${error}`
        })
    }

    if (this.isLastStep()) {
      for (const box of this.contract.consent?.checkboxes ?? []) {
        if (box.required !== false && this.consentState[box.key] !== true) {
          entries.push({
            focusSelector: `[data-ghf-consent="${CSS.escape(box.key)}"]`,
            text: `${box.label ?? box.copyRef ?? 'Consentimiento'}: ${this.copy.errors.consentRequired}`
          })
        }
      }
    }

    if (entries.length === 0) return null

    const box = el(this.doc, 'div', { class: 'ghf-error-summary', role: 'alert', tabindex: '-1' })

    box.dataset.ghfErrorSummary = 'true'
    box.appendChild(el(this.doc, 'p', { class: 'ghf-error-summary-title' }, this.copy.errorSummaryTitle))
    const list = el(this.doc, 'ul', { class: 'ghf-error-summary-list' })

    for (const entry of entries) {
      const item = el(this.doc, 'li')
      const link = el(this.doc, 'a', { href: '#' }, entry.text)

      link.addEventListener('click', event => {
        event.preventDefault()
        const target = this.opts.root.querySelector<HTMLElement>(entry.focusSelector)

        target?.focus?.()
        target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      })
      item.appendChild(link)
      list.appendChild(item)
    }

    box.appendChild(list)

    return box
  }

  /**
   * Mantiene el resumen de errores en sync cuando los errores se corrigen en vivo (no
   * re-renderiza el form). Sólo actualiza/elimina el resumen existente — se crea en submit.
   */
  private patchErrorSummary(): void {
    if (!this.submitAttempted) return
    const existing = this.opts.root.querySelector('[data-ghf-error-summary]')

    if (!existing) return
    const fresh = this.buildErrorSummary()

    if (fresh) existing.replaceWith(fresh)
    else existing.remove()
  }

  /** Cablea inputs de texto con máscara forgiving + timing 3-stage. */
  private wireText(field: RendererFieldDefinition, input: HTMLInputElement | HTMLTextAreaElement): void {
    const mask = maskOpsFor(field)

    input.addEventListener('input', () => {
      this.values[field.key] = mask.toStored(input.value)
      this.maybeStart()
      // Validación reactiva live (success ✓ inmediato, error diferido). Reemplaza el
      // Stage-3 "solo si ya erró": ahora el feedback es reactivo desde que se tipea.
      this.liveStatus(field)
      this.patchCounter(field, input)
      this.onFieldEdited()
      // Verificación de correo debounced mientras tipea (UX, no autoridad).
      if (field.type === 'email') this.scheduleEmailVerify(field)
    })

    input.addEventListener('blur', () => {
      this.touched.add(field.key)

      // Aplica máscara de display al salir (evita saltos de cursor mientras tipea).
      if (input instanceof HTMLInputElement) {
        const display = mask.toDisplay(this.values[field.key] as string)

        if (display !== input.value) input.value = display
        // Re-almacena desde el display normalizado. Idempotente para rut/phone
        // (stored→display→stored = stored) y deja la URL con scheme ya antepuesto.
        this.values[field.key] = mask.toStored(input.value)
      }

      this.revalidateField(field)
      // Al salir del campo de correo, verificar de inmediato (sin esperar el debounce).
      if (field.type === 'email') this.scheduleEmailVerify(field, true)
    })
  }

  private renderConsent(): HTMLElement | null {
    const consent = this.contract.consent

    if (!consent || !consent.checkboxes || consent.checkboxes.length === 0) {
      if (consent?.noticeText) {
        return el(this.doc, 'p', { class: 'ghf-help' }, consent.noticeText)
      }

      return null
    }

    const wrap = el(this.doc, 'div', { class: 'ghf-field ghf-field--full' })

    if (consent.noticeText) wrap.appendChild(el(this.doc, 'p', { class: 'ghf-help' }, consent.noticeText))

    for (const box of consent.checkboxes) {
      const id = `${this.instanceId}-consent-${box.key}`
      const label = el(this.doc, 'label', { class: 'ghf-check', for: id })
      const cb = el(this.doc, 'input', { id, type: 'checkbox', name: `consent_${box.key}` })

      cb.dataset.ghfConsent = box.key
      cb.dataset.ghfConsentRequired = box.required === false ? 'false' : 'true'
      cb.checked = this.consentState[box.key] === true
      cb.addEventListener('change', () => {
        this.consentState[box.key] = cb.checked
        this.maybeStart()
        this.patchReadinessHint()
        this.patchErrorSummary()
      })
      label.appendChild(cb)
      label.appendChild(el(this.doc, 'span', {}, box.label ?? box.copyRef ?? 'Acepto'))
      wrap.appendChild(label)
    }

    if (consent.privacyUrl) {
      const p = el(this.doc, 'p', { class: 'ghf-help' })

      const a = el(
        this.doc,
        'a',
        { href: consent.privacyUrl, target: '_blank', rel: 'noopener noreferrer' },
        consent.privacyUrl
      )

      p.appendChild(a)
      wrap.appendChild(p)
    }

    return wrap
  }

  private renderActions(): HTMLElement {
    const actions = el(this.doc, 'div', { class: 'ghf-actions' })
    const steps = this.steps

    if (steps && this.currentStep > 0) {
      const back = el(this.doc, 'button', { type: 'button', class: 'ghf-btn ghf-btn--ghost' }, this.copy.stepBack)

      back.addEventListener('click', () => {
        this.currentStep -= 1
        this.errors = {}
        this.submitAttempted = false
        this.renderForm()
        this.focusStepHeading()
      })
      actions.appendChild(back)
    }

    const isLast = this.isLastStep()
    const canSkip = this.isCurrentStepSkippable()
    const submitLabel = isLast ? this.submitLabel() : canSkip ? this.copy.stepNextOptional : this.copy.stepNext
    const primary = el(this.doc, 'button', { type: 'submit', class: 'ghf-btn' })

    primary.dataset.ghfPrimary = 'true'
    this.setPrimaryLabel(primary, submitLabel)
    primary.addEventListener('pointerdown', event => {
      // Avoid a pre-click blur validation layout shift moving the submit button under
      // the pointer. The submit handler validates the full visible step immediately.
      if (!this.submitting && !this.isVerifyingAny()) event.preventDefault()
    })

    if (this.submitting) {
      primary.setAttribute('aria-disabled', 'true')
      primary.setAttribute('disabled', 'disabled')
      this.setPrimaryLabel(primary, this.copy.submitPending)
    } else if (this.isVerifyingAny()) {
      // Una verificación de correo en vuelo deshabilita el submit (UX; no autoridad).
      primary.setAttribute('aria-disabled', 'true')
      primary.setAttribute('disabled', 'disabled')
    }

    actions.appendChild(primary)

    if (canSkip) {
      const skip = el(
        this.doc,
        'button',
        { type: 'button', class: 'ghf-btn ghf-btn--ghost ghf-btn--skip' },
        this.copy.stepSkipOptional
      )

      skip.addEventListener('click', () => this.skipCurrentStep())
      actions.appendChild(skip)
    }

    // Hint vivo de "campos pendientes / listo para enviar" (TASK-1256 Slice 1d).
    const wrapper = el(this.doc, 'div', { class: 'ghf-actions-wrap' })

    wrapper.appendChild(actions)
    const readiness = el(this.doc, 'p', { class: 'ghf-readiness', 'aria-live': 'polite' })

    readiness.dataset.ghfReadiness = 'true'
    if (isLast) wrapper.appendChild(readiness)

    return wrapper
  }

  private submitLabel(): string {
    const fromCopy = this.contract.copy?.['submit']

    return fromCopy ?? this.copy.submitByKind[this.contract.form.formKind] ?? this.copy.stepNext
  }

  private setPrimaryLabel(button: HTMLElement, label: string): void {
    button.replaceChildren()

    const trimmed = label.trim()

    if (trimmed.endsWith('→')) {
      button.appendChild(el(this.doc, 'span', { class: 'ghf-btn-label' }, trimmed.slice(0, -1).trim()))
      button.appendChild(el(this.doc, 'span', { class: 'ghf-btn-arrow', 'aria-hidden': 'true' }, '→'))

      return
    }

    if (this.contract.styleVariant === 'careers-html-fidelity' && button.dataset.ghfPrimary === 'true') {
      button.appendChild(this.renderIcon(this.submitting ? 'spinner' : 'send', 'ghf-btn-icon'))
    }

    button.appendChild(el(this.doc, 'span', { class: 'ghf-btn-label' }, label))
  }

  private isLastStep(): boolean {
    const steps = this.steps

    return !steps || this.currentStep >= steps.length - 1
  }

  private isCurrentStepSkippable(): boolean {
    if (!this.steps || this.isLastStep()) return false

    const visible = this.fieldsForStep().filter(field => field.type !== 'hidden' && isFieldVisible(field, this.values))

    return visible.length > 0 && visible.every(field => !isFieldRequired(field, this.values))
  }

  private skipCurrentStep(): void {
    if (!this.isCurrentStepSkippable()) return

    this.currentStep += 1
    this.errors = {}
    this.submitAttempted = false
    this.renderForm()
    this.focusStepHeading()
  }

  // ─── State transitions ───────────────────────────────────────────────────---

  private maybeStart(): void {
    if (this.started) return
    this.started = true
    this.telemetry.emit('gh_form_started', {})
    this.patchReadinessHint()
  }

  private onValueChange(field: RendererFieldDefinition): void {
    this.maybeStart()

    // Re-render solo si hay condiciones que dependen de este campo (conditional_simple).
    const affectsVisibility = this.contract.fields.some(
      f => f.visibleWhen?.some(c => c.field === field.key) || f.requiredWhen?.some(c => c.field === field.key)
    )

    if (this.errors[field.key]) this.revalidateField(field)
    this.onFieldEdited()
    if (affectsVisibility) this.renderForm()
  }

  private revalidateField(field: RendererFieldDefinition): void {
    if (!this.touched.has(field.key)) return
    const error = this.validateRendererField(field)
    const prev = this.errors[field.key]

    if (error) this.errors[field.key] = error
    else delete this.errors[field.key]

    if (error && error !== prev) {
      this.telemetry.emit('gh_form_field_validation_failed', { reason_class: field.type })
    }

    this.patchFieldErrorDom(field.key)

    // Estado reactivo on-blur/submit (Stage 2): error → rojo; válido no-vacío → ✓;
    // vacío → neutro (el "requerido" ya está en `error` si el campo lo es).
    if (error) this.setFieldStatus(field, 'error')
    else if (!this.isFieldEmpty(field.key))
      this.setFieldStatus(field, this.hasMeaningfulValidator(field) ? 'success' : 'neutral')
    else this.setFieldStatus(field, 'neutral')
  }

  private validateRendererField(field: RendererFieldDefinition): string | null {
    const error = validateField(field, this.values, this.copy)

    if (!error) return null

    if (error === this.copy.errors.required) {
      const customRequired = this.contract.copy?.[`${field.key}.error.required`]

      if (customRequired) return customRequired
    }

    return error
  }

  private validateRendererFields(fields: RendererFieldDefinition[]): FieldErrors {
    const errors: FieldErrors = {}

    for (const field of fields) {
      if (field.type === 'hidden') continue
      const error = this.validateRendererField(field)

      if (error) errors[field.key] = error
    }

    return errors
  }

  /** Actualiza solo el DOM del error de un campo (sin re-render completo). */
  private patchFieldErrorDom(key: string): void {
    const control = this.opts.root.querySelector<HTMLElement>(`[name="${CSS.escape(key)}"]`)

    if (!control) return
    const wrap = control.closest('.ghf-field')

    if (!wrap) return
    const error = this.errors[key]
    const errorId = `${this.instanceId}-${key}-error`

    wrap.setAttribute('data-invalid', error ? 'true' : 'false')
    const existing = wrap.querySelector('.ghf-error')

    if (error) {
      control.setAttribute('aria-invalid', 'true')
      if (existing) existing.textContent = error
      else wrap.appendChild(el(this.doc, 'p', { class: 'ghf-error', id: errorId, role: 'alert' }, error))
    } else {
      control.removeAttribute('aria-invalid')
      existing?.remove()
    }

    // Mantiene el resumen de errores accesible en sync al corregir en vivo.
    this.patchErrorSummary()
  }

  // ─── Email verification (TASK-1256 Slice 2) ──────────────────────────────────

  private fieldStr(key: string): string {
    const v = this.values[key]

    return typeof v === 'string' ? v : ''
  }

  /** El campo aplica gate corporativo duro (el form lo opta vía `validator`). */
  private isEmailGated(field: RendererFieldDefinition): boolean {
    return field.type === 'email' && field.validator === 'corporate_email'
  }

  /** Programa la verificación de correo: debounced on-input, inmediata on-blur. */
  private scheduleEmailVerify(field: RendererFieldDefinition, immediate = false): void {
    if (this.emailVerifyDisabled || field.type !== 'email') return

    const existing = this.verifyTimers.get(field.key)

    if (existing) clearTimeout(existing)

    if (immediate) {
      void this.runEmailVerify(field)

      return
    }

    this.verifyTimers.set(
      field.key,
      setTimeout(() => void this.runEmailVerify(field), FormRenderer.EMAIL_VERIFY_DEBOUNCE_MS)
    )
  }

  /**
   * Llama a `/verify-email` (debounced) y refleja el veredicto en UI. Solo verifica
   * correos sintácticamente válidos. Degradación honesta: 404/error/rate-limited NO
   * trabа el submit — el gate vive en `submitForm`. Ignora respuestas stale (el valor
   * cambió mientras la verificación estaba en vuelo).
   */
  private async runEmailVerify(field: RendererFieldDefinition): Promise<void> {
    if (this.destroyed || this.emailVerifyDisabled) return

    const value = this.fieldStr(field.key)
    const syntax = validateFormValue('email_syntax', value)

    if (!syntax.valid) {
      this.emailVerifyState.delete(field.key)
      this.emailSuggestions.delete(field.key)
      this.patchEmailVerifyDom(field)
      this.patchPrimaryActionState()

      return
    }

    this.emailVerifyState.set(field.key, 'verifying')
    this.patchEmailVerifyDom(field)
    this.patchPrimaryActionState()

    const result = await verifyPublicEmail(this.api, value, this.fetchImpl)

    // Stale guard: el usuario siguió tipeando → descartar este veredicto.
    if (this.destroyed || this.fieldStr(field.key) !== value) return

    if (result.outcome === 'disabled') {
      this.emailVerifyDisabled = true
      this.emailVerifyState.delete(field.key)
      this.emailSuggestions.delete(field.key)
    } else if (result.outcome !== 'ok') {
      // rate_limited / error → degradación honesta: limpiar estado, sin bloquear.
      this.emailVerifyState.delete(field.key)
      this.emailSuggestions.delete(field.key)
    } else {
      this.emailVerifyState.set(field.key, 'done')

      if (result.suggestion) this.emailSuggestions.set(field.key, result.suggestion)
      else this.emailSuggestions.delete(field.key)

      // Gate corporativo: refleja el veredicto del provider (cubre Tier 2 que el
      // validador local no ve). Paridad con el validador local para Tier 1.
      if (
        this.isEmailGated(field) &&
        (result.reasonCode === 'email_not_corporate' || result.reasonCode === 'email_disposable')
      ) {
        this.errors[field.key] =
          result.reasonCode === 'email_disposable' ? this.copy.errors.disposable : this.copy.errors.corporate
        this.touched.add(field.key)
      }
    }

    this.patchFieldErrorDom(field.key)
    // Estado reactivo del correo tras el veredicto: error si gateó, ✓ si quedó válido.
    if (this.errors[field.key]) this.setFieldStatus(field, 'error')
    else if (!this.isFieldEmpty(field.key)) this.setFieldStatus(field, 'success')
    this.patchEmailVerifyDom(field)
    this.patchPrimaryActionState()
  }

  private isVerifyingAny(): boolean {
    for (const state of this.emailVerifyState.values()) {
      if (state === 'verifying') return true
    }

    return false
  }

  /** Disable visual del submit mientras alguna verificación de correo está en vuelo. */
  private patchPrimaryActionState(): void {
    if (this.submitting) return // el submit es dueño del label/estado durante el envío
    const primary = this.opts.root.querySelector<HTMLElement>('[data-ghf-primary]')

    if (!primary) return

    if (this.isVerifyingAny()) {
      primary.setAttribute('aria-disabled', 'true')
      primary.setAttribute('disabled', 'disabled')
    } else {
      primary.removeAttribute('aria-disabled')
      primary.removeAttribute('disabled')
    }
  }

  /** Inserta/actualiza el indicador "verificando…" + el affordance typo-suggest. */
  private patchEmailVerifyDom(field: RendererFieldDefinition): void {
    const control = this.opts.root.querySelector<HTMLElement>(`[name="${CSS.escape(field.key)}"]`)
    const wrap = control?.closest('.ghf-field')

    if (!wrap) return

    const verifying = this.emailVerifyState.get(field.key) === 'verifying'
    const suggestion = this.emailSuggestions.get(field.key) ?? null

    // Indicador "verificando…" (aria-live polite, sin spinner agresivo — reduced-motion).
    const existingStatus = wrap.querySelector('.ghf-verify-status')

    if (verifying) {
      if (existingStatus) existingStatus.textContent = this.copy.emailVerifying
      else
        wrap.appendChild(
          el(this.doc, 'p', { class: 'ghf-verify-status', 'aria-live': 'polite' }, this.copy.emailVerifying)
        )
    } else {
      existingStatus?.remove()
    }

    // Affordance typo-suggest "¿quisiste decir …?" (clickable → aplica + re-verifica).
    const existingSuggest = wrap.querySelector('.ghf-verify-suggest')

    if (suggestion && !verifying) {
      if (existingSuggest) existingSuggest.remove()

      const button = el(
        this.doc,
        'button',
        { type: 'button', class: 'ghf-verify-suggest' },
        this.copy.emailSuggestion(suggestion)
      )

      button.addEventListener('click', () => {
        this.values[field.key] = suggestion
        if (control instanceof HTMLInputElement) control.value = suggestion
        this.emailSuggestions.delete(field.key)
        this.touched.add(field.key)
        this.revalidateField(field)
        this.scheduleEmailVerify(field, true)
        control?.focus?.()
      })
      wrap.appendChild(button)
    } else {
      existingSuggest?.remove()
    }
  }

  // ─── Submit / next ───────────────────────────────────────────────────────---

  private async handlePrimaryAction(): Promise<void> {
    if (this.submitting) return

    // No avanzar mientras una verificación de correo está en vuelo (botón aria-disabled).
    if (this.isVerifyingAny()) {
      this.setSummary(this.copy.emailVerifying)
      this.focusPrimary()

      return
    }

    // Marcar todos los campos visibles del paso como touched para que validen.
    const stepFields = this.fieldsForStep().filter(f => isFieldVisible(f, this.values) && f.type !== 'hidden')

    for (const f of stepFields) this.touched.add(f.key)

    this.errors = this.validateRendererFields(stepFields)
    const consentError = this.isLastStep() ? this.validateConsent() : null

    // Hay errores (de campo o de consentimiento): mostrar el resumen accesible arriba,
    // re-render con errores inline, y enfocar el resumen (patrón GOV.UK). TASK-1256 Slice 1d.
    if (Object.keys(this.errors).length > 0 || consentError) {
      this.submitAttempted = true
      this.renderForm()
      this.setSummary(consentError ?? this.copy.validationSummary(Object.keys(this.errors).length))
      const summary = this.opts.root.querySelector<HTMLElement>('[data-ghf-error-summary]')

      if (summary) summary.focus?.()
      else this.focusFirstInvalid()

      return
    }

    if (!this.isLastStep()) {
      this.currentStep += 1
      this.errors = {}
      this.renderForm()
      this.focusStepHeading()

      return
    }

    await this.submit()
  }

  private validateConsent(): string | null {
    const consent = this.contract.consent

    if (!consent) return null
    const required = (consent.checkboxes ?? []).filter(b => b.required !== false)

    if (required.length === 0) return null

    for (const box of required) {
      if (this.consentState[box.key] !== true) {
        return (
          this.contract.copy?.[`${box.key}.error.required`] ??
          this.contract.copy?.['consent.error.required'] ??
          this.copy.errors.consentRequired
        )
      }
    }

    return null
  }

  private async submit(): Promise<void> {
    // Capturar consent (de state) + honeypot (de DOM) ANTES del re-render de pending.
    const honey = this.opts.root.querySelector<HTMLInputElement>('[data-ghf-honeypot]')?.value ?? ''

    const consentCheckboxes = Object.entries(this.consentState)
      .filter(([, checked]) => checked)
      .map(([key]) => key)

    this.submitting = true
    this.renderForm()

    let captchaToken: string | undefined

    try {
      captchaToken = await this.resolveCaptchaToken()
    } catch {
      this.submitting = false
      this.telemetry.emit('gh_form_submission_rejected', { reason_class: 'captcha_failed' })
      this.renderForm()
      this.setSummary(this.submitErrorMessage('captcha_failed'))
      this.focusPrimary()

      return
    }

    this.telemetry.emit('gh_form_submitted', {})

    const result = await submitPublicForm(
      this.api,
      {
        fields: this.collectFieldValues(),
        files: this.collectFileValues(),
        consent: this.contract.consent
          ? consentCheckboxes.length > 0 || (this.contract.consent.checkboxes ?? []).length === 0
          : true,
        consentCheckboxes,
        honeypot: honey,
        pageUri: this.pageContext.pageUri,
        pageName: this.pageContext.pageName,
        referrer: this.pageContext.referrer,
        formVersionId: this.contract.form.formVersionId,
        captchaToken
      },
      this.fetchImpl
    )

    this.submitting = false
    this.turnstile?.reset()

    if (result.outcome === 'accepted') {
      this.telemetry.emit('gh_form_submission_accepted', {
        ...(result.submissionId ? { correlation_id: result.submissionId } : {}),
        success_behavior: this.contract.successBehavior.kind,
        // TASK-1336 — handoff auto-descriptivo del `tokenized_report`: el host recibe el handle
        // público + la URL de status para arrancar el poll (sin hardcodear ruta ni conocer el
        // grader). Sólo cuando el behavior lo declara y hay handle; nunca rompe legacy.
        ...this.buildTokenizedReportHandoff(result.submissionId),
        // TASK-1375 — handoff de descarga GATED del asset (ebook): el host recibe `download_url`
        // (ruta pública + handle) para disparar la descarga on-screen post-submit. Sólo cuando el
        // behavior `asset_access` lo declara y hay handle; nunca rompe legacy.
        ...this.buildAssetDownloadHandoff(result.submissionId)
      })
      this.clearDraft() // enviado OK → el borrador ya no aplica.
      this.renderSuccess()

      return
    }

    this.telemetry.emit('gh_form_submission_rejected', { reason_class: result.outcome })
    this.renderForm()
    this.setSummary(this.submitErrorMessage(result.outcome))
    this.focusPrimary()
  }

  private readyToSendLabel(): string {
    return this.copy.readyToSendByKind[this.contract.form.formKind] ?? this.copy.readyToSend
  }

  private submitErrorMessage(outcome?: PublicSubmitOutcome): string {
    if (outcome && this.copy.submitErrorByOutcome[outcome]) return this.copy.submitErrorByOutcome[outcome]

    return this.copy.submitError
  }

  private async resolveCaptchaToken(): Promise<string | undefined> {
    const captcha = this.contract.security?.captcha

    if (!captcha || captcha.required === false) return undefined

    if (captcha.provider !== 'turnstile' || captcha.mode !== 'invisible' || captcha.execution !== 'submit') {
      throw new Error('captcha_provider_unsupported')
    }

    this.turnstile ??= new TurnstileTokenClient(this.doc, captcha)

    return this.turnstile.execute()
  }

  private collectFieldValues(): Record<string, string | number | boolean | string[]> {
    const out: Record<string, string | number | boolean | string[]> = {}

    for (const field of this.contract.fields) {
      if (field.type === 'file') continue
      const value = this.values[field.key]

      if (value === '' || value === false || (Array.isArray(value) && value.length === 0)) continue
      // Solo enviar campos visibles (el server re-evalúa condiciones — Arch §20).
      if (!isFieldVisible(field, this.values)) continue
      out[field.key] = value
    }

    return out
  }

  private collectFileValues(): Record<string, File> {
    const out: Record<string, File> = {}

    for (const field of this.contract.fields) {
      if (field.type !== 'file') continue
      if (!isFieldVisible(field, this.values)) continue
      const file = this.fileValues.get(field.key)

      if (file) out[field.key] = file
    }

    return out
  }

  /**
   * TASK-1336 — Handoff `tokenized_report`. Resuelve el `statusPathTemplate` declarado por el
   * behavior (SoT server-side, browser-safe: ruta relativa bajo `/api/public/` con `{handle}`)
   * sustituyendo `{handle}` por el `submissionId` y lo absolutiza contra el mismo origen del API
   * público con el que ya habla el renderer. Devuelve claves escalares allowlisted para el evento
   * `gh_form_submission_accepted`; `{}` (no handoff) si el behavior no lo declara o falta el handle.
   * Mantiene el renderer genérico: no conoce el grader ni hardcodea la ruta de status.
   */
  private buildTokenizedReportHandoff(
    submissionId: string | undefined
  ): { run_handle: string; status_url: string } | Record<string, never> {
    const behavior = this.contract.successBehavior
    const template = behavior.kind === 'tokenized_report' ? behavior.tokenizedReport?.statusPathTemplate : undefined

    if (!template || !submissionId) return {}

    const path = template.replace('{handle}', encodeURIComponent(submissionId))
    const statusUrl = `${this.api.baseUrl.replace(/\/$/, '')}${path}`

    return { run_handle: submissionId, status_url: statusUrl }
  }

  /**
   * TASK-1375 — Handoff de descarga GATED de asset (ebook lead magnet). Espejo de
   * `buildTokenizedReportHandoff`: resuelve el `downloadPathTemplate` declarado por el behavior
   * `asset_access` (browser-safe: ruta relativa bajo `/api/public/` con `{handle}`) sustituyendo
   * `{handle}` por el `submissionId` y lo absolutiza contra el mismo origen del API público.
   * Devuelve `{ download_url }` allowlisted para el evento `gh_form_submission_accepted`; `{}` (no
   * handoff) si el behavior no lo declara o falta el handle. El renderer no conoce el ebook ni el
   * object_name (server-only): sólo dispara la URL gated.
   */
  private buildAssetDownloadHandoff(
    submissionId: string | undefined
  ): { download_url: string } | Record<string, never> {
    const behavior = this.contract.successBehavior
    const template = behavior.kind === 'asset_access' ? behavior.assetDownload?.downloadPathTemplate : undefined

    if (!template || !submissionId) return {}

    const path = template.replace('{handle}', encodeURIComponent(submissionId))
    const downloadUrl = `${this.api.baseUrl.replace(/\/$/, '')}${path}`

    return { download_url: downloadUrl }
  }

  private renderSuccess(): void {
    const behavior = this.contract.successBehavior

    if (behavior.kind === 'redirect' && behavior.redirectUrl) {
      this.telemetry.emit('gh_form_asset_accessed', { success_behavior: 'redirect' })
      if (typeof window !== 'undefined') window.location.assign(behavior.redirectUrl)

      return
    }

    const root = this.opts.root

    root.replaceChildren()

    if (behavior.presentation === 'success_card') {
      const card = this.buildSuccessCard(behavior)

      root.appendChild(card)
      this.telemetry.emit('gh_form_success_viewed', { success_behavior: behavior.kind })
      card.focus?.()

      return
    }

    const message =
      behavior.message ??
      (behavior.messageCopyRef ? this.contract.copy?.[behavior.messageCopyRef] : undefined) ??
      this.copy.successFallback

    const status = el(
      this.doc,
      'div',
      { class: 'ghf-status ghf-status--success', role: 'status', 'aria-live': 'polite', tabindex: '-1' },
      message
    )

    root.appendChild(status)
    status.focus?.()
  }

  private buildSuccessCard(behavior: RendererSuccessBehavior): HTMLElement {
    const title = this.resolveContractCopy(behavior.title, behavior.titleCopyRef, this.copy.successCardTitle)
    const body = this.resolveContractCopy(behavior.body, behavior.bodyCopyRef, this.copy.successCardBody)
    const steps = this.resolveSuccessSteps(behavior.steps)

    const actions = (behavior.actions ?? [])
      .slice(0, 2)
      .filter(action => this.successActionLabel(action) && action.href)

    const reward = this.buildSuccessReward(behavior.reward)
    const support = this.resolveContractCopy(behavior.supportingNote, behavior.supportingNoteCopyRef)

    const card = el(this.doc, 'section', {
      class: 'ghf-success-card',
      role: 'status',
      'aria-live': 'polite',
      tabindex: '-1',
      'data-capture': 'growth-form-success-card'
    })

    if (steps.length > 0) card.dataset.hasSteps = 'true'
    if (actions.length > 0) card.dataset.hasActions = 'true'

    const mark = el(this.doc, 'span', { class: 'ghf-success-card__mark', 'aria-hidden': 'true' })

    mark.appendChild(this.buildSuccessMarkGraphic())

    const content = el(this.doc, 'div', { class: 'ghf-success-card__content' })

    content.appendChild(el(this.doc, 'p', { class: 'ghf-success-card__title' }, title))
    content.appendChild(el(this.doc, 'p', { class: 'ghf-success-card__body' }, body))

    if (steps.length > 0) {
      const list = el(this.doc, 'ol', { class: 'ghf-success-card__steps' })

      for (const step of steps) {
        list.appendChild(el(this.doc, 'li', { class: 'ghf-success-card__step' }, step))
      }

      content.appendChild(list)
    }

    if (reward) content.appendChild(reward)

    if (actions.length > 0) {
      const actionRow = el(this.doc, 'div', {
        class: 'ghf-success-card__actions',
        'data-capture': 'growth-form-success-actions'
      })

      for (const action of actions) {
        actionRow.appendChild(this.buildSuccessAction(action, 'ghf-success-card__action'))
      }

      content.appendChild(actionRow)
    }

    if (support) content.appendChild(el(this.doc, 'p', { class: 'ghf-success-card__support' }, support))

    card.append(mark, content)

    return card
  }

  private buildSuccessMarkGraphic(): HTMLElement {
    const glyph = el(this.doc, 'span', { class: 'ghf-success-card__mark-glyph', 'aria-hidden': 'true' })
    const svg = this.doc.createElementNS('http://www.w3.org/2000/svg', 'svg')

    svg.setAttribute('viewBox', '0 0 2048 2048')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('focusable', 'false')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    for (const [d, className] of [
      [
        'M 622.344 919.046 C 598.084 919.27 580.154 916.948 561.65 899.439 C 548.133 886.534 540.277 868.799 539.802 850.116 C 538.915 805.812 577.388 773.776 619.612 776.034 C 637.24 776.977 658.204 775.85 676.1 775.81 L 838.957 775.437 L 1260.73 774.662 L 1380.71 774.121 C 1396.11 774.06 1430.86 773.128 1445.16 775.149 C 1460.67 777.385 1475.06 784.521 1486.23 795.515 C 1517.05 826.363 1513.66 880.357 1476.95 905.064 C 1460.11 916.402 1446.89 918.29 1427.05 917.733 C 1412.78 952.236 1398.81 986.861 1385.14 1021.61 C 1378.93 1037.35 1370.02 1058.56 1364.7 1074.45 C 1376.48 1083.8 1388.44 1092.92 1400.58 1101.78 C 1424.47 1119.48 1444.06 1131.92 1448.37 1164.39 C 1452.16 1192.93 1435.59 1220.15 1417.92 1241.49 C 1370 1299.35 1326.18 1333.68 1260.66 1367.67 L 1146.97 1649.29 L 1112.66 1733.67 C 1099.46 1765.96 1093.3 1794.2 1058.43 1809.42 C 1040.94 1817.06 1021.13 1817.37 1003.41 1810.28 C 956.551 1791.11 951.371 1733.42 931.431 1692.35 C 926.797 1682.81 919.024 1656.24 913.059 1649.65 C 888.768 1632.51 859.184 1615.77 834.484 1598.56 C 820.779 1588.78 803.309 1580.74 792.024 1568.15 C 750.306 1521.64 795.56 1470.43 830.796 1438.78 C 783.12 1321.45 736.113 1203.85 689.778 1085.98 L 649.099 983.669 C 641.741 965.049 631.252 936.548 622.344 919.046 z',
        'ghf-success-card__party-popper-fill'
      ],
      [
        'M 1301.26 1190.03 C 1328.05 1163.52 1349.44 1123.31 1359.89 1087.3 C 1360.84 1084.03 1362.4 1076.28 1364.7 1074.45 C 1376.48 1083.8 1388.44 1092.92 1400.58 1101.78 C 1424.47 1119.48 1444.06 1131.92 1448.37 1164.39 C 1452.16 1192.93 1435.59 1220.15 1417.92 1241.49 C 1370 1299.35 1326.18 1333.68 1260.66 1367.67 L 1146.97 1649.29 L 1112.66 1733.67 C 1099.46 1765.96 1093.3 1794.2 1058.43 1809.42 C 1040.94 1817.06 1021.13 1817.37 1003.41 1810.28 C 956.551 1791.11 951.371 1733.42 931.431 1692.35 C 926.797 1682.81 919.024 1656.24 913.059 1649.65 C 888.768 1632.51 859.184 1615.77 834.484 1598.56 C 820.779 1588.78 803.309 1580.74 792.024 1568.15 C 750.306 1521.64 795.56 1470.43 830.796 1438.78 C 877.833 1395.94 932.647 1376.78 989.175 1351.75 C 1041.92 1328.4 1096.71 1305.92 1148.98 1281.87 C 1208.62 1256.01 1255.6 1239.7 1301.26 1190.03 z',
        'ghf-success-card__party-popper-ribbon'
      ],
      [
        'M 1229.29 1382.33 C 1232.36 1379.92 1255.63 1370.01 1260.66 1367.67 L 1146.97 1649.29 L 1112.66 1733.67 C 1099.46 1765.96 1093.3 1794.2 1058.43 1809.42 C 1040.94 1817.06 1021.13 1817.37 1003.41 1810.28 C 956.551 1791.11 951.371 1733.42 931.431 1692.35 C 926.797 1682.81 919.024 1656.24 913.059 1649.65 C 913.005 1646.28 909.715 1637.61 908.36 1634.41 C 883.81 1576.34 872.915 1551.78 936.026 1514.59 C 985.116 1485.67 1039.47 1466.81 1091.67 1441.9 C 1136.2 1421.88 1184.35 1401.47 1229.29 1382.33 z',
        'ghf-success-card__party-popper-fill'
      ],
      [
        'M 1229.29 1382.33 L 1230.58 1383.99 C 1228.38 1392.5 1215.44 1422.07 1211.55 1431.63 L 1171.77 1530.46 L 1133.73 1625.61 C 1127.04 1642.26 1116.79 1674.08 1104.49 1685.94 C 1062.22 1726.65 994.205 1682.88 1016.32 1627.99 C 1031.01 1589.32 1047.01 1550.96 1062.44 1512.54 C 1067.99 1498.74 1086 1450.36 1091.67 1441.9 C 1136.2 1421.88 1184.35 1401.47 1229.29 1382.33 z',
        'ghf-success-card__party-popper-highlight'
      ],
      [
        'M 622.344 919.046 C 598.084 919.27 580.154 916.948 561.65 899.439 C 548.133 886.534 540.277 868.799 539.802 850.116 C 538.915 805.812 577.388 773.776 619.612 776.034 C 637.24 776.977 658.204 775.85 676.1 775.81 L 838.957 775.437 L 1260.73 774.662 L 1380.71 774.121 C 1396.11 774.06 1430.86 773.128 1445.16 775.149 C 1460.67 777.385 1475.06 784.521 1486.23 795.515 C 1517.05 826.363 1513.66 880.357 1476.95 905.064 C 1460.11 916.402 1446.89 918.29 1427.05 917.733 L 622.344 919.046 z',
        'ghf-success-card__party-popper-rim'
      ],
      [
        'M 1148.98 1281.87 C 1147.17 1277.8 1160.61 1247.71 1163.52 1240.33 L 1203.84 1140.66 L 1240.94 1048.06 C 1247.34 1032.08 1253.48 1015.46 1261.1 1000.06 C 1272.64 976.778 1302.53 967.069 1326.44 975.471 C 1339.77 980.222 1350.7 990.035 1356.85 1002.79 C 1361.36 1012.42 1363.02 1023.14 1361.64 1033.69 C 1359.58 1048.61 1346.52 1075.5 1340.87 1090.54 C 1328.65 1123.1 1312.86 1157.45 1301.26 1190.03 C 1255.6 1239.7 1208.62 1256.01 1148.98 1281.87 z',
        'ghf-success-card__party-popper-highlight'
      ],
      [
        'M 506.123 246.153 C 547.583 243.593 621.006 272.155 658.468 291.409 C 758.342 344.002 833.571 433.71 867.958 541.221 C 871.771 553.197 874.384 564.574 877.328 576.66 C 883.735 602.972 887.926 625.557 874.593 650.558 C 865.124 668.313 851.737 677.919 832.87 683.863 C 793.662 690.322 761.79 662.766 756.933 624.975 C 741.605 505.689 650.313 403.332 531.961 378.35 C 517.345 375.265 499.13 373.958 485.986 366.239 C 456.049 348.658 446.485 304.538 464.351 275.262 C 474.368 258.819 487.955 250.854 506.123 246.153 z',
        'ghf-success-card__party-popper-ribbon'
      ],
      [
        'M 1518.77 245.408 C 1533.25 243.86 1547.75 248.114 1559.1 257.24 C 1572.21 267.601 1580.56 284.036 1582.2 300.576 C 1583.23 312.18 1581.23 323.853 1576.39 334.45 C 1561.99 366.66 1536.57 369.393 1506.85 375.588 C 1496.17 377.812 1485.64 380.669 1475.3 384.143 C 1444.9 393.924 1416.3 408.614 1390.65 427.631 C 1332.89 470.673 1291.26 531.856 1272.43 601.375 C 1266.29 624.74 1270.58 643.02 1252.02 664.066 C 1239.42 678.351 1226.76 684.097 1207.95 685.568 C 1192.91 685.074 1180.44 681.862 1168.53 672.033 C 1154.26 660.292 1145.31 643.305 1143.7 624.896 C 1142.38 610.642 1146.38 594.274 1150.03 580.484 C 1167.89 512.899 1202.54 447.689 1247.66 394.464 C 1310.78 320.013 1420.95 254.118 1518.77 245.408 z',
        'ghf-success-card__party-popper-confetti-warm'
      ],
      [
        'M 952.444 290.243 C 965.224 289.353 978.938 291.133 990 298.034 C 993.905 300.514 997.545 303.387 1000.86 306.608 C 1014.5 319.74 1034.55 343.937 1048.32 358.707 C 1058.23 369.334 1083.91 396.961 1091.55 407.9 C 1096.29 414.546 1099.66 422.062 1101.47 430.015 C 1103.97 441.263 1103.11 452.367 1099.4 463.162 C 1089.84 490.912 1068.87 504.054 1041.61 509.782 C 1007.14 512.055 993.693 499.277 972.103 474.449 C 950.074 449.116 920.388 424.674 900.727 397.757 C 869.484 354.983 902.924 296.958 952.444 290.243 z',
        'ghf-success-card__party-popper-rim'
      ],
      [
        'M 1510.9 498.367 C 1526.93 497.41 1539.27 498.448 1553.46 507.07 C 1568.81 516.456 1579.83 531.534 1584.12 549.015 C 1595.67 597.265 1554.66 621.513 1525.98 652.513 C 1506.07 674.042 1487.53 695.975 1458.41 702.506 C 1442.41 703.885 1429.42 702.074 1415.49 693.645 C 1400.15 684.216 1389.2 669.069 1385.06 651.549 C 1375.97 611.999 1401.9 587.239 1428.49 562.765 C 1454.77 538.586 1475.01 506.457 1510.9 498.367 z',
        'ghf-success-card__party-popper-confetti-warm'
      ],
      [
        'M 547.098 529.801 C 586.613 524.827 622.751 552.634 628.068 592.105 C 633.385 631.575 605.893 667.954 566.47 673.613 C 526.56 679.342 489.634 651.436 484.251 611.478 C 478.869 571.52 507.095 534.837 547.098 529.801 z',
        'ghf-success-card__party-popper-ribbon'
      ]
    ] as const) {
      const path = this.doc.createElementNS('http://www.w3.org/2000/svg', 'path')

      path.setAttribute('d', d)
      path.setAttribute('class', className)
      svg.appendChild(path)
    }

    glyph.appendChild(svg)

    return glyph
  }

  private buildSuccessReward(reward: RendererSuccessCardReward | undefined): HTMLElement | null {
    if (!reward || reward.kind === 'none') return null

    const title = this.resolveContractCopy(reward.title, reward.titleCopyRef, this.copy.successRewardTitle)
    const body = this.resolveContractCopy(reward.body, reward.bodyCopyRef, this.copy.successRewardBody)

    const wrap = el(this.doc, 'div', {
      class: 'ghf-success-card__reward',
      'data-capture': 'growth-form-success-reward'
    })

    wrap.appendChild(el(this.doc, 'p', { class: 'ghf-success-card__reward-title' }, title))
    if (body) wrap.appendChild(el(this.doc, 'p', { class: 'ghf-success-card__reward-body' }, body))

    if (reward.action && this.successActionLabel(reward.action) && reward.action.href) {
      wrap.appendChild(this.buildSuccessAction(reward.action, 'ghf-success-card__reward-action', reward.kind))
    }

    return wrap
  }

  private buildSuccessAction(
    action: RendererSuccessCardAction,
    className: string,
    rewardKind?: string
  ): HTMLAnchorElement {
    const label = this.successActionLabel(action) ?? ''

    const anchor = el(this.doc, 'a', {
      class: `ghf-btn ${className}`,
      href: action.href ?? '#',
      target: action.target ?? '_self'
    })

    if (action.kind === 'schedule') anchor.appendChild(this.buildCalendarIcon())
    anchor.appendChild(el(this.doc, 'span', { class: 'ghf-success-card__action-label' }, label))

    if ((action.target ?? '_self') === '_blank') anchor.setAttribute('rel', 'noopener noreferrer')
    anchor.addEventListener('click', () => {
      this.telemetry.emit('gh_form_success_action_clicked', {
        action_kind: action.kind,
        ...(rewardKind ? { reward_kind: rewardKind } : {})
      })

      if (action.kind === 'asset_access' || action.kind === 'download') {
        this.telemetry.emit('gh_form_asset_accessed', {
          success_behavior: this.contract.successBehavior.kind,
          action_kind: action.kind,
          ...(rewardKind ? { reward_kind: rewardKind } : {})
        })
      }
    })

    return anchor
  }

  private buildCalendarIcon(): HTMLElement {
    const icon = el(this.doc, 'span', { class: 'ghf-success-card__action-icon', 'aria-hidden': 'true' })
    const svg = this.doc.createElementNS('http://www.w3.org/2000/svg', 'svg')

    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke-width', '2')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('focusable', 'false')

    for (const d of ['M8 2v4', 'M16 2v4', 'M3 10h18']) {
      const path = this.doc.createElementNS('http://www.w3.org/2000/svg', 'path')

      path.setAttribute('d', d)
      svg.appendChild(path)
    }

    const rect = this.doc.createElementNS('http://www.w3.org/2000/svg', 'rect')

    rect.setAttribute('x', '3')
    rect.setAttribute('y', '4')
    rect.setAttribute('width', '18')
    rect.setAttribute('height', '18')
    rect.setAttribute('rx', '2')
    svg.appendChild(rect)
    icon.appendChild(svg)

    return icon
  }

  private successActionLabel(action: RendererSuccessCardAction): string | undefined {
    return this.resolveContractCopy(action.label, action.labelCopyRef)
  }

  private resolveSuccessSteps(steps: RendererSuccessCardStep[] | undefined): string[] {
    if (Array.isArray(steps)) {
      return steps
        .slice(0, 4)
        .map(step => this.resolveContractCopy(step.label, step.copyRef))
        .filter((step): step is string => Boolean(step))
    }

    return this.copy.successCardSteps
  }

  private resolveContractCopy(value?: string, copyRef?: string, fallback?: string): string | undefined {
    const refValue = copyRef ? this.contract.copy?.[copyRef] : undefined
    const candidate = value ?? refValue ?? fallback
    const text = candidate?.trim()

    return text || undefined
  }

  // ─── Focus + summary helpers ─────────────────────────────────────────────---

  private setSummary(text: string): void {
    const summary = this.opts.root.querySelector<HTMLElement>('[data-ghf-summary]')

    if (summary) summary.textContent = text
  }

  private focusFirstInvalid(): void {
    const firstKey = this.fieldsForStep().find(f => this.errors[f.key])?.key

    if (!firstKey) return
    const control = this.opts.root.querySelector<HTMLElement>(`[name="${CSS.escape(firstKey)}"]`)

    control?.focus?.()
  }

  private focusPrimary(): void {
    this.opts.root.querySelector<HTMLElement>('[data-ghf-primary]')?.focus?.()
  }

  private focusStepHeading(): void {
    this.opts.root.querySelector<HTMLElement>('.ghf-progress')?.focus?.()
  }
}
