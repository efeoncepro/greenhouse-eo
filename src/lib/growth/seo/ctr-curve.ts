import 'server-only'

/**
 * TASK-1792 — La curva de CTR por posición, con su MUESTRA y su veredicto de usabilidad.
 *
 * ═══ El defecto que este módulo existe para cerrar ═══
 *
 * El reader de oportunidades preguntaba «¿está el bucket en el `Map`?» cuando la pregunta
 * real es «¿hay muestra suficiente para estimar un CTR?». No son la misma pregunta y la
 * primera no aproxima a la segunda: con la curva de `efeoncepro.com` medida contra PG el
 * 2026-08-28, el bucket 5 tiene **75 impresiones y 0 clics**, así que un guard de una sola
 * dimensión (`typeof measured === 'number'`) devolvía `0` como «CTR esperado». Ese cero
 * colapsaba la ganancia estimada de TODA la lente y volvía el `.sort()` un no-op: la pantalla
 * no ordenaba mal, no ordenaba. Y no fallaba nada — el número existía y era válido.
 *
 * Es la doctrina ●/◑ del módulo violada en su centro: **ausencia de evidencia tratada como
 * evidencia de cero**. Acá esa confusión es imposible por construcción, porque la curva
 * transporta la muestra que la sostiene y el veredicto es explícito.
 *
 * ═══ Por qué el piso mira DOS dimensiones y no impresiones solas ═══
 *
 * La precisión de un estimador de tasa la gobiernan los **éxitos** (clics), no los ensayos.
 * Un bucket con 50.000 impresiones y 3 clics tampoco tiene curva. Y el piso de impresiones
 * por sí solo es indefendible: por la regla de tres (cota superior del IC 95% para cero
 * éxitos en `n` ensayos ≈ `3/n`), un bucket que pasa con 10 impresiones y 0 clics es
 * compatible con CUALQUIER CTR entre 0% y 26% — la escala entera del fenómeno, escrita
 * como si fuera un puntual.
 *
 * ⚠️ `MIN_IMPRESSIONS_FLOOR = 10` del reader NO es este piso. Aquel responde «¿es
 * interpretable la posición media?» y ahí 10 basta (su uso legítimo vive en
 * `gap/read-seo-aeo-gap.ts`). Reutilizarlo para «¿es estimable el CTR?» fue el segundo
 * error compuesto del defecto original: una constante respondiendo dos preguntas
 * estadísticas distintas, sin que nada en el código lo marcara.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// `import type` pleno: `contracts.ts` es la hoja sin `server-only` y la UI lo importa, así que
// el tipo vive allá y este módulo lo consume — nunca al revés.
import type { SeoCtrCurveSource } from './contracts'

/** Un bucket de la curva CON su muestra — sin la muestra no se puede juzgar si sirve. */
export interface SeoCtrCurveBucket {
  impressions: number
  clicks: number
  ctr: number
}

export type SeoOrgCtrCurve = Map<number, SeoCtrCurveBucket>

/**
 * Piso de muestra para declarar estimable el CTR de un bucket.
 *
 * 🔴 **ADOPTADO, no propuesto.** Los valores son los de
 * `work-queue/score-versions.ts` (`curveMinBucketImpressions` / `curveMinBucketClicks`), que
 * los justifica con la aritmética: con un CTR verdadero de ~1% (el que mide `berel.com` en la
 * posición objetivo), `P(0 clics | n=75) ≈ 47%` — observar cero es una moneda al aire; con
 * `n=1000` esa probabilidad cae a ~0,004%, y recién ahí un cero observado significa algo. El
 * piso de 5 clics es el más laxo que todavía sostiene un ORDEN (error relativo ≈ 1/√k ≈ 45%).
 *
 * El repo ya tenía dos respuestas a la misma pregunta; esta task las reduce, no agrega una
 * tercera. `__tests__/ctr-curve.test.ts` importa la config del score y falla si los dos lados
 * divergen, para que mover el umbral de un solo lado sea imposible en silencio. La
 * unificación del predicado es el follow-up declarado, cuando `TASK-1700` cierre.
 */
