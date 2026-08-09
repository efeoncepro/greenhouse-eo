import { describe, expect, it } from 'vitest'

import { GH_GROWTH_SEO_AUDIT_ISSUES } from '@/lib/copy/growth'
import type { SeoSiteAuditFindingSeverity, SeoSiteAuditFindingView } from '@/lib/growth/seo/contracts'
import { ONPAGE_CHECK_SEVERITY } from '@/lib/growth/seo/site-audit/findings-map'

import { STALE_CRAWL_DAYS, daysSinceCrawl, groupAuditIssues } from '../group-audit-issues'

const finding = (
  issueType: string,
  severity: SeoSiteAuditFindingSeverity,
  url: string
): SeoSiteAuditFindingView => ({ issueType, severity, url, detail: {} })

const bucket = (items: SeoSiteAuditFindingView[]): Record<SeoSiteAuditFindingSeverity, SeoSiteAuditFindingView[]> => ({
  critical: items.filter(item => item.severity === 'critical'),
  warning: items.filter(item => item.severity === 'warning'),
  notice: items.filter(item => item.severity === 'notice')
})

describe('groupAuditIssues', () => {
  it('nunca entierra un crítico bajo un menor de alto volumen', () => {
    // El caso que la lista existe para evitar: 400 imágenes sin alt vs UN 5xx.
    const groups = groupAuditIssues(
      bucket([
        ...Array.from({ length: 400 }, (_, index) => finding('no_image_alt', 'notice', `https://x.cl/p${index}`)),
        finding('is_5xx_code', 'critical', 'https://x.cl/checkout')
      ])
    )

    expect(groups[0].issueType).toBe('is_5xx_code')
    expect(groups[1].issueType).toBe('no_image_alt')
  })

  it('no deja que la higiene sin valor de búsqueda encabece su tier por alcance', () => {
    // El caso que destapó la auditoría seo-aeo: un favicon ausente (91 páginas, rápido de
    // arreglar, sin efecto de búsqueda medible) le ganaba a imágenes sin `alt` (50 páginas,
    // igual de rápido, pero con efecto real en búsqueda de imágenes y accesibilidad).
    const groups = groupAuditIssues(
      bucket([
        ...Array.from({ length: 91 }, (_, i) => finding('no_favicon', 'notice', `https://x.cl/a${i}`)),
        ...Array.from({ length: 50 }, (_, i) => finding('no_image_alt', 'notice', `https://x.cl/b${i}`))
      ])
    )

    expect(groups.map(group => group.issueType)).toEqual(['no_image_alt', 'no_favicon'])
  })

  it('lista la higiene igual, sólo la hunde', () => {
    // `low` pesa 0.5, no 0: esconder un issue sería la otra forma de mentir sobre el
    // diagnóstico. Tiene que seguir apareciendo y ser drilleable.
    const groups = groupAuditIssues(bucket([finding('no_favicon', 'notice', 'https://x.cl/a')]))

    expect(groups).toHaveLength(1)
    expect(groups[0].value).toBe('low')
  })

  it('dentro de la misma severidad prioriza más páginas por menos esfuerzo', () => {
    // `no_h1_tag` (low) con 10 páginas vs `is_http` (high) con 12: 10/1 > 12/3.
    const groups = groupAuditIssues(
      bucket([
        ...Array.from({ length: 10 }, (_, i) => finding('no_h1_tag', 'warning', `https://x.cl/a${i}`)),
        ...Array.from({ length: 12 }, (_, i) => finding('is_http', 'warning', `https://x.cl/b${i}`))
      ])
    )

    expect(groups.map(group => group.issueType)).toEqual(['no_h1_tag', 'is_http'])
  })

  it('cuenta URLs distintas, no filas', () => {
    const groups = groupAuditIssues(
      bucket([
        finding('no_title', 'critical', 'https://x.cl/a'),
        finding('no_title', 'critical', 'https://x.cl/a'),
        finding('no_title', 'critical', 'https://x.cl/b')
      ])
    )

    expect(groups[0].affectedPages).toBe(2)
    expect(groups[0].findings).toHaveLength(3)
  })

  it('nombra un check sin ficha en vez de esconderlo', () => {
    const groups = groupAuditIssues(bucket([finding('brand_new_provider_check', 'warning', 'https://x.cl/a')]))

    expect(groups[0].uncatalogued).toBe(true)
    expect(groups[0].label).toContain('brand_new_provider_check')
    expect(groups[0].effort).toBe('medium')
  })

  it('es estable ante grupos equivalentes', () => {
    const input = bucket([
      finding('no_favicon', 'notice', 'https://x.cl/a'),
      finding('no_doctype', 'notice', 'https://x.cl/a')
    ])

    expect(groupAuditIssues(input).map(g => g.issueType)).toEqual(groupAuditIssues(input).map(g => g.issueType))
  })

  it('un reporte sin findings no produce grupos', () => {
    expect(groupAuditIssues(bucket([]))).toEqual([])
  })
})

describe('catálogo es-CL de issues', () => {
  // Drift guard: cuando el backend sume un check al allowlist, esta prueba obliga a
  // escribir su ficha. Sin ella el check nuevo caería al fallback "sin catalogar" en
  // silencio y el operador vería un id de máquina en la lista priorizada.
  it('cubre todo el allowlist de findings-map', () => {
    const sinFicha = Object.keys(ONPAGE_CHECK_SEVERITY).filter(check => !GH_GROWTH_SEO_AUDIT_ISSUES[check])

    expect(sinFicha).toEqual([])
  })

  it('no cataloga checks que el backend no materializa', () => {
    const huerfanas = Object.keys(GH_GROWTH_SEO_AUDIT_ISSUES).filter(check => !ONPAGE_CHECK_SEVERITY[check])

    expect(huerfanas).toEqual([])
  })
})

describe('daysSinceCrawl', () => {
  const now = new Date('2026-08-08T12:00:00Z')

  it('resuelve hoy, ayer y una ventana larga', () => {
    expect(daysSinceCrawl('2026-08-08T09:00:00Z', now)).toBe(0)
    expect(daysSinceCrawl('2026-08-07T09:00:00Z', now)).toBe(1)
    expect(daysSinceCrawl('2026-07-20T09:00:00Z', now)).toBeGreaterThan(STALE_CRAWL_DAYS)
  })

  it('degrada sin fecha utilizable en vez de inventar frescura', () => {
    expect(daysSinceCrawl(null, now)).toBeNull()
    expect(daysSinceCrawl('no-es-fecha', now)).toBeNull()
  })

  it('no reporta días negativos si el reloj del crawl viene adelantado', () => {
    expect(daysSinceCrawl('2026-08-09T09:00:00Z', now)).toBe(0)
  })
})
