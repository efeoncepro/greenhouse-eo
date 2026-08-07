import type { KeywordOpportunity } from '@/lib/growth/seo/contracts'

/**
 * TASK-1308 — La ACCIÓN recomendada de una oportunidad, derivada del contrato del reader.
 *
 * 🔴 No es una severidad ni una variante visual: son **trabajos distintos**. La skill
 * `seo-aeo` (§02) es explícita — una query que rankea con más de una página *"no es una
 * oportunidad de optimización sino de CONSOLIDACIÓN"*, con su propio dueño y su propio
 * criterio de éxito. Por eso `cannibalized` GANA sobre la posición: empujar una keyword
 * canibalizada es empujar dos páginas tuyas a competir más fuerte entre sí.
 *
 * Vive en su propio módulo, y no dentro del chart, porque el mapa, los filtros y la tabla
 * tienen que clasificar IGUAL: tres copias de este `if` derivarían y una fila diría
 * "Empujar" mientras su punto se pinta como "Consolidar".
 */

export type KeywordAction = 'quickWin' | 'striking' | 'cannibalized'

/** Borde de la primera plana. Espejo del `quickWin` del reader (`position <= 10`). */
const FIRST_PAGE_EDGE = 10

/** Orden de lectura: primero lo más barato de mover, al final lo que es otro trabajo. */
export const KEYWORD_ACTION_ORDER: readonly KeywordAction[] = ['quickWin', 'striking', 'cannibalized'] as const

export const resolveKeywordAction = (opportunity: Pick<KeywordOpportunity, 'position' | 'cannibalized'>): KeywordAction => {
  if (opportunity.cannibalized) return 'cannibalized'

  return opportunity.position <= FIRST_PAGE_EDGE ? 'quickWin' : 'striking'
}
