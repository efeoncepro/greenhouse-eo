import 'server-only'

/**
 * TASK-1700 — El score de prioridad: clics incrementales sobre demanda MEDIDA.
 *
 * ═══ Por qué clics y no un índice ═══
 *
 * "Estimamos 340 clics adicionales al mes" se comprueba en el propio Search Console del
 * cliente en 60 días. Un índice de 0 a 100 no se comprueba con nada. Y la curva de CTR sale
 * del PROPIO sitio, así que absorbe sola cuánto deprime el CTR la respuesta generativa en
 * ESE vertical — no hay que estimarlo ni discutirlo.
 *
 * ⚠️ Es un TECHO, no un pronóstico: `impresiones × (CTR_objetivo − CTR_actual)` supone que
 * el CTR observado en esa posición se repite; NO dice que la página vaya a llegar ahí.
 * Preséntalo como techo (skill `seo-aeo`, `07_MEASUREMENT.md`).
 *
 * ⚠️ Tampoco es ventaja competitiva: varias suites conectan Search Console y proyectan
 * ganancia de clics. Lo propio es la combinación —curva del propio GSC aplicada a un CAMBIO
 * DE POSICIÓN— y que el mismo score ordene varios orígenes. No usar "ninguna herramienta
 * puede" en material comercial sin reverificar a la fecha.
 *
 * ═══ El invariante que este módulo hace cumplir ═══
 *
 * 🔴 La base del score depende de la EVIDENCIA, no del origen. Una keyword con impresiones
 * reales se puntúa venga de donde venga (un candidato de discovery PUEDE tener demanda
 * medida — `readKeywordDiscovery` compone `measuredGsc` y su orden por defecto lo premia
 * como el caso de mayor valor); y una sin impresiones NO recibe score aunque el proveedor
 * le estime volumen. Atarlo al origen habría sido una regla que se rompe sola.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  SCORE_BASIS_BAND,
  type SeoWorkQueueScoreBand,
  type SeoWorkQueueScoreBasis,
  type SeoWorkQueueScoreBreakdown
} from './contracts'
import { ACTIVE_PRIORITY_SCORE_VERSION, getPriorityScoreConfig, type PriorityScoreConfig } from './score-versions'

/** Un bucket de la curva con SU MUESTRA — sin la muestra no se puede juzgar si sirve. */
export interface CtrCurveBucket {
  impressions: number
  clicks: number
  ctr: number
}

export type OrgCtrCurve = Map<number, CtrCurveBucket>

/**
 * SQL de la curva, exportado para que el sanity live lo ejercite EXACTAMENTE (patrón
 * `SEO_KEYWORD_OPPORTUNITIES_SQL`). Se importa en vez de copiarse para que el sanity no
 * pueda quedar verde probando una versión vieja.
 *
 * Diferencia deliberada con `readOrgCtrCurve` del reader de oportunidades: acá NO hay
 * `HAVING SUM(impressions) >= n`. El filtro de muestra se aplica en TS con el umbral de la
 * config versionada, porque el piso es una decisión del score —y por lo tanto versionada—
 * y no una constante del SQL. Un HAVING acá haría que cambiar el piso no bumpee nada.
 *
 * Nota date-math (gate TASK-893): `capture_date` es DATE; sólo se compara contra
 * `CURRENT_DATE - $n::int`. Cero `EXTRACT(EPOCH FROM (a - b))`.
 *
 * Parámetros: `$1` organizationId · `$2` windowDays.
 */
export const SEO_WORK_QUEUE_CTR_CURVE_SQL = `SELECT ROUND(position)::int                              AS position_bucket,
              SUM(impressions)::text                              AS impressions,
              SUM(clicks)::text                                   AS clicks,
              (SUM(clicks)::numeric / NULLIF(SUM(impressions), 0))::text AS ctr
         FROM greenhouse_growth.seo_gsc_daily
        WHERE organization_id = $1
          AND capture_date >= (CURRENT_DATE - $2::int)
          AND position > 0
        GROUP BY ROUND(position)::int
        ORDER BY position_bucket`

/**
 * Curva de CTR por posición de la PROPIA organización, con la muestra de cada bucket.
 *
 * ⚠️ Alcance `all_rows` en v1 (ver `ctrCurveScope` en `score-versions.ts`): incluye filas de
 * marca, cuya explosión por sitelinks infla los buckets 1–2. La posición objetivo de v1 es
 * la 5, donde el efecto medido es despreciable; pasar a no-marca es un bump de versión.
 */
