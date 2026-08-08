import { GH_GROWTH_SEO_AUDIT, GH_GROWTH_SEO_AUDIT_ISSUES } from '@/lib/copy/growth'
import type { SeoSiteAuditFindingSeverity, SeoSiteAuditFindingView } from '@/lib/growth/seo/contracts'

/**
 * TASK-1309 — Agrupación y priorización de los findings del site audit.
 *
 * Vive fuera del componente a propósito: es la única decisión con reglas del nodo S4
 * ("¿qué ataco primero?") y merece test propio. El reader entrega findings PLANOS
 * (una fila por URL × check); acá se agrupan por `issueType` y se ordenan.
 *
 * El orden NO es un ranking suave: la severidad manda de forma absoluta y recién dentro
 * de cada nivel compiten alcance, valor de búsqueda y esfuerzo. Mezclarlo en un score
 * único dejaría que 400 imágenes sin `alt` enterraran un 5xx, que es exactamente el error
 * que la lista existe para evitar.
 */

export type SeoAuditIssueEffort = 'low' | 'medium' | 'high'

/** Cuánto mueve la aguja en búsqueda. Ortogonal a la severidad (qué tan roto está). */
export type SeoAuditIssueValue = 'low' | 'medium' | 'high'

export interface SeoAuditIssueGroup {
  /** Id de máquina del proveedor — es también el valor de `?issueGroup=`. */
  issueType: string
  /** Nombre es-CL; para un check sin ficha, nombra el id crudo en vez de esconderlo. */
  label: string
  hint: string | null
  severity: SeoSiteAuditFindingSeverity
  effort: SeoAuditIssueEffort
  value: SeoAuditIssueValue
  /** URLs distintas afectadas por este check. */
  affectedPages: number
  findings: readonly SeoSiteAuditFindingView[]
  /** `true` si el check aún no tiene ficha es-CL (el allowlist del backend creció). */
  uncatalogued: boolean
}

const SEVERITY_RANK: Record<SeoSiteAuditFindingSeverity, number> = { critical: 0, warning: 1, notice: 2 }

/**
 * Peso de esfuerzo para el desempate. Un issue que toca muchas páginas y se arregla en
 * lote gana a uno igual de ancho que exige tocar infraestructura.
 */
const EFFORT_WEIGHT: Record<SeoAuditIssueEffort, number> = { low: 1, medium: 2, high: 3 }

/**
 * Peso de valor de búsqueda. Existe porque la severidad NO lo encodea: dentro de `notice`
 * conviven higiene cosmética y señales reales, y sin este eje el alcance solo premiaba a
 * lo que toca todo el sitio — un favicon ausente en 91 páginas encabezaba su tier por
 * encima de imágenes sin `alt` en 50 (auditoría `seo-aeo`, 2026-08-08).
 *
 * `low` no es 0: un issue de higiene sigue siendo un issue y se sigue listando. Se hunde,
 * no desaparece — esconderlo sería la otra forma de mentir sobre el diagnóstico.
 */
const VALUE_WEIGHT: Record<SeoAuditIssueValue, number> = { low: 0.5, medium: 2, high: 3 }

/** Esfuerzo por defecto de un check todavía sin ficha: ni optimista ni alarmista. */
const DEFAULT_EFFORT: SeoAuditIssueEffort = 'medium'

/** Ídem para el valor: un check sin catalogar no se asume trivial ni decisivo. */
const DEFAULT_VALUE: SeoAuditIssueValue = 'medium'

/**
 * Alcance × valor de búsqueda ÷ esfuerzo. Los tres ejes son necesarios: sin alcance no se
 * distingue un problema aislado de uno sistémico, sin valor la trivia de sitio gana por
 * volumen, y sin esfuerzo se recomienda primero lo más caro de arreglar.
 */
const priorityScore = (group: SeoAuditIssueGroup): number =>
  (group.affectedPages * VALUE_WEIGHT[group.value]) / EFFORT_WEIGHT[group.effort]

/**
 * Agrupa los findings por `issueType` y los ordena por severidad ▸ (páginas × valor ÷ esfuerzo).
 *
 * Recibe el mapa por severidad tal cual lo entrega `readSiteAuditReport`.
 */
export const groupAuditIssues = (
  findings: Record<SeoSiteAuditFindingSeverity, readonly SeoSiteAuditFindingView[]>
): SeoAuditIssueGroup[] => {
  const byType = new Map<string, SeoSiteAuditFindingView[]>()

  for (const severity of ['critical', 'warning', 'notice'] as const) {
    for (const finding of findings[severity] ?? []) {
      const bucket = byType.get(finding.issueType)

      if (bucket) {
        bucket.push(finding)
      } else {
        byType.set(finding.issueType, [finding])
      }
    }
  }

  const groups: SeoAuditIssueGroup[] = []

  for (const [issueType, items] of byType) {
    const entry = GH_GROWTH_SEO_AUDIT_ISSUES[issueType]

    groups.push({
      issueType,
      label: entry?.label ?? GH_GROWTH_SEO_AUDIT.issues.unknownIssue(issueType),
      hint: entry?.hint ?? null,
      // La severidad la manda el backend por finding (CHECK de TASK-1299), no la ficha de
      // copy: si algún día difieren, gana el dato persistido, no el texto.
      severity: items[0].severity,
      effort: entry?.effort ?? DEFAULT_EFFORT,
      value: entry?.value ?? DEFAULT_VALUE,
      // URLs DISTINTAS: el mismo check puede venir repetido por página y contar filas
      // inflaría el volumen respecto de lo que el operador va a tener que abrir.
      affectedPages: new Set(items.map(item => item.url)).size,
      findings: items,
      uncatalogued: entry === undefined
    })
  }

  return groups.sort((left, right) => {
    const bySeverity = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]

    if (bySeverity !== 0) {
      return bySeverity
    }

    const byPriority = priorityScore(right) - priorityScore(left)

    if (byPriority !== 0) {
      return byPriority
    }

    // Desempate final estable: sin él, dos grupos equivalentes podrían intercambiarse
    // entre renders y la lista "saltaría" sin que nada haya cambiado.
    return left.issueType.localeCompare(right.issueType)
  })
}

/** Días completos entre el último crawl y hoy. `null` si no hay fecha utilizable. */
export const daysSinceCrawl = (isoDate: string | null, now: Date = new Date()): number | null => {
  if (!isoDate) {
    return null
  }

  const crawled = new Date(isoDate)

  if (Number.isNaN(crawled.getTime())) {
    return null
  }

  const diffMs = now.getTime() - crawled.getTime()

  return diffMs < 0 ? 0 : Math.floor(diffMs / 86_400_000)
}

/** Pasado este umbral el freshness deja de ser contexto y pasa a ser advertencia. */
export const STALE_CRAWL_DAYS = 14
