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
}

/**
 * Curva pública de referencia, usada cuando la propia no puede hablar en esa posición.
 *
 * ⚠️ Marcada como APROXIMACIÓN, jamás como medición: quien la consuma lo sabe por
 * `source`, que nunca dice `org_measured` cuando el número sale de acá.
 */
const FALLBACK_CTR_CURVE: Record<number, number> = {
  1: 0.27,
  2: 0.15,
  3: 0.11,
  4: 0.08,
  5: 0.06,
  6: 0.05,
  7: 0.04,
  8: 0.03,
  9: 0.027,
  10: 0.025
}

const FALLBACK_CTR_TAIL = 0.02

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
  const borrowed = FALLBACK_CTR_CURVE[targetPosition] ?? FALLBACK_CTR_TAIL

  if (bucket && isCurveUsableAtPosition(curve, targetPosition, floor) && bucket.ctr > 0) {
    return { targetPosition, expectedCtr: bucket.ctr, source: 'org_measured', sampleSize }
  }

  return {
    targetPosition,
    expectedCtr: borrowed,
    // Vimos la posición pero la muestra no alcanza (`unusable`) vs nunca la observamos
    // (`fallback`). Mismo número prestado, hechos distintos.
    source: bucket ? 'unusable' : 'fallback',
    sampleSize
  }
}