export const readOrgCtrCurve = async (organizationId: string, windowDays: number): Promise<OrgCtrCurve> => {
  const rows = await runGreenhousePostgresQuery<{
    position_bucket: number
    impressions: string
    clicks: string
    ctr: string | null
  }>(SEO_WORK_QUEUE_CTR_CURVE_SQL, [organizationId, windowDays])

  const curve: OrgCtrCurve = new Map()

  for (const row of rows) {
    const impressions = Number(row.impressions)
    const clicks = Number(row.clicks)
    const ctr = Number(row.ctr ?? 0)

    if (!Number.isFinite(impressions) || !Number.isFinite(clicks)) continue

    curve.set(Number(row.position_bucket), {
      impressions,
      clicks,
      ctr: Number.isFinite(ctr) ? ctr : 0
    })
  }

  return curve
}

/**
 * 🔴 EL helper del piso de muestra. Fuente ÚNICA: lo consumen el score, el materializador y
 * el test de paridad de orden.
 *
 * Que el test de paridad IMPORTE esta función en vez de llevar una lista de targets
 * comparables es lo que impide que el gate se convierta en el test de regresión del
 * snapshot con que se escribió: cuando la curva de un cliente madure, el gate lo deriva del
 * dato y nadie tiene que editar un literal.
 *
 * El caso que motiva el piso, medido contra PG el 2026-08-28: `efeoncepro.com` tiene 75
 * impresiones y 0 clics en el bucket 5. Tomar ese 0 como "CTR esperado" produce ganancia 0
 * para TODA la lente y un orden arbitrario, sin lanzar ningún error. `berel.com`, mismo
 * bucket: 37.600 impresiones y 370 clics — eso sí es una medición.
 */
export const isCurveUsableAtPosition = (
  curve: OrgCtrCurve,
  position: number,
  config: PriorityScoreConfig = getPriorityScoreConfig()
): boolean => {
  const bucket = curve.get(Math.max(1, Math.round(position)))

  if (!bucket) return false

  return bucket.impressions >= config.curveMinBucketImpressions && bucket.clicks >= config.curveMinBucketClicks
}

export interface PriorityScoreInput {
  /** Impresiones MEDIDAS en la ventana. 0 = nadie llegó por esa keyword. */
  impressions: number
  clicks: number
  /** Posición ponderada por impresiones. `null` cuando el origen no la conoce. */
  weightedPosition: number | null
  curve: OrgCtrCurve
}

export interface PriorityScoreResult {
  /** Clics incrementales estimados. `null` en las bandas 2 y 3 — el CHECK de DB lo exige. */
  score: number | null
  basis: SeoWorkQueueScoreBasis
  band: SeoWorkQueueScoreBand
  breakdown: SeoWorkQueueScoreBreakdown
}

/**
 * Puntúa una entrada. Función PURA: la curva y los insumos entran como argumentos, así que
 * el test ejercita la fórmula y no un mock de base de datos.
 */
