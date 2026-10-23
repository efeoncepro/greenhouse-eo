// @vitest-environment jsdom

/**
 * TASK-2045 — Render del kit de formularios diseñados (contrato TASK-2044): ancho declarado, esquema
 * oscuro forzable, tokens de campo/etiqueta/placeholder/botón y hooks estables. Fixture de referencia:
 * el popup «Quiero ser partner» (`partnerApplicationContractFixture`).
 */
import { beforeEach, describe, expect, it } from 'vitest'

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