export const SEO_CTR_CURVE_SAMPLE_FLOOR = {
  minBucketImpressions: 1000,
  minBucketClicks: 5
} as const

export type SeoCtrCurveSampleFloor = typeof SEO_CTR_CURVE_SAMPLE_FLOOR

/**
 * SQL de la curva, exportado para que un sanity/live test lo ejercite EXACTAMENTE (patrón
 * `SEO_KEYWORD_OPPORTUNITIES_SQL`). Se importa en vez de copiarse para que no pueda quedar
 * verde probando una versión vieja.
 *
 * 🔴 **Sin `HAVING SUM(impressions) >= n`, a propósito.** La decisión de usabilidad NO se toma
 * en el SQL: un `HAVING` borra el bucket de la respuesta y produce exactamente la confusión
 * que este módulo cierra — «no vino» pasa a significar lo mismo que «vino sin muestra», y el
 * consumidor no puede distinguir «nunca observamos esa posición» de «la observamos y no
 * alcanza». El filtro vive en TS, sobre datos que el consumidor puede inspeccionar.
 *
 * Nota date-math (gate TASK-893): `capture_date` es DATE; sólo se compara contra
 * `CURRENT_DATE - $n::int`. Cero `EXTRACT(EPOCH FROM (a - b))`.
 *
 * Parámetros: `$1` organizationId · `$2` windowDays.
 */
export const SEO_CTR_CURVE_SQL = `SELECT ROUND(position)::int AS position_bucket,
              SUM(impressions)::text AS impressions,
              SUM(clicks)::text      AS clicks
         FROM greenhouse_growth.seo_gsc_daily
        WHERE organization_id = $1
          AND capture_date >= (CURRENT_DATE - $2::int)
          AND position > 0
        GROUP BY ROUND(position)::int
        ORDER BY position_bucket`

/**
 * Curva de CTR por posición de la PROPIA organización, con la muestra de cada bucket.
 *
 * Se prefiere sobre cualquier tabla de industria porque incorpora automáticamente cuánto
 * deprimen el CTR los AI Overviews en ESE sitio y vertical, sin tener que estimarlo ni
 * discutirlo con el cliente.
 *
 * ⚠️ Alcance `all_rows`: incluye filas de marca, cuya explosión por sitelinks infla los
 * buckets 1–2 (el oficio pide calcular la curva sobre filas NO-MARCA). Es un defecto
 * INDEPENDIENTE del tamaño de muestra —no se cura cuando el sitio crezca— y tiene su propio
 * follow-up, porque requiere decidir cómo se clasifica marca en el módulo. Declarado acá para
 * que ningún consumidor lea la curva creyéndola libre de ese sesgo.
 */
export const readOrgCtrCurve = async (organizationId: string, windowDays: number): Promise<SeoOrgCtrCurve> => {
  const rows = await runGreenhousePostgresQuery<{
    position_bucket: number
    impressions: string
    clicks: string
  }>(SEO_CTR_CURVE_SQL, [organizationId, windowDays])

  const curve: SeoOrgCtrCurve = new Map()

  for (const row of rows) {
    const impressions = Number(row.impressions)
    const clicks = Number(row.clicks)

    if (!Number.isFinite(impressions) || !Number.isFinite(clicks)) continue

    curve.set(Number(row.position_bucket), {
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions : 0
    })
  }

  return curve
}

/**
 * 🔴 EL predicado de usabilidad. Exige impresiones **Y** clics — nunca una sola dimensión.
 *
 * Caso que lo motiva, medido contra PG el 2026-08-28: `efeoncepro.com` tiene 75 impresiones y
 * 0 clics en el bucket 5. `berel.com`, mismo bucket: 37.600 y 370 — eso sí es una medición.
 */
export const isCurveUsableAtPosition = (
  curve: SeoOrgCtrCurve,
  position: number,
  floor: SeoCtrCurveSampleFloor = SEO_CTR_CURVE_SAMPLE_FLOOR
): boolean => {
  const bucket = curve.get(Math.max(1, Math.round(position)))

  if (!bucket) return false

  return bucket.impressions >= floor.minBucketImpressions && bucket.clicks >= floor.minBucketClicks
}

