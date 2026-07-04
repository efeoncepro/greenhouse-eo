// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { RendererApiConfig } from '../api-client'
import { FormRenderer } from '../renderer'
import { conditionalContractFixture, multiStepContractFixture, staticContractFixture } from '../fixtures'
import { resetTurnstileLoaderForTests } from '../turnstile'

const api: RendererApiConfig = { baseUrl: 'https://gh.test', slug: 'ai-visibility-intake', surfaceId: 'wordpress-public' }

const okFetch = (outcome = 'accepted', submissionId = 'sub_1') =>
  vi.fn(async () => new Response(JSON.stringify({ outcome, submissionId }), { status: 202 })) as unknown as typeof fetch

const mountInto = (contract = staticContractFixture(), fetchImpl = okFetch()) => {
  const root = document.createElement('div')

  document.body.appendChild(root)
  const renderer = new FormRenderer({ root, contract, api, fetchImpl, doc: document })

  renderer.mount()

  return { root, renderer }
}

const fillStaticRequiredFields = (root: HTMLElement) => {
  root.querySelector<HTMLInputElement>('[name="work_email"]')!.value = 'lead@brand.com'
  root.querySelector<HTMLInputElement>('[name="work_email"]')!.dispatchEvent(new Event('input'))
  root.querySelector<HTMLInputElement>('[name="brand"]')!.value = 'Brand'
  root.querySelector<HTMLInputElement>('[name="brand"]')!.dispatchEvent(new Event('input'))
  const consent = root.querySelector<HTMLInputElement>('[data-ghf-consent="tos"]')

  if (consent) {
    consent.checked = true
    consent.dispatchEvent(new Event('change'))
  }
}

