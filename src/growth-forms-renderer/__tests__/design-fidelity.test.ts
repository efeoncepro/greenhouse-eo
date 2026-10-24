// @vitest-environment jsdom

/**
 * TASK-2045 — Render del kit de formularios diseñados (contrato TASK-2044): ancho declarado, esquema
 * oscuro forzable, tokens de campo/etiqueta/placeholder/botón y hooks estables. Fixture de referencia:
 * el popup «Quiero ser partner» (`partnerApplicationContractFixture`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RendererApiConfig } from '../api-client'
import { partnerApplicationContractFixture, staticContractFixture } from '../fixtures'
import { FormRenderer } from '../renderer'
import { RENDERER_CSS } from '../styles'

const api: RendererApiConfig = { baseUrl: 'https://gh.test', slug: 'efeonce-partner-application', surfaceId: 'wordpress-public' }

const mount = (contract = partnerApplicationContractFixture(), colorScheme?: 'light' | 'dark') => {
  const root = document.createElement('div')

  document.body.appendChild(root)
  new FormRenderer({ root, contract, api, doc: document, colorScheme }).mount()

  return root
}

const fieldWrap = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-ghf-field-key="${key}"]`)!

describe('TASK-2045 · ancho declarado', () => {
  beforeEach(() => document.body.replaceChildren())

  it('half deja el campo en media columna aunque la heurística lo pondría completo (url)', () => {
    const root = mount()

    for (const key of ['fullName', 'email', 'company', 'website']) {
      expect(fieldWrap(root, key).classList.contains('ghf-field--full')).toBe(false)
    }

    expect(fieldWrap(root, 'offer').classList.contains('ghf-field--full')).toBe(true)
  })

  it('sin width el campo conserva la heurística de siempre', () => {
    const root = mount(staticContractFixture())

    // Heurística vigente: textarea y text sin maxLength van a fila completa; tel y email no.
    expect(fieldWrap(root, 'message').classList.contains('ghf-field--full')).toBe(true)
    expect(fieldWrap(root, 'brand').classList.contains('ghf-field--full')).toBe(true)
    expect(fieldWrap(root, 'phone').classList.contains('ghf-field--full')).toBe(false)
  })
})

describe('TASK-2045 · esquema oscuro y tokens', () => {
  beforeEach(() => document.body.replaceChildren())

  it('colorScheme dark marca el root y el CSS fuerza los tokens oscuros', () => {
    expect(mount(undefined, 'dark').getAttribute('data-color-scheme')).toBe('dark')
    expect(RENDERER_CSS).toContain('greenhouse-form[data-color-scheme="dark"], .ghf-scope[data-color-scheme="dark"]')
    expect(RENDERER_CSS).toContain('--ghf-bg: #11151c')
  })

  it('los tokens nuevos tienen fallback igual al render previo', () => {
    for (const declaration of [
      'min-height: var(--ghf-field-min-height, 44px)',
      'padding: var(--ghf-field-padding, 10px 12px)',
      'border-radius: var(--ghf-field-radius, var(--ghf-radius))',
      'font-size: var(--ghf-label-size, 0.875rem)',
      'font-weight: var(--ghf-label-weight, 600)',
      'color: var(--ghf-label-color, var(--ghf-fg))',
      'border-radius: var(--ghf-btn-radius, var(--ghf-radius))',
      'min-height: var(--ghf-btn-min-height, 44px)',
      'column-gap: var(--ghf-column-gap, var(--ghf-gap))',
      'border-color: var(--ghf-field-focus-border, var(--ghf-border)) !important'
    ]) {
      expect(RENDERER_CSS).toContain(declaration)
    }
  })

  it('expone hooks estables para la piel del anfitrión', () => {
    const root = mount()

    expect(root.querySelector('[data-ghf-part="label"]')?.textContent).toContain('Nombre y apellido')
    expect(root.querySelector('[data-ghf-part="submit"]')?.textContent).toContain('Enviar propuesta')
  })
})

describe('TASK-2045 · consentimiento compacto con enlace en la frase', () => {
  beforeEach(() => document.body.replaceChildren())

  it('reemplaza {privacyLink} por un enlace construido con DOM y omite el párrafo aparte', () => {
    const root = mount()
    const consent = root.querySelector<HTMLElement>('[data-ghf-part="consent"]')!
    const label = consent.querySelector<HTMLLabelElement>('label.ghf-check--compact')!
    const link = label.querySelector<HTMLAnchorElement>('a[data-ghf-part="consent-link"]')!

    expect(consent.classList.contains('ghf-consent--compact')).toBe(true)
    expect(label.textContent).toBe('Acepto que Efeonce use estos datos para responder mi propuesta, según su política de privacidad.')
    expect(link.getAttribute('href')).toBe('https://efeoncepro.com/politica-de-privacidad/')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(label.textContent).not.toContain('{privacyLink}')
    expect(consent.querySelectorAll('a')).toHaveLength(1)
  })

  it('el texto del autor nunca se interpreta como HTML', () => {
    const contract = partnerApplicationContractFixture()

    contract.consent!.checkboxes![0].label = '<img src=x onerror=alert(1)> según su {privacyLink}.'
    const label = mount(contract).querySelector<HTMLLabelElement>('label.ghf-check--compact')!

    expect(label.querySelector('img')).toBeNull()
    expect(label.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('sin marcador ni compact, el consentimiento se dibuja como siempre (tarjeta + enlace aparte)', () => {
    const consent = mount(staticContractFixture()).querySelector<HTMLElement>('[data-ghf-part="consent"]')!

    expect(consent.querySelector('label.ghf-check--compact')).toBeNull()
    expect(consent.querySelector('p.ghf-help a')?.getAttribute('href')).toBe('https://efeonce.com/privacidad')
  })
})

describe('TASK-2045 · éxito con órbita y «Cerrar»', () => {
  beforeEach(() => document.body.replaceChildren())

  const succeed = async (contract = partnerApplicationContractFixture()) => {
    const root = document.createElement('div')

    document.body.appendChild(root)

    const fetchImpl = (async () => new Response(JSON.stringify({ outcome: 'accepted', submissionId: 'sub_1' }), { status: 202 })) as unknown as typeof fetch

    new FormRenderer({ root, contract, api, doc: document, fetchImpl }).mount()

    const fill = (name: string, value: string) => {
      const input = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!

      input.value = value
      input.dispatchEvent(new Event('input'))
    }

    fill('fullName', 'Ana Pérez')
    fill('email', 'ana@plataforma.com')
    fill('company', 'Plataforma')
    fill('offer', 'Una herramienta de datos para equipos de marketing.')
    const consent = root.querySelector<HTMLInputElement>('[data-ghf-consent="privacy"]')!

    consent.checked = true
    consent.dispatchEvent(new Event('change'))
    root.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await new Promise(resolve => setTimeout(resolve, 20))

    return root
  }

  it('dibuja el glifo de la órbita y un botón «Cerrar» que emite ghf:dismiss', async () => {
    const root = await succeed()
    const card = root.querySelector<HTMLElement>('[data-ghf-part="success-card"]')!
    const dismissed = vi.fn()

    root.addEventListener('ghf:dismiss', dismissed)
    expect(card.dataset.icon).toBe('orbit')
    expect(card.querySelector('.ghf-orbit-mark__arc')).not.toBeNull()

    const close = card.querySelector<HTMLButtonElement>('button[data-ghf-part="success-action"]')!

    expect(close.textContent).toBe('Cerrar')
    expect(close.hasAttribute('href')).toBe(false)
    close.click()
    expect(dismissed).toHaveBeenCalledTimes(1)
  })

  it('icon none no dibuja marca', async () => {
    const contract = partnerApplicationContractFixture()

    contract.successBehavior.icon = 'none'
    const card = (await succeed(contract)).querySelector<HTMLElement>('[data-ghf-part="success-card"]')!

    expect(card.querySelector('[data-ghf-part="success-mark"]')).toBeNull()
  })

  it('publica el envío en curso en el root y lo retira al terminar', async () => {
    const root = await succeed()

    expect(root.hasAttribute('data-ghf-busy')).toBe(false)
  })
})