export interface SeoExpectedCtrVerdict {
  /** Posición para la que se resolvió el CTR esperado (bucket entero). */
  targetPosition: number
  /**
   * CTR esperado en esa posición. Siempre un número — la honestidad viaja en `source`, no en
   * un `null` que cada consumidor tendría que interpretar por su cuenta.
   */
  expectedCtr: number
  source: SeoCtrCurveSource
  /**
   * Muestra del bucket objetivo. `null` SÓLO cuando el bucket no existe. Las dos dimensiones
   * viajan juntas a propósito: un `curveSampleSize` escalar volvería a sugerir que las
   * impresiones bastan para juzgar la muestra, que es justo el error de origen.
   */
  sampleSize: { impressions: number; clicks: number } | null
  /** Nivel con que se escaló la forma de referencia, y de dónde salió. */
  level: SeoCtrLevelEstimate
}

/**
 * Curva de CTR de REFERENCIA por posición, usada cuando la propia no puede hablar.
 *
 * ═══ Procedencia, porque un número sin origen no es una referencia ═══
 *
 * Son los CTR MEDIDOS sobre filas **no-marca** de un sitio real en un vertical deprimido por
 * AI Overviews, documentados con su as-of (2026-08) en la skill `seo-aeo`,
 * `modules/07_MEASUREMENT.md`. Reemplazan la tabla pública que vivía acá
 * (`{1: 0.27, 2: 0.15, … 5: 0.06}`), que estaba calibrada para una SERP que ya no existe.
 *
 * ═══ Por qué se presta la FORMA y se estima el NIVEL ═══
 *
 * Comparadas normalizando la posición 1 a 1,00, las tres curvas disponibles el 2026-08-28
 * coinciden en su decaimiento:
 *
 * | Fuente                          | p1   | p2   | p3   | p4   | p5   |
 * |---------------------------------|------|------|------|------|------|
 * | Tabla pública (la que estaba)   | 1,00 | 0,56 | 0,41 | 0,30 | 0,22 |
 * | `berel.com` medida (PG, 28d)    | 1,00 | 0,67 | 0,53 | 0,29 | 0,21 |
 * | No-marca medida (skill, 2026-08)| 1,00 | 0,72 | 0,54 | 0,32 | 0,26 |
 *
 * Lo que divergía no era la forma: era el NIVEL. Posición 1 en **27%** (tabla pública) contra
 * **4,72%** (Berel) y **4,25%** (skill) — dos sitios medidos independientes en el mismo orden
 * de magnitud, y un orden de magnitud por debajo del benchmark de industria. En la posición
 * objetivo por defecto (5) eso es 6% declarado contra ~1% medido: **cualquier organización que
 * cayera al fallback recibía techos inflados ~6×.**
 *
 * De ahí la forma del Slice 4: **un nivel es 1 parámetro; una curva por posición son ~20.** Se
 * estima el nivel del sitio desde su propio agregado —cuando hay muestra para uno— y se presta
 * la forma, en vez de estimar veinte cosas desde datos que no sostienen ni una.
 *
 * ⚠️ Valores CRUDOS a propósito: la tabla es verificable contra su fuente, y la monotonía se
 * fuerza en código (`buildExpectedCtrCurve`) donde se puede ver. Las posiciones 10–12 de la
 * medición repuntan (0,31 → 0,35 → 0,40) por ruido de muestra chica; congelar acá la versión
 * ya suavizada escondería que la corrección existe.
 */
const REFERENCE_CTR_CURVE: Record<number, number> = {
  1: 0.0425, 2: 0.0305, 3: 0.0229, 4: 0.0135, 5: 0.0112, 6: 0.008,
  7: 0.0057, 8: 0.0049, 9: 0.0031, 10: 0.0035, 11: 0.0035, 12: 0.004
}