export const computePriorityScore = (
  input: PriorityScoreInput,
  version = ACTIVE_PRIORITY_SCORE_VERSION
): PriorityScoreResult => {
  const config = getPriorityScoreConfig(version)
  const impressions = Number.isFinite(input.impressions) ? Math.max(0, input.impressions) : 0
  const clicks = Number.isFinite(input.clicks) ? Math.max(0, input.clicks) : 0
  const targetBucket = Math.max(1, Math.round(config.targetPosition))
  const sample = input.curve.get(targetBucket)

  const baseBreakdown = {
    impressions,
    clicks,
    weightedPosition: input.weightedPosition,
    targetPosition: config.targetPosition,
    curveSampleImpressions: sample?.impressions ?? null,
    curveSampleClicks: sample?.clicks ?? null,
    windowDays: config.windowDays
  }

  // ── Banda 3: sin demanda medida ──────────────────────────────────────────
  //
  // 🔴 Acá NO se mira el volumen estimado del proveedor. Ni siquiera está disponible en la
  // entrada, a propósito: lo que no se puede pasar no se puede usar por accidente.
  if (impressions <= 0) {
    const basis: SeoWorkQueueScoreBasis = 'no_measured_demand'

    return {
      score: null,
      basis,
      band: SCORE_BASIS_BAND[basis],
      breakdown: {
        ...baseBreakdown,
        currentCtr: null,
        expectedCtrAtTarget: null,
        ctrCurveSource: 'not_applicable',
        incrementalClicks: null,
        basisReason:
          'Sin impresiones en la ventana: no hay demanda medida que puntuar. La acción honesta es medir, no optimizar.'
      }
    }
  }

  const currentCtr = clicks / impressions

  // ── Banda 2: hay demanda, la curva no alcanza ────────────────────────────
  if (!isCurveUsableAtPosition(input.curve, config.targetPosition, config)) {
    const basis: SeoWorkQueueScoreBasis = 'measured_without_curve'

    return {
      score: null,
      basis,
      band: SCORE_BASIS_BAND[basis],
      breakdown: {
        ...baseBreakdown,
        currentCtr,
        expectedCtrAtTarget: null,
        ctrCurveSource: 'unusable',
        incrementalClicks: null,
        basisReason: sample
          ? `La curva propia en posición ${targetBucket} tiene ${sample.impressions} impresiones y ${sample.clicks} clics: muestra insuficiente para afirmar un CTR esperado (piso ${config.curveMinBucketImpressions}/${config.curveMinBucketClicks}).`
          : `La curva propia no tiene datos en posición ${targetBucket}: no se puede estimar el CTR objetivo.`
      }
    }
  }

  // ── Banda 1: clics incrementales sobre demanda medida ────────────────────
  const expectedCtrAtTarget = sample!.ctr

  // 🔴 Techo por posición: sólo tiene sentido si la posición objetivo es una MEJORA.
  // Una query cuya posición ponderada ya es mejor o igual que la objetivo no puede ganar
  // clics "llegando" ahí — ya está. Sin este guard, una posición 3 con CTR bajo la media de
  // la 5 recibía un techo positivo, que es proponer un descenso como oportunidad.
  const alreadyAtOrAboveTarget =
    config.positionCeilingGuard && input.weightedPosition !== null && input.weightedPosition <= config.targetPosition

  /**
   * 🔴 El techo que SÍ existe para esa fila, y por qué NO entra al score.
   *
   * Una página en posición 3 que convierte al 1 % cuando la mediana de la posición 3 es 6 %
   * tiene un techo real y medible: `impresiones × (mediana − actual)`. Poner ESE número en
   * `priority_score` sería tentador y estaría mal: el score de banda 1 significa "clics que
   * ganas SUBIENDO", y éste significa "clics que ganas escribiendo mejor el snippet". Dos
   * unidades distintas en la misma columna vuelven el orden incomparable — justo el defecto
   * de los cuatro criterios que este agregado existe para cerrar.
   *
   * Así que el número se ENTREGA como evidencia y el score se queda en 0: la fila cae al
   * fondo de la banda 1 (no hay ranking que ganar) y el operador igual ve cuánto hay del
   * otro lado. Convertirlo en orden propio exige su propia base y su propio verbo, y eso es
   * una migración del vocabulario cerrado, no un ajuste de fórmula.
   */
  const ownBucket = input.weightedPosition === null ? null : Math.max(1, Math.round(input.weightedPosition))
  const ownSample = ownBucket === null ? undefined : input.curve.get(ownBucket)

  const snippetCeilingClicks =
    alreadyAtOrAboveTarget && ownSample && ownBucket !== null && isCurveUsableAtPosition(input.curve, ownBucket, config)
      ? Number((impressions * Math.max(0, ownSample.ctr - currentCtr)).toFixed(4))
      : null

  // Nunca negativo: si la keyword ya convierte mejor que la media de la posición objetivo,
  // la ganancia es 0 — no un número que invite a "optimizar" lo que ya está mejor.
  const incrementalClicks = alreadyAtOrAboveTarget ? 0 : impressions * Math.max(0, expectedCtrAtTarget - currentCtr)
  const basis: SeoWorkQueueScoreBasis = 'measured_incremental_clicks'

  return {
    score: Number(incrementalClicks.toFixed(4)),
    basis,
    band: SCORE_BASIS_BAND[basis],
    breakdown: {
      ...baseBreakdown,
      currentCtr,
      expectedCtrAtTarget,
      ctrCurveSource: 'org_measured',
      incrementalClicks: Number(incrementalClicks.toFixed(4)),
      snippetCeilingClicks,
      basisReason: alreadyAtOrAboveTarget
        ? `Ya está en posición ${input.weightedPosition?.toFixed(1)}, mejor o igual que la objetivo ${targetBucket}: no hay techo por posición que ganar.` +
          (snippetCeilingClicks !== null && snippetCeilingClicks > 0
            ? ` El techo está en el snippet: ${Math.round(snippetCeilingClicks)} clics si convirtiera como la mediana de su propia posición.`
            : ' Tampoco hay techo por CTR: ya convierte como la mediana de su posición o mejor.')
        : incrementalClicks > 0
          ? `Techo de ${Math.round(incrementalClicks)} clics adicionales si llega a la posición ${targetBucket}, con la curva medida del propio sitio.`
          : `Ya convierte por encima de la media de la posición ${targetBucket}: el techo por posición es 0. Si hay algo que ganar, está en el snippet, no en el ranking.`
    }
  }
}
