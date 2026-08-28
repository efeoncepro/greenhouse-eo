import 'server-only'

/**
 * TASK-1700 — Registro APPEND-ONLY de las versiones conocidas del score de prioridad.
 *
 * ═══ Por qué existe este archivo ═══
 *
 * Antes de esta task los parámetros del score vivían como constantes de módulo en
 * `keyword-opportunities-reader.ts` (`DEFAULT_TARGET_POSITION = 5`,
 * `DEFAULT_IMPRESSIONS_PERCENTILE = 0.75`, `MIN_IMPRESSIONS_FLOOR = 10`). Cambiar cualquiera
 * movía el ranking histórico completo sin dejar rastro: un cliente que pregunta "¿por qué
 * esto ya no es prioridad?" no tenía respuesta auditable. Acá la config completa viaja
 * DENTRO del objeto versionado y cada snapshot persiste con qué versión se calculó.
 *
 * 🔴 **NUNCA cambies un valor de una versión ya publicada.** Se agrega una versión nueva y se
 * mueve `ACTIVE_PRIORITY_SCORE_VERSION`. Las versiones viejas se quedan para siempre: son lo
 * que hace legibles los snapshots que ya viajaron a un plan del día. El test
 * `score-versions.test.ts` congela la huella de cada versión y falla si alguien edita un
 * valor sin bumpear.
 *
 * ═══ Dos objetos, no uno (dimensiones ortogonales) ═══
 *
 * `PRIORITY_SCORE_CONFIGS` sólo contiene lo que MUEVE EL ORDEN. La cadencia del
 * materializador, el TTL del snapshot y el intervalo mínimo de recomputación son knobs
 * OPERATIVOS: cambiarlos no reordena nada, así que exigir un bump de versión por tocarlos
 * castigaría el ajuste operativo y devaluaría la señal que la versión pretende dar. Viven en
 * `WORK_QUEUE_RUNTIME_CONFIG` y no entran en la huella.
 */

/** Alcance de las filas de GSC con que se deriva la curva de CTR por posición. */
export type CtrCurveScope = 'all_rows' | 'non_brand'

export interface PriorityScoreConfig {
  version: string
  /** Ventana de la demanda medida, en días. 28 = 4 ciclos semanales completos. */
  windowDays: number
  /** Posición a la que se aspira llegar; define el CTR objetivo del score. */
  targetPosition: number
  /** Rango striking-distance: ya visible, falta el empujón. */
  minPosition: number
  maxPosition: number
  /** "Alta impresión" es un percentil sobre la propia distribución de la org, no un número. */
  impressionsPercentile: number
  /** Piso absoluto bajo el cual una "posición media" no es interpretable. */
  minImpressionsFloor: number
  /**
   * 🔴 De dónde salen las filas para la curva de CTR.
   *
   * `all_rows` en v1 — es el método que ya usaba `keyword-opportunities-reader.ts`, y
   * conservarlo es lo que permite que el cutover del consumer (Slice 7) sea un cambio de
   * FUENTE y no de COMPORTAMIENTO.
   *
   * ⚠️ Evidencia medida (skill `seo-aeo`, `07_MEASUREMENT.md`, as-of 2026-08): con
   * dimensiones `[query, page]` **una sola búsqueda donde aparecen varias páginas del sitio
   * genera una fila por página**. Medido: una query de marca aparece con 300 páginas y suma
   * 86.282 impresiones. En los temas NO-MARCA la inflación fue 1,0x–1,1x — dentro del ruido;
   * en marca es grande. La curva correcta se deriva de filas no-marca.
   *
   * Por qué no se hace en v1: "término de marca" es un concepto de dominio SIN dueño en el
   * repo (no hay SSOT de marca por organización), e inventarlo dentro del score sería una
   * identidad paralela. Y el efecto se concentra en los buckets 1–2, donde rankea la marca;
   * la posición objetivo de v1 es la 5. Pasar a `non_brand` es `incremental-clicks-v2`.
   *
   * El tipo ENUMERA los dos valores a propósito: una versión futura que declare `non_brand`
   * sin implementarlo tiene que ROMPER EL BUILD, no servir una curva equivocada en silencio.
   */
  ctrCurveScope: CtrCurveScope
  /**
   * 🔴 Piso de muestra del bucket objetivo para considerar UTILIZABLE la curva propia.
   *
   * Sin esto, un bucket con pocas impresiones y cero clics se lee como "CTR esperado = 0" y
   * el score sale 0 para toda la lente: el orden pasa a ser arbitrario y la pantalla afirma
   * "no hay oportunidad" donde en realidad no hay MUESTRA. Es un error silencioso —
   * ninguna excepción, un número perfectamente creíble.
   *
   * Los dos números, y de dónde salen:
   *
   * - `minBucketImpressions = 1000`. Con un CTR verdadero de ~1% (el orden de magnitud real
   *   en verticales deprimidos por AI Overviews: la curva medida de la skill da 1,12% en
   *   posición 5, y el target real de Berel da 0,98%), `P(0 clics | n=75) ≈ 47%` — observar
   *   cero es una moneda al aire. Con n=1000 esa probabilidad cae a ~0,004%: recién ahí un
   *   cero observado significa algo.
   * - `minBucketClicks = 5`. El error relativo de un conteo es ≈ 1/√k: con 5 clics, ~45%.
   *   Estimable, no preciso — el piso más laxo que todavía sostiene un ORDEN.
   *
   * Evidencia de apoyo (misma skill): posiciones medidas sobre 114 y 26 impresiones se
   * declaran explícitamente "muestra insuficiente".
   */
  curveMinBucketImpressions: number
  curveMinBucketClicks: number
}

