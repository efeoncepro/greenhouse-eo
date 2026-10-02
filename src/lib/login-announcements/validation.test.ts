import { describe, expect, it } from 'vitest'

import { LoginAnnouncementError } from './types'
import { isSafeAnnouncementUrl, parseLoginAnnouncementInput } from './validation'

const textAnnouncement = {
  kind: 'text',
  serviceLine: 'engine',
  tabLabel: 'Engine',
  kicker: 'Nuevo · AI Visibility Report',
  title: 'Que la IA te encuentre',
  body: 'Mira cómo te describen los buscadores con IA.',
  cta: { label: 'Pedir mi reporte', url: '/servicios/aeo' },
  image: { path: '/images/login/announcement-engine.webp', alt: 'Dos personas revisan resultados' },
  lens: { x: 46, y: 30, radiusRatio: 0.24 },
  priority: 20
}

const issuesOf = (raw: unknown) => {
  try {
    parseLoginAnnouncementInput(raw)

    return []
  } catch (error) {
    expect(error).toBeInstanceOf(LoginAnnouncementError)

    return [...(error as LoginAnnouncementError).issues]
  }
}

describe('TASK-1963 — validación de novedades del login', () => {
  it('acepta una novedad de texto completa y la normaliza', () => {
    const parsed = parseLoginAnnouncementInput({ ...textAnnouncement, title: '  Que la IA te encuentre  ' })

    expect(parsed.title).toBe('Que la IA te encuentre')
    expect(parsed.lens).toEqual({ x: 46, y: 30, radiusRatio: 0.24 })
    expect(parsed.cta).toEqual({ label: 'Pedir mi reporte', url: '/servicios/aeo' })
  })

  it('exige título en una novedad de texto', () => {
    expect(issuesOf({ ...textAnnouncement, title: '' })).toContain('title_required')
  })

  it('exige imagen y alt en un banner', () => {
    expect(issuesOf({ kind: 'banner', serviceLine: 'brand', tabLabel: 'Brand' })).toContain('banner_image_required')
    expect(
      issuesOf({ kind: 'banner', serviceLine: 'brand', tabLabel: 'Brand', image: { path: '/images/login/b.webp' } })
    ).toContain('image_alt_required')
  })

  it('rechaza enlaces inseguros', () => {
    expect(issuesOf({ ...textAnnouncement, cta: { label: 'X', url: 'javascript:alert(1)' } })).toContain('cta_url_unsafe')
    expect(issuesOf({ ...textAnnouncement, cta: { label: 'X', url: '//evil.example' } })).toContain('cta_url_unsafe')
    expect(isSafeAnnouncementUrl('https://efeoncepro.com')).toBe(true)
    expect(isSafeAnnouncementUrl('/home')).toBe(true)
    expect(isSafeAnnouncementUrl('http://efeoncepro.com')).toBe(false)
  })

  it('exige CTA completo, lente válida y ventana coherente', () => {
    expect(issuesOf({ ...textAnnouncement, cta: { label: 'Sólo etiqueta' } })).toContain('cta_incomplete')
    expect(issuesOf({ ...textAnnouncement, lens: { x: 120, y: 30, radiusRatio: 0.2 } })).toContain('lens_invalid')
    expect(
      issuesOf({ ...textAnnouncement, startsAt: '2026-10-10T00:00:00Z', endsAt: '2026-10-01T00:00:00Z' })
    ).toContain('window_invalid')
  })

  it('reporta todos los problemas a la vez', () => {
    const issues = issuesOf({ kind: 'otro', serviceLine: 'x', tabLabel: '' })

    expect(issues).toEqual(expect.arrayContaining(['kind_invalid', 'service_line_invalid', 'tab_label_required']))
  })
})
