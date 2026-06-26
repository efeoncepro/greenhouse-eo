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
  RendererStep,
} from './contract'
import { isFieldRequired, isFieldVisible, type FieldValues } from './conditions'
import { maskOpsFor } from './mask'
import { resolveSystemCopy, type RendererSystemCopy } from './copy'
import { validateField, validateFields, type FieldErrors } from './validation'
import { createTelemetryEmitter, type TelemetryEmitter, type TelemetryPayload } from './telemetry'
import { submitPublicForm, verifyPublicEmail, type RendererApiConfig } from './api-client'
import { RENDERER_VERSION } from './version'
import { validateFormValue } from '@/lib/growth/forms/validators/core'

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

  constructor(private readonly opts: FormRendererOptions) {
    this.doc = opts.doc ?? document
    this.contract = opts.contract
    this.api = opts.api
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.pageContext = opts.pageContext ?? {}
    this.copy = resolveSystemCopy(opts.locale ?? this.contract.form.locale)

    const base: TelemetryPayload = {
      form_id: this.contract.form.formId,
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
    // Marca el root como scope del renderer: los tokens `--ghf-*` se definen sobre
    // `.ghf-scope`, así el core funciona montado en un div cualquiera (preview Greenhouse)
    // o dentro de `<greenhouse-form>` (hosts públicos) — sin depender del tag.
    this.opts.root.classList.add('ghf-scope')
    if (this.opts.colorScheme) this.opts.root.setAttribute('data-color-scheme', this.opts.colorScheme)
    this.telemetry.emit('gh_form_viewed', {})
    this.renderForm()
  }

  destroy(): void {
    this.destroyed = true
    for (const timer of this.verifyTimers.values()) clearTimeout(timer)
    this.verifyTimers.clear()
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
  }

  private renderField(field: RendererFieldDefinition): HTMLElement {
    const fieldId = `${this.instanceId}-${field.key}`
    const errorId = `${fieldId}-error`
    const helpText = this.contract.copy?.[`${field.key}.help`]
    const helpId = helpText ? `${fieldId}-help` : undefined
    const required = isFieldRequired(field, this.values)
    const error = this.errors[field.key]
    const isPaired = field.type === 'tel' || field.type === 'date' || field.type === 'number'

    const wrap = el(this.doc, 'div', {
      class: `ghf-field${isPaired ? '' : ' ghf-field--full'}`,
      'data-invalid': error ? 'true' : 'false',
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

    if (field.type === 'checkbox' || field.type === 'consent') {
      // Layout label-al-lado para checkboxes.
      const checkWrap = el(this.doc, 'label', { class: 'ghf-check', for: fieldId })

      checkWrap.appendChild(control)
      checkWrap.appendChild(el(this.doc, 'span', {}, label))
      wrap.appendChild(checkWrap)
    } else {
      wrap.appendChild(control)
    }

    if (helpText && helpId) wrap.appendChild(el(this.doc, 'p', { class: 'ghf-help', id: helpId }, helpText))
    if (error) wrap.appendChild(el(this.doc, 'p', { class: 'ghf-error', id: errorId, role: 'alert' }, error))

    return wrap
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

      case 'multiselect': {
        const select = el(this.doc, 'select', { ...common, class: 'ghf-select' })

        if (field.type === 'multiselect') select.setAttribute('multiple', 'multiple')
        if (!required && field.type === 'select') select.appendChild(el(this.doc, 'option', { value: '' }, '—'))

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

      default: {
        const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'tel' ? 'tel' : 'text'
        const input = el(this.doc, 'input', { ...common, type: inputType, class: 'ghf-input' })

        if (field.maxLength) input.setAttribute('maxlength', String(field.maxLength))
        if (field.placeholder) input.setAttribute('placeholder', field.placeholder)
        input.value = typeof current === 'string' ? current : ''
        this.wireText(field, input)

        return input
      }
    }
  }

  /** Cablea inputs de texto con máscara forgiving + timing 3-stage. */
  private wireText(field: RendererFieldDefinition, input: HTMLInputElement | HTMLTextAreaElement): void {
    const mask = maskOpsFor(field)

    input.addEventListener('input', () => {
      this.values[field.key] = mask.toStored(input.value)
      this.maybeStart()
      // Stage 3: si ya erró, re-validar onChange para confirmar el fix.
      if (this.errors[field.key]) this.revalidateField(field)
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
    const primary = el(this.doc, 'button', { type: 'submit', class: 'ghf-btn' }, submitLabel)

    primary.dataset.ghfPrimary = 'true'

    if (this.submitting) {
      primary.setAttribute('aria-disabled', 'true')
      primary.textContent = this.copy.submitPending
    } else if (this.isVerifyingAny()) {
      // Una verificación de correo en vuelo deshabilita el submit (UX; no autoridad).
      primary.setAttribute('aria-disabled', 'true')
    }

    actions.appendChild(primary)

    return actions
  }

  private submitLabel(): string {
    const fromCopy = this.contract.copy?.['submit']

    return fromCopy ?? this.copy.submitByKind[this.contract.form.formKind] ?? this.copy.stepNext
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
  }

  private onValueChange(field: RendererFieldDefinition): void {
    this.maybeStart()

    // Re-render solo si hay condiciones que dependen de este campo (conditional_simple).
    const affectsVisibility = this.contract.fields.some(
      f => f.visibleWhen?.some(c => c.field === field.key) || f.requiredWhen?.some(c => c.field === field.key),
    )

    if (this.errors[field.key]) this.revalidateField(field)
    if (affectsVisibility) this.renderForm()
  }

  private revalidateField(field: RendererFieldDefinition): void {
    if (!this.touched.has(field.key)) return
    const error = validateField(field, this.values, this.copy)
    const prev = this.errors[field.key]

    if (error) this.errors[field.key] = error
    else delete this.errors[field.key]

    if (error && error !== prev) {
      this.telemetry.emit('gh_form_field_validation_failed', { reason_class: field.type })
    }

    this.patchFieldErrorDom(field.key)
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

    this.errors = validateFields(stepFields, this.values, this.copy)
    const consentError = this.isLastStep() ? this.validateConsent() : null

    // Campos inválidos primero: re-render para mostrar el error inline + foco al primero.
    if (Object.keys(this.errors).length > 0) {
      this.renderForm()
      this.setSummary(consentError ?? this.copy.validationSummary(Object.keys(this.errors).length))
      this.focusFirstInvalid()

      return
    }

    // Campos OK pero falta consentimiento requerido.
    if (consentError) {
      this.setSummary(consentError)
      this.focusPrimary()

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
      },
      this.fetchImpl,
    )

    this.submitting = false

    if (result.outcome === 'accepted') {
      this.telemetry.emit('gh_form_submission_accepted', {
        ...(result.submissionId ? { correlation_id: result.submissionId } : {}),
        success_behavior: this.contract.successBehavior.kind,
      })
      this.renderSuccess()

      return
    }

    this.telemetry.emit('gh_form_submission_rejected', { reason_class: result.outcome })
    this.renderForm()
    this.setSummary(this.copy.submitError)
    this.focusPrimary()
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

    const message = behavior.message
      ?? (behavior.messageCopyRef ? this.contract.copy?.[behavior.messageCopyRef] : undefined)
      ?? this.copy.successFallback

    const status = el(this.doc, 'div', { class: 'ghf-status', role: 'status', 'aria-live': 'polite', tabindex: '-1' }, message)

    root.appendChild(status)
    status.focus?.()
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