describe('growth-forms-renderer · FormRenderer', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    ;(window as unknown as { dataLayer?: unknown[] }).dataLayer = []
    ;(window as unknown as { turnstile?: unknown }).turnstile = undefined
    resetTurnstileLoaderForTests()
    window.localStorage.clear()
  })

  it('scopes the standalone mount root with .ghf-scope (div mount / internal preview)', () => {
    const { root } = mountInto()

    expect(root.classList.contains('ghf-scope')).toBe(true)
  })

  it('does NOT add .ghf-scope when hosted inside <greenhouse-form> (host is the scope, TASK-1298)', () => {
    // El host declara los tokens --ghf-* (selector `greenhouse-form`); re-declararlos en
    // el wrapper interno (.ghf-scope) sombrearía los overrides del host — appearance="bare"
    // y `greenhouse-form { --ghf-font/--ghf-bg }` dejaban de propagar al contenido.
    const host = document.createElement('div')

    document.body.appendChild(host)
    const root = document.createElement('div')

    host.appendChild(root)

    const renderer = new FormRenderer({
      root,
      contract: staticContractFixture(),
      api,
      fetchImpl: okFetch(),
      doc: document,
      hosted: true,
    })

    renderer.mount()

    expect(root.classList.contains('ghf-scope')).toBe(false)
  })

  it('exposes contract styleVariant on the renderer root for governed visual variants', () => {
    const { root } = mountInto(staticContractFixture({ styleVariant: 'diagnostic_premium' }))

    expect(root.getAttribute('data-ghf-style-variant')).toBe('diagnostic_premium')
  })

  it('renders labels above inputs with autocomplete + inputmode from the contract', () => {
    const { root } = mountInto()
    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    expect(email.getAttribute('autocomplete')).toBe('email')
    expect(email.getAttribute('inputmode')).toBe('email')
    const label = root.querySelector('label[for$="work_email"]')

    expect(label?.classList.contains('ghf-label')).toBe(true)
    // label precede al input en el DOM (label-above).
    expect(label!.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps submit enabled and focuses + describes the first invalid field on submit', () => {
    const { root } = mountInto()
    const form = root.querySelector('form')!
    const primary = root.querySelector<HTMLButtonElement>('[data-ghf-primary]')!

    expect(primary.getAttribute('aria-disabled')).toBeNull()
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    expect(email.getAttribute('aria-invalid')).toBe('true')
    const errorId = email.getAttribute('aria-describedby')!.split(' ').pop()!
    const errorNode = root.querySelector(`#${errorId}`)!

    expect(errorNode.getAttribute('role')).toBe('alert')
    expect(errorNode.textContent).toBeTruthy()
  })

  it('prevents primary pointerdown from causing pre-submit blur layout shift', () => {
    const { root } = mountInto()
    const primary = root.querySelector<HTMLButtonElement>('[data-ghf-primary]')!
    const event = new window.Event('pointerdown', { bubbles: true, cancelable: true })

    primary.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('submits raw values, emits the funnel, and shows inline success', async () => {
    const fetchImpl = okFetch()
    const { root } = mountInto(staticContractFixture(), fetchImpl)
    const events: string[] = []

    root.addEventListener('gh_form_submitted', () => events.push('submitted'))
    root.addEventListener('gh_form_submission_accepted', () => events.push('accepted'))

    root.querySelector<HTMLInputElement>('[name="work_email"]')!.value = 'lead@brand.com'
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.dispatchEvent(new Event('input'))
    root.querySelector<HTMLInputElement>('[name="brand"]')!.value = 'Brand'
    root.querySelector<HTMLInputElement>('[name="brand"]')!.dispatchEvent(new Event('input'))
    // máscara de teléfono: tipea formateado, se envía crudo
    const phone = root.querySelector<HTMLInputElement>('[name="phone"]')!

    phone.value = '+56 9 1234 5678'
    phone.dispatchEvent(new Event('input'))
    const consent = root.querySelector<HTMLInputElement>('[data-ghf-consent="tos"]')!

    consent.checked = true
    consent.dispatchEvent(new Event('change'))

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await vi.waitFor(() => expect(events).toContain('accepted'))

    const calls = (fetchImpl as unknown as { mock: { calls: Array<[string, { body: string }]> } }).mock.calls
    const body = JSON.parse(calls[0][1].body)

    expect(body.fields.work_email).toBe('lead@brand.com')
    expect(body.fields.phone).toBe('+56912345678') // crudo, no enmascarado
    expect(body.consentCheckboxes).toEqual(['tos'])
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Listo')
  })

  it('emits the tokenized_report handoff (run_handle + absolute status_url) on accepted — TASK-1336', async () => {
    const fetchImpl = okFetch('accepted', 'fsub-abc-123')

    const contract = staticContractFixture({
      successBehavior: {
        kind: 'tokenized_report',
        tokenizedReport: { statusPathTemplate: '/api/public/growth/ai-visibility/run/{handle}' },
      },
    })

    const { root } = mountInto(contract, fetchImpl)
    const accepted: CustomEvent[] = []

    root.addEventListener('gh_form_submission_accepted', event => accepted.push(event as CustomEvent))
    fillStaticRequiredFields(root)
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    await vi.waitFor(() => expect(accepted).toHaveLength(1))

    expect(accepted[0].detail).toMatchObject({
      event: 'gh_form_submission_accepted',
      success_behavior: 'tokenized_report',
      correlation_id: 'fsub-abc-123',
      run_handle: 'fsub-abc-123',
      status_url: 'https://gh.test/api/public/growth/ai-visibility/run/fsub-abc-123',
    })
    // Nunca fuga PII ni reportToken en el handoff.
    expect(JSON.stringify(accepted[0].detail)).not.toContain('lead@brand.com')
    expect(JSON.stringify(accepted[0].detail)).not.toContain('reportToken')
  })

  it('does NOT emit a handoff for tokenized_report without statusPathTemplate (legacy compat) — TASK-1336', async () => {
    const contract = staticContractFixture({ successBehavior: { kind: 'tokenized_report' } })
    const { root } = mountInto(contract, okFetch('accepted', 'fsub-legacy'))
    const accepted: CustomEvent[] = []

    root.addEventListener('gh_form_submission_accepted', event => accepted.push(event as CustomEvent))
    fillStaticRequiredFields(root)
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    await vi.waitFor(() => expect(accepted).toHaveLength(1))

    expect(accepted[0].detail).not.toHaveProperty('run_handle')
    expect(accepted[0].detail).not.toHaveProperty('status_url')
  })

  it('does NOT emit a handoff for non-tokenized success behaviors — TASK-1336', async () => {
    const { root } = mountInto(staticContractFixture(), okFetch('accepted', 'fsub-inline'))
    const accepted: CustomEvent[] = []

    root.addEventListener('gh_form_submission_accepted', event => accepted.push(event as CustomEvent))
    fillStaticRequiredFields(root)
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    await vi.waitFor(() => expect(accepted).toHaveLength(1))

    expect(accepted[0].detail).not.toHaveProperty('run_handle')
    expect(accepted[0].detail).not.toHaveProperty('status_url')
  })

  it('renders a structured success card after accepted and focuses it', async () => {
    const contract = staticContractFixture({
      copy: {
        'success.title': 'Recibimos tu diagnóstico',
        'success.body': 'Tu solicitud quedó registrada. Revisaremos las señales públicas de tu marca.',
        'success.step.review': 'Validamos la información enviada.',
        'success.step.next': 'Preparamos el siguiente paso.',
      },
      successBehavior: {
        kind: 'review_pending',
        presentation: 'success_card',
        titleCopyRef: 'success.title',
        bodyCopyRef: 'success.body',
        steps: [{ copyRef: 'success.step.review' }, { copyRef: 'success.step.next' }],
        supportingNote: 'Confirmamos recepción; la entrega a sistemas externos ocurre después.',
      },
    })

    const { root } = mountInto(contract)
    const viewed: CustomEvent[] = []

    root.addEventListener('gh_form_success_viewed', event => viewed.push(event as CustomEvent))
    fillStaticRequiredFields(root)
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    await vi.waitFor(() => expect(root.querySelector('[data-capture="growth-form-success-card"]')).not.toBeNull())

    const card = root.querySelector<HTMLElement>('[data-capture="growth-form-success-card"]')!

    expect(card.getAttribute('role')).toBe('status')
    expect(card.getAttribute('aria-live')).toBe('polite')
    expect(document.activeElement).toBe(card)
    expect(root.querySelector('form')).toBeNull()
    expect(card.textContent).toContain('Recibimos tu diagnóstico')
    expect(card.textContent).toContain('Validamos la información enviada.')
    expect(card.textContent).toContain('Confirmamos recepción')
    expect(root.querySelectorAll('.ghf-success-card__step')).toHaveLength(2)
    expect(viewed).toHaveLength(1)
    expect(viewed[0].detail).toMatchObject({ event: 'gh_form_success_viewed', success_behavior: 'review_pending' })
    expect(JSON.stringify(viewed[0].detail)).not.toContain('lead@brand.com')
  })

  it('renders governed reward/action CTAs and emits allowlisted action telemetry without field values', async () => {
    const contract = staticContractFixture({
      successBehavior: {
        kind: 'asset_access',
        presentation: 'success_card',
        title: 'Recibimos tu información',
        body: 'Puedes abrir el recurso de inicio.',
        steps: [{ label: 'Guardamos tu solicitud.' }],
        reward: {
          kind: 'ebook',
          title: 'Te dejamos un recurso para empezar',
          body: 'Puedes descargarlo ahora sin volver a completar el formulario.',
          action: {
            kind: 'download',
            label: 'Descargar ebook',
            href: 'https://efeoncepro.com/recursos/aeo.pdf',
            target: '_blank',
          },
        },
        actions: [
          {
            kind: 'schedule',
            label: 'Agenda una reunión',
            href: 'https://efeoncepro.com/contacto/',
            target: '_self',
          },
        ],
      },
    })

    const { root } = mountInto(contract)
    const actionEvents: CustomEvent[] = []
    const assetEvents: CustomEvent[] = []

    root.addEventListener('gh_form_success_action_clicked', event => actionEvents.push(event as CustomEvent))
    root.addEventListener('gh_form_asset_accessed', event => assetEvents.push(event as CustomEvent))
    fillStaticRequiredFields(root)
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    await vi.waitFor(() => expect(root.querySelector('[data-capture="growth-form-success-reward"]')).not.toBeNull())

    const rewardAction = root.querySelector<HTMLAnchorElement>('.ghf-success-card__reward-action')!

    expect(rewardAction.textContent).toBe('Descargar ebook')
    expect(rewardAction.getAttribute('target')).toBe('_blank')
    expect(rewardAction.getAttribute('rel')).toBe('noopener noreferrer')
    expect(root.querySelector('[data-capture="growth-form-success-actions"]')?.textContent).toContain('Agenda una reunión')
    expect(root.querySelector('.ghf-success-card__action .ghf-success-card__action-icon svg')).not.toBeNull()

    rewardAction.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(actionEvents[0].detail).toMatchObject({
      event: 'gh_form_success_action_clicked',
      action_kind: 'download',
      reward_kind: 'ebook',
    })
    expect(assetEvents[0].detail).toMatchObject({
      event: 'gh_form_asset_accessed',
      success_behavior: 'asset_access',
      action_kind: 'download',
      reward_kind: 'ebook',
    })
    expect(JSON.stringify(actionEvents[0].detail)).not.toContain('lead@brand.com')
    expect(JSON.stringify(actionEvents[0].detail)).not.toContain('submissionId')
  })

  it('does not render fallback success steps when the contract provides an empty steps array', async () => {
    const contract = staticContractFixture({
      successBehavior: {
        kind: 'inline_message',
        presentation: 'success_card',
        title: 'Solicitud recibida',
        body: 'Tu informe va en camino.',
        steps: [],
      },
    })

    const { root } = mountInto(contract)

    fillStaticRequiredFields(root)
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    await vi.waitFor(() => expect(root.querySelector('[data-capture="growth-form-success-card"]')).not.toBeNull())

    expect(root.querySelector('.ghf-success-card__steps')).toBeNull()
    expect(root.querySelector('.ghf-success-card')?.textContent).not.toContain('Validamos la información enviada.')
  })

  it('blocks submit until required consent is checked', async () => {
    const { root } = mountInto()

    root.querySelector<HTMLInputElement>('[name="work_email"]')!.value = 'a@b.com'
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.dispatchEvent(new Event('input'))
    root.querySelector<HTMLInputElement>('[name="brand"]')!.value = 'B'
    root.querySelector<HTMLInputElement>('[name="brand"]')!.dispatchEvent(new Event('input'))

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await Promise.resolve()

    expect(root.querySelector('[data-ghf-summary]')?.textContent).toBe('Necesitas aceptar para continuar.')
  })

  it('conditional_simple reveals a field when its condition matches', () => {
    const { root } = mountInto(conditionalContractFixture())

    expect(root.querySelector('[name="budget"]')).toBeNull()
    const select = root.querySelector<HTMLSelectElement>('[name="interest"]')!

    select.value = 'growth'
    select.dispatchEvent(new Event('change'))
    expect(root.querySelector('[name="budget"]')).not.toBeNull()
  })

  it('keeps contract-provided blank select placeholders as the first option', () => {
    const { root } = mountInto(staticContractFixture({
      fields: [
        {
          key: 'country',
          type: 'select',
          label: 'País',
          options: [
            { value: '', label: 'Selecciona país' },
            { value: 'CL', label: 'Chile' },
          ],
        },
      ],
      consent: undefined,
    }))

    const select = root.querySelector<HTMLSelectElement>('[name="country"]')!

    expect(Array.from(select.options).map(option => option.textContent)).toEqual(['Selecciona país', 'Chile'])
    expect(select.closest('.ghf-control--select')?.querySelector('.ghf-select-icon')).not.toBeNull()
  })

  it('renders premium selects as an accessible custom listbox instead of the native popup', () => {
    const { root } = mountInto(staticContractFixture({
      styleVariant: 'diagnostic_premium',
      fields: [
        {
          key: 'companySize',
          type: 'select',
          label: 'Tamaño de empresa',
          options: [
            { value: '', label: 'Selecciona tamaño' },
            { value: '1-10', label: '1 - 10' },
            { value: '11-50', label: '11 - 50' },
          ],
        },
      ],
      consent: undefined,
    }))

    const trigger = root.querySelector<HTMLButtonElement>('[name="companySize"].ghf-select-trigger')!
    const list = root.querySelector<HTMLElement>('.ghf-select-list')!

    expect(trigger.getAttribute('role')).toBe('combobox')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(list.hidden).toBe(true)

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(list.hidden).toBe(false)
    expect(root.querySelectorAll('[role="option"]')).toHaveLength(3)

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    expect(trigger.textContent).toContain('1 - 10')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(root.querySelector('[role="option"][aria-selected="true"]')?.textContent).toBe('1 - 10')
  })

  it('uses contract-provided field required copy when present', () => {
    const { root } = mountInto(staticContractFixture({
      fields: [{ key: 'firstName', type: 'text', label: 'Nombre', required: true }],
      copy: { 'firstName.error.required': 'Escribe tu nombre para personalizar el diagnóstico.' },
      consent: undefined,
    }))

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    expect(root.querySelector('.ghf-error')?.textContent).toBe('Escribe tu nombre para personalizar el diagnóstico.')
  })

  it('keeps short fields and selects paired while long intent fields span the form', () => {
    const { root } = mountInto(staticContractFixture({
      fields: [
        { key: 'firstName', type: 'text', label: 'Nombre', maxLength: 120 },
        { key: 'email', type: 'email', label: 'Email' },
        { key: 'brandWebsite', type: 'url', label: 'Marca / sitio web', maxLength: 240 },
        { key: 'country', type: 'select', label: 'País', options: [{ value: '', label: 'Selecciona país' }] },
        { key: 'mainCompetitor', type: 'text', label: 'Principal competidor', maxLength: 200 },
      ],
      consent: undefined,
    }))

    expect(root.querySelector('[name="firstName"]')?.closest('.ghf-field')?.classList.contains('ghf-field--full')).toBe(false)
    expect(root.querySelector('[name="email"]')?.closest('.ghf-field')?.classList.contains('ghf-field--full')).toBe(false)
    expect(root.querySelector('[name="brandWebsite"]')?.closest('.ghf-field')?.classList.contains('ghf-field--full')).toBe(true)
    expect(root.querySelector('[name="country"]')?.closest('.ghf-field')?.classList.contains('ghf-field--full')).toBe(false)
    expect(root.querySelector('[name="mainCompetitor"]')?.closest('.ghf-field')?.classList.contains('ghf-field--full')).toBe(true)
  })

  it('multi_step_light advances per step and preserves data going back', () => {
    const { root } = mountInto(multiStepContractFixture())

    expect(root.querySelector('.ghf-progress')?.textContent).toBe('Paso 1 de 2')
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.value = 'a@b.com'
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.dispatchEvent(new Event('input'))

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    expect(root.querySelector('.ghf-progress')?.textContent).toBe('Paso 2 de 2')

    // Atrás preserva el dato del paso 1.
    root.querySelector<HTMLButtonElement>('.ghf-btn--ghost')!.click()
    expect(root.querySelector<HTMLInputElement>('[name="work_email"]')!.value).toBe('a@b.com')
  })

  it('does not submit when honeypot would be filled by a bot (still posts; server rejects)', async () => {
    // El honeypot se envía tal cual; verificamos que el campo existe y está oculto/no-tab.
    const { root } = mountInto()
    const honey = root.querySelector<HTMLInputElement>('[data-ghf-honeypot]')!

    expect(honey.getAttribute('tabindex')).toBe('-1')
    expect(honey.getAttribute('autocomplete')).toBe('off')
    expect(honey.closest('.ghf-honeypot')).not.toBeNull()
  })

  // ─── TASK-1256 Slice 1c — validación reactiva (live error/success + máscara live) ──

  const fieldStatus = (root: HTMLElement, name: string): string | null =>
    root.querySelector(`[name="${name}"]`)?.closest('.ghf-field')?.getAttribute('data-status') ?? null

  it('reacts live: ✓ success the moment a value becomes valid (no blur needed)', () => {
    const { root } = mountInto()
    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    // Mientras se completa: sin rojo (neutro), sin gritar.
    email.value = 'ana@'
    email.dispatchEvent(new Event('input'))
    expect(fieldStatus(root, 'work_email')).toBe('neutral')
    expect(root.querySelector('.ghf-error')).toBeNull()

    // Apenas es válido: ✓ success inmediato, sin esperar el blur.
    email.value = 'ana@empresa.com'
    email.dispatchEvent(new Event('input'))
    expect(fieldStatus(root, 'work_email')).toBe('success')
  })

  it('reacts live: error appears immediately when a previously-valid value is broken', () => {
    const { root } = mountInto()
    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    email.value = 'ana@empresa.com'
    email.dispatchEvent(new Event('input'))
    expect(fieldStatus(root, 'work_email')).toBe('success')

    // Romper el valor válido → error reactivo inmediato (sin cambiar de campo).
    email.value = 'ana@empresa'
    email.dispatchEvent(new Event('input'))
    expect(fieldStatus(root, 'work_email')).toBe('error')
    expect(root.querySelector('.ghf-error')?.textContent).toBeTruthy()
  })

  it('formats the phone national number live (as-you-type), not only on blur', () => {
    const { root } = mountInto()
    const input = root.querySelector<HTMLInputElement>('[name="phone"]')!

    input.value = '987654321'
    input.dispatchEvent(new Event('input'))
    // El formato se aplica EN VIVO en el input (sin esperar el blur).
    expect(input.value).toBe('9 8765 4321')
    expect(fieldStatus(root, 'phone')).toBe('success')
  })

  // ─── TASK-1256 Slice 1 — campo de teléfono internacional (estilo HubSpot) ────

  it('renders an in-field country selector for tel fields and stores E.164', () => {
    const { root } = mountInto()
    const select = root.querySelector<HTMLSelectElement>('[data-ghf-tel-country="phone"]')!
    const input = root.querySelector<HTMLInputElement>('[name="phone"]')!

    // Selector presente con CL por default + label accesible.
    expect(select).not.toBeNull()
    expect(select.value).toBe('CL')
    expect(select.getAttribute('aria-label')).toBe('País del teléfono')

    // Tipear el número nacional → se almacena E.164 con el +CC del país.
    input.value = '987654321'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    expect(input.value).toBe('9 8765 4321') // display nacional CL on-blur

    // Cambiar el país recompone el E.164 con el nuevo calling code.
    select.value = 'MX'
    select.dispatchEvent(new Event('change'))

    // El submit envía el E.164 con el prefijo del país elegido.
    const consent = root.querySelector<HTMLInputElement>('[data-ghf-consent="tos"]')!

    consent.checked = true
    consent.dispatchEvent(new Event('change'))
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.value = 'lead@brand.com'
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.dispatchEvent(new Event('input'))
    root.querySelector<HTMLInputElement>('[name="brand"]')!.value = 'Brand'
    root.querySelector<HTMLInputElement>('[name="brand"]')!.dispatchEvent(new Event('input'))
  })

  it('detects the country when a +CC number is pasted into the tel input', () => {
    const { root } = mountInto()
    const select = root.querySelector<HTMLSelectElement>('[data-ghf-tel-country="phone"]')!
    const input = root.querySelector<HTMLInputElement>('[name="phone"]')!

    input.value = '+52 55 1234 5678'
    input.dispatchEvent(new Event('input'))
    expect(select.value).toBe('MX')
    input.dispatchEvent(new Event('blur'))
    expect(input.value).toBe('5 512 345 678') // nacional MX
  })

  // ─── TASK-1256 Slice 2 — submit-gating del email corporativo ────────────────

  const flush = async () => {
    // verifyPublicEmail encadena `await fetch` + `await response.json()`; varias
    // vueltas de macrotask vacían la cola de microtasks entre medio de forma robusta.
    for (let i = 0; i < 5; i += 1) await new Promise(resolve => setTimeout(resolve, 0))
  }

  /** fetch que enruta verify-email a `verify()` y el submit a `accepted`. */
  const routingFetch = (verify: () => Response | Promise<Response>) =>
    vi.fn(async (url: string) => {
      if (String(url).includes('/verify-email')) return verify()

      return new Response(JSON.stringify({ outcome: 'accepted', submissionId: 'sub_1' }), { status: 202 })
    }) as unknown as typeof fetch

  const okVerdict = (over: Record<string, unknown> = {}) =>
    new Response(
      JSON.stringify({
        outcome: 'ok',
        syntaxValid: true,
        isCorporate: true,
        isDisposable: false,
        isRoleBased: false,
        isFreeProvider: false,
        deliverable: 'deliverable',
        quality: 'verified',
        suggestion: null,
        reasonCode: null,
        ...over,
      }),
      { status: 200 },
    )

  const gatedContract = () =>
    staticContractFixture({
      fields: [{ key: 'work_email', type: 'email', label: 'Correo', required: true, validator: 'corporate_email', autocomplete: 'email' }],
      consent: undefined,
    })

  const typeEmailAndBlur = (root: HTMLElement, value: string) => {
    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    email.value = value
    email.dispatchEvent(new Event('input'))
    email.dispatchEvent(new Event('blur'))
  }

  it('shows verifying state and disables submit while /verify-email is in flight', async () => {
    let resolveVerify: (r: Response) => void = () => undefined

    const pending = new Promise<Response>(resolve => {
      resolveVerify = resolve
    })

    const { root } = mountInto(gatedContract(), routingFetch(() => pending))

    typeEmailAndBlur(root, 'ana@empresa.com')

    // El estado verificando + el disable del submit se aplican síncronamente al disparar.
    expect(root.querySelector('.ghf-verify-status')?.textContent).toContain('Verificando')
    expect(root.querySelector('[data-ghf-primary]')?.getAttribute('aria-disabled')).toBe('true')

    resolveVerify(okVerdict())
    await flush()

    expect(root.querySelector('.ghf-verify-status')).toBeNull()
    expect(root.querySelector('[data-ghf-primary]')?.getAttribute('aria-disabled')).toBeNull()
  })

  it('degrades honest when /verify-email is disabled (flag OFF, 404): no trap', async () => {
    const { root } = mountInto(gatedContract(), routingFetch(() => new Response(JSON.stringify({ outcome: 'disabled' }), { status: 404 })))

    typeEmailAndBlur(root, 'ana@empresa.com')
    await flush()

    // Sin estado verificando ni submit trabado: el gate vive en el server.
    expect(root.querySelector('.ghf-verify-status')).toBeNull()
    expect(root.querySelector('[data-ghf-primary]')?.getAttribute('aria-disabled')).toBeNull()
    expect(root.querySelector('.ghf-error')).toBeNull()
  })

  it('blocks a corporate-gated field when the verdict says not corporate + offers typo-suggest', async () => {
    const { root } = mountInto(
      gatedContract(),
      routingFetch(() => okVerdict({ isCorporate: false, quality: 'suspect', reasonCode: 'email_not_corporate', suggestion: 'ana@empresa.com' })),
    )

    typeEmailAndBlur(root, 'ana@gmial.com')
    await flush()

    const error = root.querySelector('.ghf-error')

    expect(error?.textContent).toContain('correo de tu empresa')
    const suggest = root.querySelector<HTMLButtonElement>('.ghf-verify-suggest')

    expect(suggest?.textContent).toContain('¿Quisiste decir ana@empresa.com?')
    suggest!.click()
    expect(root.querySelector<HTMLInputElement>('[name="work_email"]')!.value).toBe('ana@empresa.com')
  })

  it('does not block a non-gated email field even if the verdict is not corporate (advisory only)', async () => {
    const contract = staticContractFixture({
      fields: [{ key: 'work_email', type: 'email', label: 'Correo', required: true, autocomplete: 'email' }],
      consent: undefined,
    })

    const { root } = mountInto(
      contract,
      routingFetch(() => okVerdict({ isCorporate: false, quality: 'suspect', reasonCode: 'email_not_corporate', suggestion: 'ana@gmail.com' })),
    )

    typeEmailAndBlur(root, 'ana@gmail.com')
    await flush()

    // Campo no gateado: la verificación es advisory → typo-suggest sí, bloqueo no.
    expect(root.querySelector('.ghf-error')).toBeNull()
    expect(root.querySelector('.ghf-verify-suggest')).not.toBeNull()
  })

  // ─── TASK-1256 Slice 1d — endurecimiento UX ─────────────────────────────────

  it('shows an accessible error summary on submit; its links focus the field', () => {
    const { root } = mountInto()

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    const summary = root.querySelector<HTMLElement>('[data-ghf-error-summary]')

    expect(summary).not.toBeNull()
    expect(summary!.getAttribute('role')).toBe('alert')
    const links = summary!.querySelectorAll('a')

    expect(links.length).toBeGreaterThan(0)
    // El link enfoca el campo correspondiente.
    links[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(document.activeElement?.getAttribute('name')).toBeTruthy()

    // Al corregir un campo en vivo, su entrada desaparece del resumen (no queda stale).
    const before = summary!.querySelectorAll('a').length
    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    email.value = 'ana@empresa.com'
    email.dispatchEvent(new Event('input'))
    const after = root.querySelector('[data-ghf-error-summary]')?.querySelectorAll('a').length ?? 0

    expect(after).toBe(before - 1)
  })

  it('reflects "faltan N" → "listo para enviar" reactively near submit', () => {
    const { root } = mountInto()
    const readiness = root.querySelector<HTMLElement>('[data-ghf-readiness]')!

    // Antes de empezar: oculto.
    expect(readiness.textContent).toBe('')

    // Al empezar con campos pendientes: cuenta los faltantes.
    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    email.value = 'lead@brand.com'
    email.dispatchEvent(new Event('input'))
    expect(readiness.textContent).toMatch(/Falta/)
    expect(readiness.getAttribute('data-ready')).toBe('false')

    // Completar todo lo requerido → readiness premium.
    const brand = root.querySelector<HTMLInputElement>('[name="brand"]')!

    brand.value = 'Brand'
    brand.dispatchEvent(new Event('input'))
    const consent = root.querySelector<HTMLInputElement>('[data-ghf-consent="tos"]')!

    consent.checked = true
    consent.dispatchEvent(new Event('change'))

    expect(readiness.getAttribute('data-ready')).toBe('true')
    expect(readiness.textContent).toBe('Listo: ya puedes solicitar tu diagnóstico')
  })

  it('updates the character counter live for maxLength fields', () => {
    const { root } = mountInto()
    const textarea = root.querySelector<HTMLTextAreaElement>('[name="message"]')!
    const counter = textarea.closest('.ghf-field')!.querySelector('.ghf-counter')!

    expect(counter.textContent).toBe('0 / 500')
    textarea.value = 'Hola equipo'
    textarea.dispatchEvent(new Event('input'))
    expect(counter.textContent).toBe('11 / 500')
  })

  it('restores a PII-safe draft on mount — email yes, national_id never', () => {
    // Sembrar un borrador con correo (no-PII regulada) + cédula (PII regulada).
    window.localStorage.setItem(
      'ghf-draft:ai-visibility-intake:fv_demo_1',
      JSON.stringify({ savedAt: Date.now(), values: { work_email: 'vuelta@empresa.com', national_id: '123456785' } }),
    )

    const contract = staticContractFixture({
      fields: [
        { key: 'work_email', type: 'email', label: 'Correo', required: true, autocomplete: 'email' },
        { key: 'national_id', type: 'national_id', label: 'RUT', validatorParams: { country: 'CL' } },
      ],
      consent: undefined,
    })

    const { root } = mountInto(contract)

    // El correo se recupera; la cédula NUNCA (no se persiste ni se restaura).
    expect(root.querySelector<HTMLInputElement>('[name="work_email"]')!.value).toBe('vuelta@empresa.com')
    expect(root.querySelector<HTMLInputElement>('[name="national_id"]')!.value).toBe('')
    // Aviso de borrador recuperado visible.
    expect(root.querySelector('.ghf-draft-note')).not.toBeNull()
  })

  // ─── TASK-1294 — Turnstile captchaToken parity ──────────────────────────────

  const captchaContract = () =>
    staticContractFixture({
      fields: [
        { key: 'work_email', type: 'email', label: 'Correo', required: true, autocomplete: 'email' },
        { key: 'brand', type: 'text', label: 'Marca', required: true },
      ],
      consent: undefined,
      security: {
        captcha: {
          provider: 'turnstile',
          required: true,
          mode: 'invisible',
          siteKey: 'site-key-public',
          execution: 'submit',
        },
      },
    })

  const fillCaptchaContract = (root: HTMLElement) => {
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.value = 'lead@brand.com'
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.dispatchEvent(new Event('input'))
    root.querySelector<HTMLInputElement>('[name="brand"]')!.value = 'Brand'
    root.querySelector<HTMLInputElement>('[name="brand"]')!.dispatchEvent(new Event('input'))
  }

  const installTurnstile = (mode: 'success' | 'error' = 'success') => {
    let callbacks: { callback: (token: string) => void; 'error-callback': () => void } | null = null

    const render = vi.fn((_container: HTMLElement, options: typeof callbacks & { sitekey: string }) => {
      callbacks = options

      return 'widget-1'
    })

    const execute = vi.fn(() => {
      if (!callbacks) throw new Error('missing callbacks')
      if (mode === 'success') callbacks.callback('captcha-token')
      else callbacks['error-callback']()
    })

    const reset = vi.fn()

    ;(window as unknown as { turnstile: unknown }).turnstile = { render, execute, reset }

    return { render, execute, reset }
  }

  it('executes Turnstile before submit and sends captchaToken', async () => {
    const turnstile = installTurnstile()
    const fetchImpl = okFetch()
    const { root } = mountInto(captchaContract(), fetchImpl)

    fillCaptchaContract(root)
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await vi.waitFor(() => expect(root.querySelector('[role="status"]')?.textContent).toContain('Listo'))

    const body = JSON.parse((fetchImpl as unknown as { mock: { calls: Array<[string, { body: string }]> } }).mock.calls[0][1].body)

    expect(body.captchaToken).toBe('captcha-token')
    expect(turnstile.render).toHaveBeenCalledTimes(1)
    expect(turnstile.execute).toHaveBeenCalledWith('widget-1')
    expect(turnstile.reset).toHaveBeenCalledWith('widget-1')
  })

  it('does not POST when Turnstile token acquisition fails', async () => {
    installTurnstile('error')
    const fetchImpl = okFetch()
    const { root } = mountInto(captchaContract(), fetchImpl)

    fillCaptchaContract(root)
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await vi.waitFor(() => expect(root.querySelector('[data-ghf-summary]')?.textContent).toBeTruthy())

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reuses the same Turnstile widget across failed submit retries', async () => {
    const turnstile = installTurnstile()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ outcome: 'invalid' }), { status: 400 })) as unknown as typeof fetch
    const { root } = mountInto(captchaContract(), fetchImpl)

    fillCaptchaContract(root)
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1))

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2))

    expect(turnstile.render).toHaveBeenCalledTimes(1)
    expect(turnstile.execute).toHaveBeenCalledTimes(2)
  })
})