/** Última posición con medición propia en la referencia. */
const REFERENCE_LAST_POSITION = 12

/**
 * Piso de muestra para estimar el NIVEL del sitio (un solo parámetro).
 *
 * `minClicks = 30`: el error relativo de un conteo es ≈ 1/√k, así que 30 clics dan ~18% —
 * suficiente para escalar una curva, lejos de suficiente para dibujarla. `minImpressions`
 * acompaña para que el denominador no sea ruido.
 *
 * Deliberadamente MÁS BAJO que el piso por bucket (1.000/5): estimar un parámetro sobre el
 * agregado del sitio necesita mucha menos muestra que estimar veinte por posición. Fundir los
 * dos pisos sería repetir el error de origen — una constante respondiendo dos preguntas.
 */
const LEVEL_ESTIMATION_FLOOR = { minClicks: 30, minImpressions: 1000 } as const

/**
 * Cómo se obtuvo el nivel con que se escala la forma de referencia.
 *
 * `org_level` = estimado del agregado propio del sitio · `reference` = no había muestra para
 * un nivel, así que la referencia va a su nivel nativo.
 */
export type SeoCtrLevelBasis = 'org_level' | 'reference'

export interface SeoCtrLevelEstimate {
  /** Factor de escala sobre la forma de referencia. `1` = la referencia a su nivel nativo. */
  level: number
  basis: SeoCtrLevelBasis
  totalImpressions: number
  totalClicks: number
}

const referenceCtrAt = (position: number): number =>
  REFERENCE_CTR_CURVE[Math.min(Math.max(1, position), REFERENCE_LAST_POSITION)] ??
  REFERENCE_CTR_CURVE[REFERENCE_LAST_POSITION]

/**
 * Estima el NIVEL del sitio: cuánto se separa su CTR del de la curva de referencia.
 *
 * Es la estimación de máxima verosimilitud del factor de escala bajo un modelo de tasa: el
 * cociente entre los clics REALES del sitio y los que la referencia predice para SU
 * distribución de impresiones por posición. Un solo parámetro, del agregado — no una curva.
 *
 * ⚠️ El agregado incluye filas de MARCA, cuya explosión por sitelinks infla las posiciones
 * 1–2. El oficio pide estimar sobre no-marca; ese filtro es un defecto independiente con su
 * propio follow-up, y se declara acá para que el nivel no se lea libre de ese sesgo.
 */
export const estimateOrgCtrLevel = (curve: SeoOrgCtrCurve): SeoCtrLevelEstimate => {
  let totalImpressions = 0
  let totalClicks = 0
  let predictedClicks = 0

  for (const [position, bucket] of curve) {
    totalImpressions += bucket.impressions
    totalClicks += bucket.clicks
    predictedClicks += bucket.impressions * referenceCtrAt(position)
  }

  const estimable =
    totalClicks >= LEVEL_ESTIMATION_FLOOR.minClicks &&
    totalImpressions >= LEVEL_ESTIMATION_FLOOR.minImpressions &&
    predictedClicks > 0

  if (!estimable) {
    return { level: 1, basis: 'reference', totalImpressions, totalClicks }
  }

  return { level: totalClicks / predictedClicks, basis: 'org_level', totalImpressions, totalClicks }
}

export interface SeoExpectedCtrCurve {
  /** CTR esperado por posición, ya monótono no creciente. */
  byPosition: Map<number, number>
  level: SeoCtrLevelEstimate
}

/** Techo de posiciones a construir: más allá el número no lo consume nadie. */
const MAX_BUILT_POSITION = 100