/**
 * Todas las versiones conocidas. APPEND-ONLY: se agregan entradas, nunca se editan.
 */
export const PRIORITY_SCORE_CONFIGS = {
  'incremental-clicks-v1': {
    version: 'incremental-clicks-v1',
    windowDays: 28,
    targetPosition: 5,
    minPosition: 8,
    maxPosition: 20,
    impressionsPercentile: 0.75,
    minImpressionsFloor: 10,
    ctrCurveScope: 'all_rows',
    curveMinBucketImpressions: 1000,
    curveMinBucketClicks: 5
  }
} as const satisfies Record<string, PriorityScoreConfig>

export type PriorityScoreVersion = keyof typeof PRIORITY_SCORE_CONFIGS

/** La versión con la que se materializa HOY. Moverla es un cambio deliberado y auditable. */
export const ACTIVE_PRIORITY_SCORE_VERSION: PriorityScoreVersion = 'incremental-clicks-v1'

export const getPriorityScoreConfig = (
  version: PriorityScoreVersion = ACTIVE_PRIORITY_SCORE_VERSION
): PriorityScoreConfig => PRIORITY_SCORE_CONFIGS[version]

/**
 * Huella determinista de una config: claves ordenadas, valores serializados.
 *
 * El test la congela por versión. Si alguien cambia un umbral sin bumpear, la huella cambia
 * y el test falla nombrando exactamente qué hacer. Es la defensa que la señal de reliability
 * `growth.seo.work_queue.score_version_drift` complementa en runtime.
 */
export const fingerprintPriorityScoreConfig = (config: PriorityScoreConfig): string =>
  Object.keys(config)
    .filter(key => key !== 'version')
    .sort()
    .map(key => `${key}=${String(config[key as keyof PriorityScoreConfig])}`)
    .join('|')

/**
 * Knobs OPERATIVOS del materializador. Deliberadamente FUERA del objeto versionado: no
 * mueven el orden de nada, así que cambiarlos no invalida un snapshot histórico ni obliga a
 * una versión nueva del score.
 */
export const WORK_QUEUE_RUNTIME_CONFIG = {
  /**
   * Vida útil del snapshot. 26 h con cadencia diaria: una corrida perdida se NOTA (el
   * snapshot vence antes de que llegue el siguiente), que es justo lo que la señal
   * `growth.seo.work_queue.stale_snapshot` existe para ver.
   */
  snapshotTtlHours: 26,
  /**
   * Piso entre materializaciones manuales del operador. La cola NO le llama al proveedor
   * —lee tablas ya pagadas— así que un abuso cuesta CPU, no dólares; igual se acota para no
   * ahogar al worker.
   */
  minRecomputeIntervalMinutes: 60,
  /** Techo de filas por origen en un snapshot. Evita que un origen ruidoso ahogue al resto. */
  maxItemsPerOrigin: 200
} as const
