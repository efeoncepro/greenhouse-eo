import { describe, expect, it } from 'vitest'

import { computePriorityScore, type OrgCtrCurve } from '../priority-score'
import { PRIORITY_SCORE_CONFIGS } from '../score-versions'

/**
 * TASK-1700 v2 — Vectores dorados por versión: el hueco que la huella de parámetros NO cubre.
 *
 * `score-versions.test.ts` congela los VALORES de cada config. Eso atrapa a quien mueve un
 * umbral, y no atrapa a quien cambia la FÓRMULA: agregar un guard, reordenar una resta o
 * cambiar el redondeo pasa con la huella intacta y mueve todos los snapshots. Los vectores
 * de abajo congelan la SALIDA de cada versión sobre entradas fijas, que es lo único que
 * sostiene la promesa de que un snapshot viejo sigue siendo legible.
 *
 * 🔴 Mismo contrato que la huella: NUNCA edites un vector de una versión publicada. Si la
 * salida cambió, o es un bug, o es una versión nueva.
 */

const CURVE: OrgCtrCurve = new Map([
  [3, { impressions: 5000, clicks: 300, ctr: 0.06 }],
  [5, { impressions: 4000, clicks: 120, ctr: 0.03 }],
  [12, { impressions: 8000, clicks: 80, ctr: 0.01 }]
]) as never

const CASES = [
  { name: 'lejos del objetivo, con techo', impressions: 1000, clicks: 5, weightedPosition: 12 },
  { name: 'ya en el objetivo con CTR bajo', impressions: 2000, clicks: 20, weightedPosition: 3 },
  { name: 'exactamente en la posición objetivo', impressions: 900, clicks: 9, weightedPosition: 5 },
  { name: 'sin demanda medida', impressions: 0, clicks: 0, weightedPosition: 15 },
  // Los dos casos donde el guard NO puede aplicarse: sin posición no hay con qué compararla,
  // y sin curva utilizable la banda 2 manda antes de que el guard exista.
  { name: 'sin posición ponderada', impressions: 700, clicks: 7, weightedPosition: null },
  { name: 'curva no utilizable', impressions: 500, clicks: 4, weightedPosition: 11, degenerate: true },
  // 🔴 Los dos casos que una verificación adversarial encontró SIN cubrir, y que dejaban
  // pasar cambios de fórmula reales con los vectores en verde:
  //
  // - Posición FRACCIONARIA **bajo el guard**. El score usa el bucket OBJETIVO, que ya es
  //   entero, así que una posición fraccionaria lejos del objetivo no discrimina nada: el
  //   redondeo que importa es el de la posición PROPIA, y sólo se lee cuando el guard
  //   dispara. 3,6 redondea a 4 (la curva no tiene ese bucket → sin techo de snippet) y
  //   trunca a 3 (sí lo tiene → 55). Cambiar `round` por `floor` mueve ese campo.
  // - CTR actual POR ENCIMA del esperado. Sin este caso, borrar el `Math.max(0, …)` de
  //   `incrementalClicks` también pasaba verde — y produciría scores NEGATIVOS en producción.
  { name: 'posición fraccionaria bajo el guard', impressions: 1_000, clicks: 5, weightedPosition: 3.6 },
  { name: 'ya convierte mejor que la posición objetivo', impressions: 1_000, clicks: 90, weightedPosition: 12 }
] as const

/**
 * Salidas congeladas: `${basis}|${band}|${score}|${snippetCeilingClicks}`.
 *
 * El cuarto campo entró porque los tres primeros NO veían la aritmética del techo de
 * snippet: es evidencia que viaja en el breakdown y deja el `score` en 0, así que un cambio
 * en su fórmula pasaba con los vectores verdes. Un vector dorado que no cubre el campo que
 * cambió es un vector que da confianza sin darla.
 */
const GOLDEN: Record<string, readonly string[]> = {
  'incremental-clicks-v1': [
    'measured_incremental_clicks|1|25|null',
    'measured_incremental_clicks|1|40|null',
    'measured_incremental_clicks|1|18|null',
    'no_measured_demand|3|null|null',
    'measured_incremental_clicks|1|14|null',
    'measured_without_curve|2|null|null',
    'measured_incremental_clicks|1|25|null',
    'measured_incremental_clicks|1|0|null'
  ],
  'incremental-clicks-v2': [
    'measured_incremental_clicks|1|25|null',
    // 🔴 La diferencia de v2: una query YA en posición 3 no gana clics "llegando" a la 5.
    // v1 le prometía 40 — un descenso vendido como techo. Y el techo que SÍ tiene viaja como
    // evidencia: 100 clics si convirtiera como la mediana de su propia posición.
    'measured_incremental_clicks|1|0|100',
    'measured_incremental_clicks|1|0|18',
    'no_measured_demand|3|null|null',
    'measured_incremental_clicks|1|14|null',
    'measured_without_curve|2|null|null',
    'measured_incremental_clicks|1|0|null',
    'measured_incremental_clicks|1|0|null'
  ]
}

describe('TASK-1700 — vectores dorados por versión del score', () => {
  for (const version of Object.keys(PRIORITY_SCORE_CONFIGS)) {
    it(`${version} produce exactamente su salida congelada`, () => {
      expect(GOLDEN[version], `falta el vector dorado de ${version}`).toBeDefined()

      const actual = CASES.map(c => {
        const r = computePriorityScore(
          {
            impressions: c.impressions,
            clicks: c.clicks,
            weightedPosition: c.weightedPosition,
            curve: 'degenerate' in c && c.degenerate ? (new Map() as never) : CURVE
          },
          version as never
        )

        return `${r.basis}|${r.band}|${r.score}|${r.breakdown.snippetCeilingClicks ?? 'null'}`
      })

      expect(actual, `la fórmula de ${version} cambió sin bumpear la versión`).toEqual(GOLDEN[version])
    })
  }

  it('toda versión del registro tiene vector dorado', () => {
    // El reverso: publicar una versión sin congelar su salida deja el hueco abierto otra vez.
    expect(Object.keys(GOLDEN).sort()).toEqual(Object.keys(PRIORITY_SCORE_CONFIGS).sort())
  })
})
