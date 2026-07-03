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
  RenderContract,
  RendererFieldDefinition,
  RendererSuccessBehavior,
  RendererSuccessCardAction,
  RendererSuccessCardReward,
  RendererSuccessCardStep,
  RendererStep,
} from './contract'
import { isFieldRequired, isFieldVisible, type FieldValues } from './conditions'
import {
  formatNationalPhoneDisplay,
  maskOpsFor,
  nationalFromStored,
  parseE164,
  PHONE_COUNTRIES,
  stripNationalDigits,
  toE164,
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
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = doc.createElement(tag)

  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  if (text !== undefined) node.textContent = text

  return node
}

let idSeq = 0

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
      ...(this.pageContext.pageName ? { page_name: this.pageContext.pageName } : {}),
    }

    this.telemetry = createTelemetryEmitter(opts.root, this.contract.telemetryPolicy, base)

    for (const field of this.contract.fields) {
      this.values[field.key] = field.type === 'consent' || field.type === 'checkbox' ? false : ''
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
      form.appendChild(
        el(this.doc, 'p', { class: 'ghf-progress', 'aria-live': 'polite' }, this.copy.stepProgress(this.currentStep + 1, steps.length)),
      )
    }

    const fieldsWrap = el(this.doc, 'div', { class: 'ghf-fields' })

    for (const field of this.fieldsForStep()) {
      if (field.type === 'hidden') continue
      if (!isFieldVisible(field, this.values)) continue
      fieldsWrap.appendChild(this.renderField(field))
    }

    form.appendChild(fieldsWrap)

    if (this.isLastStep()) {
      const consentNode = this.renderConsent()

      if (consentNode) form.appendChild(consentNode)
    }

    // Honeypot anti-bot (oculto, no requerido, autocomplete off).
    const honey = el(this.doc, 'div', { class: 'ghf-honeypot', 'aria-hidden': 'true' })
    const honeyInput = el(this.doc, 'input', { type: 'text', name: 'company_website', tabindex: '-1', autocomplete: 'off' })

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

  private renderField(field: RendererFieldDefinition): HTMLElement {
    const fieldId = `${this.instanceId}-${field.key}`
    const errorId = `${fieldId}-error`
    const helpText = this.contract.copy?.[`${field.key}.help`]
    const helpId = helpText ? `${fieldId}-help` : undefined
    const required = isFieldRequired(field, this.values)
    const error = this.errors[field.key]
    const fullWidth = this.fieldPrefersFullWidth(field)

    const wrap = el(this.doc, 'div', {
      class: `ghf-field${fullWidth ? ' ghf-field--full' : ''}`,
      'data-invalid': error ? 'true' : 'false',
      'data-status': this.fieldStatus.get(field.key) ?? 'neutral',
    })

    const label = this.fieldLabel(field)

    if (field.type !== 'checkbox' && field.type !== 'consent') {
      const labelEl = el(this.doc, 'label', { class: 'ghf-label', for: fieldId }, label)

      if (required) labelEl.appendChild(el(this.doc, 'span', { class: 'ghf-required', 'aria-hidden': 'true' }, '*'))
      else labelEl.appendChild(el(this.doc, 'span', { class: 'ghf-optional' }, '(opcional)'))
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
    } else if (field.type === 'select' || field.type === 'multiselect') {
      const controlWrap = el(this.doc, 'div', { class: 'ghf-control ghf-control--select' })
      const customSelect = control.classList.contains('ghf-select-composite')

      controlWrap.appendChild(control)
      if (field.type === 'select' && !customSelect) controlWrap.appendChild(el(this.doc, 'span', { class: 'ghf-select-icon', 'aria-hidden': 'true' }))
      wrap.appendChild(controlWrap)
    } else if (supportsStatusIcon) {
      const controlWrap = el(this.doc, 'div', { class: 'ghf-control' })

      controlWrap.appendChild(control)
      controlWrap.appendChild(el(this.doc, 'span', { class: 'ghf-status-icon', 'aria-hidden': 'true' }))
      wrap.appendChild(controlWrap)
    } else {
      wrap.appendChild(control)
    }

    if (helpText && helpId) wrap.appendChild(el(this.doc, 'p', { class: 'ghf-help', id: helpId }, helpText))
    if (error) wrap.appendChild(el(this.doc, 'p', { class: 'ghf-error', id: errorId, role: 'alert' }, error))

    // Contador de caracteres para campos con límite (aria-hidden: el maxlength nativo es
    // el contrato SR; el contador es ayuda visual). TASK-1256 Slice 1d.
    if (field.maxLength && (field.type === 'text' || field.type === 'textarea')) {
      const current = typeof this.values[field.key] === 'string' ? (this.values[field.key] as string).length : 0
      const counter = el(this.doc, 'p', { class: 'ghf-counter', 'aria-hidden': 'true' }, `${current} / ${field.maxLength}`)

      counter.dataset.near = current >= field.maxLength * 0.9 ? 'true' : 'false'
      wrap.appendChild(counter)
    }

    return wrap
  }

  private fieldPrefersFullWidth(field: RendererFieldDefinition): boolean {
    if (field.type === 'textarea' || field.type === 'multiselect' || field.type === 'checkbox' || field.type === 'consent') {
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

  private renderControl(
    field: RendererFieldDefinition,
    fieldId: string,
    required: boolean,
    describedBy: string,
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
          this.values[field.key] = field.type === 'multiselect'
            ? Array.from(select.selectedOptions).map(o => o.value)
            : select.value
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

      default: {
        const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'
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
    return this.contract.styleVariant === 'diagnostic_premium'
  }

  private selectOptionsFor(field: RendererFieldDefinition): { value: string; label: string }[] {
    const hasBlankOption = field.options?.some(opt => opt.value === '') ?? false
    const options = [...(field.options ?? [])]

    if (!isFieldRequired(field, this.values) && !hasBlankOption) {
      options.unshift({ value: '', label: field.placeholder ?? '—' })
    }

    return options.map(option => ({
      value: option.value,
      label: option.copyRef && this.contract.copy?.[option.copyRef] ? this.contract.copy[option.copyRef] : option.label ?? option.value,
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
      'aria-controls': listId,
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
        'data-value': option.value,
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
    wrapper.appendChild(input)

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
      }, FormRenderer.STATUS_ERROR_DEBOUNCE_MS),
    )
  }

  /**
   * Aplica una máscara de display EN VIVO preservando el caret: cuenta los chars
   * "significativos" (según `isSig`) antes del caret, reformatea, y reubica el caret
   * tras la misma cantidad. Evita el salto de cursor del formateo as-you-type.
   */
  private applyMaskedLive(input: HTMLInputElement, format: (value: string) => string, isSig: (char: string) => boolean): void {
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
    this.patchReadinessHint()
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
      node.textContent = this.copy.readyToSend
      node.dataset.ready = 'true'
      // Sin bloqueos: limpia el summary assertive de un intento de envío previo.
      this.setSummary('')
    } else {
      node.textContent = this.copy.fieldsRemaining(remaining)
      node.dataset.ready = 'false'
    }
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

      if (error) entries.push({ focusSelector: `[name="${CSS.escape(field.key)}"]`, text: `${this.fieldLabel(field)}: ${error}` })
    }

    if (this.isLastStep()) {
      for (const box of this.contract.consent?.checkboxes ?? []) {
        if (box.required !== false && this.consentState[box.key] !== true) {
          entries.push({ focusSelector: `[data-ghf-consent="${CSS.escape(box.key)}"]`, text: `${box.label ?? box.copyRef ?? 'Consentimiento'}: ${this.copy.errors.consentRequired}` })
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
      const a = el(this.doc, 'a', { href: consent.privacyUrl, target: '_blank', rel: 'noopener noreferrer' }, consent.privacyUrl)

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
        this.renderForm()
      })
      actions.appendChild(back)
    }

    const isLast = this.isLastStep()
    const submitLabel = isLast ? this.submitLabel() : this.copy.stepNext
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
      this.setPrimaryLabel(primary, this.copy.submitPending)
    } else if (this.isVerifyingAny()) {
      // Una verificación de correo en vuelo deshabilita el submit (UX; no autoridad).
      primary.setAttribute('aria-disabled', 'true')
    }

    actions.appendChild(primary)

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

    button.appendChild(el(this.doc, 'span', { class: 'ghf-btn-label' }, label))
  }

  private isLastStep(): boolean {
    const steps = this.steps

    return !steps || this.currentStep >= steps.length - 1
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
      f => f.visibleWhen?.some(c => c.field === field.key) || f.requiredWhen?.some(c => c.field === field.key),
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
    else if (!this.isFieldEmpty(field.key)) this.setFieldStatus(field, this.hasMeaningfulValidator(field) ? 'success' : 'neutral')
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
      setTimeout(() => void this.runEmailVerify(field), FormRenderer.EMAIL_VERIFY_DEBOUNCE_MS),
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
      if (this.isEmailGated(field) && (result.reasonCode === 'email_not_corporate' || result.reasonCode === 'email_disposable')) {
        this.errors[field.key] = result.reasonCode === 'email_disposable' ? this.copy.errors.disposable : this.copy.errors.corporate
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

    if (this.isVerifyingAny()) primary.setAttribute('aria-disabled', 'true')
    else primary.removeAttribute('aria-disabled')
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
      else wrap.appendChild(el(this.doc, 'p', { class: 'ghf-verify-status', 'aria-live': 'polite' }, this.copy.emailVerifying))
    } else {
      existingStatus?.remove()
    }

    // Affordance typo-suggest "¿quisiste decir …?" (clickable → aplica + re-verifica).
    const existingSuggest = wrap.querySelector('.ghf-verify-suggest')

    if (suggestion && !verifying) {
      if (existingSuggest) existingSuggest.remove()
      const button = el(this.doc, 'button', { type: 'button', class: 'ghf-verify-suggest' }, this.copy.emailSuggestion(suggestion))

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
      if (this.consentState[box.key] !== true) return this.copy.errors.consentRequired
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
      this.setSummary(this.copy.submitError)
      this.focusPrimary()

      return
    }

    this.telemetry.emit('gh_form_submitted', {})

    const result = await submitPublicForm(
      this.api,
      {
        fields: this.collectFieldValues(),
        consent: this.contract.consent ? consentCheckboxes.length > 0 || (this.contract.consent.checkboxes ?? []).length === 0 : true,
        consentCheckboxes,
        honeypot: honey,
        pageUri: this.pageContext.pageUri,
        pageName: this.pageContext.pageName,
        referrer: this.pageContext.referrer,
        formVersionId: this.contract.form.formVersionId,
        captchaToken,
      },
      this.fetchImpl,
    )

    this.submitting = false
    this.turnstile?.reset()

    if (result.outcome === 'accepted') {
      this.telemetry.emit('gh_form_submission_accepted', {
        ...(result.submissionId ? { correlation_id: result.submissionId } : {}),
        success_behavior: this.contract.successBehavior.kind,
      })
      this.clearDraft() // enviado OK → el borrador ya no aplica.
      this.renderSuccess()

      return
    }

    this.telemetry.emit('gh_form_submission_rejected', { reason_class: result.outcome })
    this.renderForm()
    this.setSummary(this.copy.submitError)
    this.focusPrimary()
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
      const value = this.values[field.key]

      if (value === '' || value === false || (Array.isArray(value) && value.length === 0)) continue
      // Solo enviar campos visibles (el server re-evalúa condiciones — Arch §20).
      if (!isFieldVisible(field, this.values)) continue
      out[field.key] = value
    }

    return out
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

    const message = behavior.message
      ?? (behavior.messageCopyRef ? this.contract.copy?.[behavior.messageCopyRef] : undefined)
      ?? this.copy.successFallback

    const status = el(this.doc, 'div', { class: 'ghf-status ghf-status--success', role: 'status', 'aria-live': 'polite', tabindex: '-1' }, message)

    root.appendChild(status)
    status.focus?.()
  }

  private buildSuccessCard(behavior: RendererSuccessBehavior): HTMLElement {
    const title = this.resolveContractCopy(behavior.title, behavior.titleCopyRef, this.copy.successCardTitle)
    const body = this.resolveContractCopy(behavior.body, behavior.bodyCopyRef, this.copy.successCardBody)
    const steps = this.resolveSuccessSteps(behavior.steps)
    const actions = (behavior.actions ?? []).slice(0, 2).filter(action => this.successActionLabel(action) && action.href)
    const reward = this.buildSuccessReward(behavior.reward)
    const support = this.resolveContractCopy(behavior.supportingNote, behavior.supportingNoteCopyRef)

    const card = el(this.doc, 'section', {
      class: 'ghf-success-card',
      role: 'status',
      'aria-live': 'polite',
      tabindex: '-1',
      'data-capture': 'growth-form-success-card',
    })

    const aura = el(this.doc, 'span', { class: 'ghf-success-card__aura', 'aria-hidden': 'true' })

    const mark = el(this.doc, 'span', { class: 'ghf-success-card__mark', 'aria-hidden': 'true' })

    mark.appendChild(el(this.doc, 'span', { class: 'ghf-success-card__mark-glyph', 'aria-hidden': 'true' }, '✓'))

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
      const actionRow = el(this.doc, 'div', { class: 'ghf-success-card__actions', 'data-capture': 'growth-form-success-actions' })

      for (const action of actions) {
        actionRow.appendChild(this.buildSuccessAction(action, 'ghf-success-card__action'))
      }

      content.appendChild(actionRow)
    }

    if (support) content.appendChild(el(this.doc, 'p', { class: 'ghf-success-card__support' }, support))

    card.append(aura, mark, content)

    return card
  }

  private buildSuccessReward(reward: RendererSuccessCardReward | undefined): HTMLElement | null {
    if (!reward || reward.kind === 'none') return null

    const title = this.resolveContractCopy(reward.title, reward.titleCopyRef, this.copy.successRewardTitle)
    const body = this.resolveContractCopy(reward.body, reward.bodyCopyRef, this.copy.successRewardBody)
    const wrap = el(this.doc, 'div', { class: 'ghf-success-card__reward', 'data-capture': 'growth-form-success-reward' })

    wrap.appendChild(el(this.doc, 'p', { class: 'ghf-success-card__reward-title' }, title))
    if (body) wrap.appendChild(el(this.doc, 'p', { class: 'ghf-success-card__reward-body' }, body))

    if (reward.action && this.successActionLabel(reward.action) && reward.action.href) {
      wrap.appendChild(this.buildSuccessAction(reward.action, 'ghf-success-card__reward-action', reward.kind))
    }

    return wrap
  }

  private buildSuccessAction(action: RendererSuccessCardAction, className: string, rewardKind?: string): HTMLAnchorElement {
    const label = this.successActionLabel(action) ?? ''

    const anchor = el(this.doc, 'a', {
      class: `ghf-btn ${className}`,
      href: action.href ?? '#',
      target: action.target ?? '_self',
    })

    if (action.kind === 'schedule') anchor.appendChild(this.buildCalendarIcon())
    anchor.appendChild(el(this.doc, 'span', { class: 'ghf-success-card__action-label' }, label))

    if ((action.target ?? '_self') === '_blank') anchor.setAttribute('rel', 'noopener noreferrer')
    anchor.addEventListener('click', () => {
      this.telemetry.emit('gh_form_success_action_clicked', {
        action_kind: action.kind,
        ...(rewardKind ? { reward_kind: rewardKind } : {}),
      })

      if (action.kind === 'asset_access' || action.kind === 'download') {
        this.telemetry.emit('gh_form_asset_accessed', {
          success_behavior: this.contract.successBehavior.kind,
          action_kind: action.kind,
          ...(rewardKind ? { reward_kind: rewardKind } : {}),
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
    const resolved = (steps ?? [])
      .slice(0, 4)
      .map(step => this.resolveContractCopy(step.label, step.copyRef))
      .filter((step): step is string => Boolean(step))

    return resolved.length > 0 ? resolved : this.copy.successCardSteps
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