/**
 * Construye la curva de CTR esperado EXPUESTA: una sola curva, sin saltos.
 *
 * El defecto de forma que cierra: el híbrido anterior devolvía la medición propia cuando el
 * bucket existía y la tabla pública cuando no, sin transición. Con la curva real de
 * `efeoncepro.com` eso producía **bucket 8 en 0,0000 y bucket 9 en ~0,027** — dos órdenes de
 * magnitud entre posiciones adyacentes, que ninguna SERP tiene.
 *
 * Acá cada posición se resuelve así, en orden:
 *
 * 1. Medición propia, si el bucket tiene muestra suficiente **y** su CTR es mayor a cero.
 * 2. Forma de referencia × nivel del sitio (o × 1 si no hay muestra para un nivel).
 *
 * Y al final se fuerza **monótona no creciente**: mezclar buckets medidos con buckets prestados
 * puede producir repuntes que no describen ningún comportamiento —la posición 6 no convierte
 * mejor que la 5—, y la propia referencia repunta en 10–12 por ruido de muestra chica.
 */
export const buildExpectedCtrCurve = (
  curve: SeoOrgCtrCurve,
  floor: SeoCtrCurveSampleFloor = SEO_CTR_CURVE_SAMPLE_FLOOR
): SeoExpectedCtrCurve => {
  const level = estimateOrgCtrLevel(curve)
  const observedMax = curve.size > 0 ? Math.max(...curve.keys()) : 0
  const lastPosition = Math.min(MAX_BUILT_POSITION, Math.max(REFERENCE_LAST_POSITION, observedMax))
  const byPosition = new Map<number, number>()

  let ceiling = Number.POSITIVE_INFINITY

  for (let position = 1; position <= lastPosition; position += 1) {
    const bucket = curve.get(position)

    const usesOwnMeasurement =
      bucket !== undefined && bucket.ctr > 0 && isCurveUsableAtPosition(curve, position, floor)

    const raw = usesOwnMeasurement ? bucket.ctr : referenceCtrAt(position) * level.level

    // Monotonía por mínimo corrido: una posición nunca puede prometer más CTR que la anterior.
    ceiling = Math.min(ceiling, raw)
    byPosition.set(position, ceiling)
  }

  return { byPosition, level }
}

/**
 * Resuelve el CTR esperado en una posición, DECLARANDO de dónde salió y con qué muestra.
 *
 * 🔴 Invariante sostenido por el mecanismo, no sólo por el test: un veredicto
 * `org_measured` **no puede** llevar `expectedCtr = 0`. El piso de clics ya lo hace
 * imposible aritméticamente (≥5 clics sobre ≥1000 impresiones ⇒ CTR > 0), pero la guarda
 * está igual, porque el valor válido-pero-degenerado es exactamente la clase de bug que
 * pasó todos los checks durante semanas sin que nada fallara. Si algún día la aritmética
 * cambia, el estado degenera a `unusable` en vez de volver a fabricar un cero creíble.
 */
export const resolveExpectedCtrAtPosition = (
  curve: SeoOrgCtrCurve,
  position: number,
  floor: SeoCtrCurveSampleFloor = SEO_CTR_CURVE_SAMPLE_FLOOR
): SeoExpectedCtrVerdict => {
  const targetPosition = Math.max(1, Math.round(position))
  const bucket = curve.get(targetPosition)
  const sampleSize = bucket ? { impressions: bucket.impressions, clicks: bucket.clicks } : null
  const expected = buildExpectedCtrCurve(curve, floor)
  const expectedCtr = expected.byPosition.get(targetPosition) ?? referenceCtrAt(targetPosition)

  if (bucket && isCurveUsableAtPosition(curve, targetPosition, floor) && bucket.ctr > 0) {
    return { targetPosition, expectedCtr, source: 'org_measured', sampleSize, level: expected.level }
  }

  // El número salió de la forma de referencia. Si además se pudo estimar el nivel del sitio,
  // está CALIBRADO a este sitio y eso es un hecho distinto de una tabla prestada tal cual.
  if (expected.level.basis === 'org_level') {
    return {
      targetPosition,
      expectedCtr,
      source: 'org_level_reference_shape',
      sampleSize,
      level: expected.level
    }
  }

  return {
    targetPosition,
    expectedCtr,
    // Vimos la posición pero la muestra no alcanza (`unusable`) vs nunca la observamos
    // (`fallback`). Mismo número prestado, hechos distintos.
    source: bucket ? 'unusable' : 'fallback',
    sampleSize,
    level: expected.level
  }
}
