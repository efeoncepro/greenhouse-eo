import { describe, expect, it, vi } from 'vitest'

import { mapViewCodeToPublicSlug } from './view-code-public-slug'

vi.mock('server-only', () => ({}))

describe('mapViewCodeToPublicSlug — canonical pure function', () => {
  it('strip prefix cliente. + replace underscore con dash', () => {
    expect(mapViewCodeToPublicSlug('cliente.brand_intelligence')).toBe('brand-intelligence')
    expect(mapViewCodeToPublicSlug('cliente.csc_pipeline')).toBe('csc-pipeline')
    expect(mapViewCodeToPublicSlug('cliente.cvr_quarterly')).toBe('cvr-quarterly')
    expect(mapViewCodeToPublicSlug('cliente.roi_reports')).toBe('roi-reports')
    expect(mapViewCodeToPublicSlug('cliente.staff_aug')).toBe('staff-aug')
    expect(mapViewCodeToPublicSlug('cliente.web_delivery')).toBe('web-delivery')
    expect(mapViewCodeToPublicSlug('cliente.crm_command')).toBe('crm-command')
  })

  it('single-word viewCode sin underscore queda igual post-prefix-strip', () => {
    expect(mapViewCodeToPublicSlug('cliente.pulse')).toBe('pulse')
    expect(mapViewCodeToPublicSlug('cliente.equipo')).toBe('equipo')
    expect(mapViewCodeToPublicSlug('cliente.proyectos')).toBe('proyectos')
    expect(mapViewCodeToPublicSlug('cliente.home')).toBe('home')
    expect(mapViewCodeToPublicSlug('cliente.exports')).toBe('exports')
  })

  it('viewCode sin prefix cliente. queda intacto excepto lowercase + underscore→dash + strip dots', () => {
    // Dots NO se preservan en slugs URL-friendly — solo a-z 0-9 hyphen
    expect(mapViewCodeToPublicSlug('admin.users')).toBe('adminusers')
    expect(mapViewCodeToPublicSlug('hr_section')).toBe('hr-section')
  })

  it('lowercase normalization', () => {
    expect(mapViewCodeToPublicSlug('cliente.Brand_Intelligence')).toBe('brand-intelligence')
    // Uppercase prefix NO matchea 'cliente.' (case-sensitive), entonces NO se hace strip;
    // luego toLowerCase + strip dots → 'clientepulse'
    expect(mapViewCodeToPublicSlug('CLIENTE.PULSE')).toBe('clientepulse')
  })

  it('strip caracteres especiales URL-unsafe', () => {
    expect(mapViewCodeToPublicSlug('cliente.weird@chars#')).toBe('weirdchars')
    expect(mapViewCodeToPublicSlug('cliente.with spaces')).toBe('withspaces')
  })

  it('empty input → empty output (defensive)', () => {
    expect(mapViewCodeToPublicSlug('')).toBe('')
  })

  it('idempotente — aplicar el helper al output del helper no cambia el output', () => {
    const slug1 = mapViewCodeToPublicSlug('cliente.brand_intelligence')
    const slug2 = mapViewCodeToPublicSlug(slug1)

    expect(slug2).toBe(slug1) // brand-intelligence → brand-intelligence
  })

  it('output URL-safe — solo lowercase letters, numbers, hyphens (+ dots si vienen del input)', () => {
    const inputs = [
      'cliente.brand_intelligence',
      'cliente.csc_pipeline',
      'cliente.cvr_quarterly',
      'cliente.roi_reports'
    ]

    for (const input of inputs) {
      const slug = mapViewCodeToPublicSlug(input)

      expect(slug).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
