import { describe, expect, it } from 'vitest'

import { GH_GROWTH_SEO_AUDIT_ISSUES } from '@/lib/copy/growth'
import type { SeoSiteAuditFindingSeverity, SeoSiteAuditFindingView } from '@/lib/growth/seo/contracts'
import { ONPAGE_CHECK_SEVERITY } from '@/lib/growth/seo/site-audit/findings-map'
import { SITE_FINDING_SEVERITY } from '@/lib/growth/seo/site-audit/site-findings'

import {
  STALE_CRAWL_DAYS,
  daysSinceCrawl,
  groupAuditIssues,
  partitionAuditIssuesByScope
} from '../group-audit-issues'

const finding = (
  issueType: string,
  severity: SeoSiteAuditFindingSeverity,
  url: string,
  findingScope: SeoSiteAuditFindingView['findingScope'] = 'page'
): SeoSiteAuditFindingView => ({ issueType, severity, url, detail: {}, findingScope })

/** TASK-1671 — hallazgo de DOMINIO: todos comparten la URL raíz del sujeto. */
const siteFinding = (issueType: string, severity: SeoSiteAuditFindingSeverity): SeoSiteAuditFindingView =>
  finding(issueType, severity, 'https://berel.com', 'site')

const bucket = (items: SeoSiteAuditFindingView[]): Record<SeoSiteAuditFindingSeverity, SeoSiteAuditFindingView[]> => ({
  critical: items.filter(item => item.severity === 'critical'),
  warning: items.filter(item => item.severity === 'warning'),
  notice: items.filter(item => item.severity === 'notice')
})

/**
 * Espejo de los pesos de `group-audit-issues.ts`. Se declara acá a propósito: el test verifica la
 * FÓRMULA de orden de dominio, y leerla del módulo haría que un cambio de pesos pasara inadvertido.
 */
const VALUE_WEIGHT_MIRROR: Record<string, number> = { low: 0.5, medium: 2, high: 3 }
const EFFORT_WEIGHT_MIRROR: Record<string, number> = { low: 1, medium: 2, high: 3 }

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

  describe('alcance de dominio (TASK-1671)', () => {
    it('el alcance sale del dato persistido, no de una heurística por issueType', () => {
      const groups = groupAuditIssues(bucket([siteFinding('ai_retrieval_crawlers_blocked', 'critical')]))

      expect(groups[0].scope).toBe('site')
    })

    it('🔴 el alcance queda FUERA del orden de dominio, aunque alguien lo puebla con un sintético', () => {
      // El guardrail que la rama de `priorityScore` compra. Con `affectedPages = 1` la fórmula
      // vieja y la nueva dan el mismo número, así que un test sobre el caso normal no probaría
      // nada. Lo que sí se puede romper mañana es que alguien "arregle" el alcance de un grupo de
      // dominio con un conteo sintético (el total de páginas crawleadas es la tentación). Acá se
      // fuerza ese futuro y se exige que el orden entre hallazgos de dominio no se mueva.
      const conAlcanceSintetico = groupAuditIssues(
        bucket([
          siteFinding('sitemap_missing', 'notice'),
          siteFinding('ai_training_crawlers_blocked', 'notice')
        ])
      ).map(group => ({ ...group, affectedPages: group.issueType === 'ai_training_crawlers_blocked' ? 900 : 1 }))

      const reordenado = [...conAlcanceSintetico].sort((left, right) => {
        const byPriority =
          VALUE_WEIGHT_MIRROR[right.value] / EFFORT_WEIGHT_MIRROR[right.effort] -
          VALUE_WEIGHT_MIRROR[left.value] / EFFORT_WEIGHT_MIRROR[left.effort]

        return byPriority !== 0 ? byPriority : left.issueType.localeCompare(right.issueType)
      })

      // 900 páginas sintéticas no mueven al hallazgo de postura por encima del de sitemap.
      expect(reordenado.map(group => group.issueType)).toEqual([
        'sitemap_missing',
        'ai_training_crawlers_blocked'
      ])
    })

    it('la severidad sigue siendo corte absoluto: un notice de dominio no supera a un crítico de página', () => {
      const groups = groupAuditIssues(
        bucket([
          finding('is_broken', 'critical', 'https://berel.com/rota'),
          siteFinding('ai_training_crawlers_blocked', 'notice')
        ])
      )

      expect(groups[0].issueType).toBe('is_broken')
      expect(groups[1].scope).toBe('site')
    })

    it('entre dos hallazgos de dominio ordena por valor y esfuerzo, no por páginas', () => {
      const groups = groupAuditIssues(
        bucket([
          // `sitemap_missing`: notice, effort low, value medium.
          siteFinding('sitemap_missing', 'notice'),
          // `ai_training_crawlers_blocked`: notice, effort low, value low → debe ir después.
          siteFinding('ai_training_crawlers_blocked', 'notice')
        ])
      )

      expect(groups.map(group => group.issueType)).toEqual([
        'sitemap_missing',
        'ai_training_crawlers_blocked'
      ])
    })

    it('particiona preservando el orden y sin volver a agrupar', () => {
      const groups = groupAuditIssues(
        bucket([
          finding('is_broken', 'critical', 'https://berel.com/rota'),
          siteFinding('ai_retrieval_crawlers_blocked', 'critical'),
          finding('no_favicon', 'notice', 'https://berel.com/x')
        ])
      )

      const { site, page } = partitionAuditIssuesByScope(groups)

      expect(site.map(group => group.issueType)).toEqual(['ai_retrieval_crawlers_blocked'])
      expect(page.map(group => group.issueType)).toEqual(['is_broken', 'no_favicon'])
      expect(site.length + page.length).toBe(groups.length)
    })

    it('un run que no midió el dominio deja la partición de sitio VACÍA, no "sana"', () => {
      // Run histórico o previo al flip: cero filas `scope='site'`. La región no se renderiza;
      // decir "Verificado" acá sería el falso sano que TASK-1670 cerró en el motor.
      const groups = groupAuditIssues(bucket([finding('is_broken', 'critical', 'https://berel.com/rota')]))

      expect(partitionAuditIssuesByScope(groups).site).toEqual([])
    })
  })

  it('un reporte sin findings no produce grupos', () => {
    expect(groupAuditIssues(bucket([]))).toEqual([])
  })
})

/**
 * TASK-1670 — El drift bidireccional corre contra TODO lo que el backend materializa, que
 * desde esta task son dos allowlists: los checks de PÁGINA del proveedor OnPage y los
 * hallazgos de SITIO que Greenhouse evalúa por su cuenta. Chequear sólo el primero dejaría
 * que un hallazgo de sitio llegara a la pantalla sin ficha es-CL, mostrando su id de máquina.
 */
const MATERIALIZABLE_ISSUES: Record<string, string> = { ...ONPAGE_CHECK_SEVERITY, ...SITE_FINDING_SEVERITY }

describe('catálogo es-CL de issues', () => {
  // Drift guard: cuando el backend sume un check al allowlist, esta prueba obliga a
  // escribir su ficha. Sin ella el check nuevo caería al fallback "sin catalogar" en
  // silencio y el operador vería un id de máquina en la lista priorizada.
  it('cubre todo el allowlist de findings-map', () => {
    const sinFicha = Object.keys(MATERIALIZABLE_ISSUES).filter(check => !GH_GROWTH_SEO_AUDIT_ISSUES[check])

    expect(sinFicha).toEqual([])
  })

  it('no cataloga checks que el backend no materializa', () => {
    const huerfanas = Object.keys(GH_GROWTH_SEO_AUDIT_ISSUES).filter(check => !MATERIALIZABLE_ISSUES[check])

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
