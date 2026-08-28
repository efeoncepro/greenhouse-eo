import 'server-only'

/**
 * TASK-1700 — `materializeSeoWorkQueue`: la corrida que produce un snapshot.
 *
 * ═══ Las cuatro decisiones que definen este archivo ═══
 *
 * 1. **Composición EN MEMORIA, cero SQL cross-motor.** Cada colector produce sus filas por
 *    separado y acá se componen. No hay JOIN ni VIEW entre `seo_*` y `grader_*`: son motores
 *    aislados y unirlos por SQL es la violación más cara del boundary §1.1.
 *
 * 2. **Aislamiento de fallas.** Los colectores corren en paralelo y un origen caído degrada
 *    SU salud sin abortar el snapshot ni tocar el score de los demás. `Promise.allSettled` y
 *    no `Promise.all`: con `all`, un rechazo tumbaría el plan completo del día por un motor
 *    ajeno. Sus filas simplemente no existen en ese snapshot — cero ceros fantasma.
 *
 * 3. **Idempotencia por hash de insumos.** Mismos insumos ⇒ mismo `input_snapshot_hash` ⇒ el
 *    UNIQUE devuelve el snapshot existente con `reused: true` y CERO writes. Dos instancias
 *    del worker compitiendo por el mismo target resuelven por el índice, no por un lock
 *    aplicativo que habría que mantener.
 *
 * 4. **Una sola transacción.** Snapshot + items entran juntos o no entra nada: no existe un
 *    snapshot a medio poblar que alguien pueda leer como "el plan de hoy".
 */

import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'

import { withTransaction } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  SEO_WORK_QUEUE_AGGREGATE_TYPE,
  SEO_WORK_QUEUE_MATERIALIZED_EVENT,
  WORK_QUEUE_ORIGINS,
  type SeoWorkQueueCollectorResult,
  type SeoWorkQueueDecision,
  type SeoWorkQueueItemInput,
  type SeoWorkQueueOrigin,
  type SeoWorkQueueOriginHealth
} from './contracts'
import { collectAeoGap } from './collectors/aeo-gap'
import { collectCompetitorGap } from './collectors/competitor-gap'
import { collectConsolidation } from './collectors/consolidation'
import { collectDeclaredTargets } from './collectors/declared-target'
import { collectDiscoveryCandidates } from './collectors/discovery-candidate'
import { collectGscStrikingDistance } from './collectors/gsc-striking-distance'
import { decisionKey, unhealthy, type SeoWorkQueueCollectorContext } from './collectors/context'
import { readOrgCtrCurve } from './priority-score'
import {
  ACTIVE_PRIORITY_SCORE_VERSION,
  WORK_QUEUE_RUNTIME_CONFIG,
  getPriorityScoreConfig
} from './score-versions'

export type MaterializeSeoWorkQueueErrorCode =
  | 'target_not_found'
  | 'all_origins_failed'
  | 'query_failed'

export type MaterializeSeoWorkQueueResult =
  | {
      ok: true
      snapshotId: string
      itemCount: number
      originHealth: SeoWorkQueueOriginHealth[]
      priorityScoreVersion: string
      /** `true` cuando los insumos no cambiaron: se devolvió el snapshot vigente sin escribir. */
      reused: boolean
    }
  | { ok: false; errorCode: MaterializeSeoWorkQueueErrorCode; originHealth: SeoWorkQueueOriginHealth[] }

export interface MaterializeSeoWorkQueueInput {
  seoTargetId: string
  actor: string
  /** Salta el piso de recomputación. Sólo para el carril programado y los sanity. */
  force?: boolean
  env?: NodeJS.ProcessEnv
}

/**
 * ORDEN CANÓNICO. Es el mismo del índice de lectura y el que se persiste en
 * `rank_in_snapshot`, para que "la recomendación #1 de la mañana" sea un hecho consultable y
 * no un recálculo que puede dar distinto a las 3 pm.
 *
 * 🔴 Dentro de la banda 3 el desempate es ALFABÉTICO, jamás por volumen estimado. Ordenar
 * ahí por volumen del proveedor reintroduciría por la puerta de atrás justo lo que el
 * invariante ●/◑ prohíbe: en es-LATAM el volumen es la peor señal disponible (ISSUE-152), y
 * además nada declara todavía si un candidato tiene que ver con el negocio (`TASK-1791`), así
 * que el más buscado puede ser el más ajeno. El alfabeto no le insinúa prioridad a nadie.
 *
 * En la banda 2 sí desempatan las impresiones: es demanda MEDIDA, sólo que sin curva para
 * convertirla en clics.
 */
export const compareWorkQueueItems = (a: SeoWorkQueueItemInput, b: SeoWorkQueueItemInput): number => {
  if (a.scoreBand !== b.scoreBand) return a.scoreBand - b.scoreBand

  if (a.scoreBand === 1) {
    const scoreDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0)

    if (scoreDiff !== 0) return scoreDiff
  }

  if (a.scoreBand === 2 && a.tieBreakImpressions !== b.tieBreakImpressions) {
    return b.tieBreakImpressions - a.tieBreakImpressions
  }

  return a.normalizedKeyword.localeCompare(b.normalizedKeyword)
}

/**
 * 🔴 PRECEDENCIA DE ACCIÓN entre orígenes, para deduplicar el SUJETO.
 *
 * La primera corrida real sobre berel.com dejó `pinturas` en el puesto #1 como `consolidate`
 * y en el #2 como `optimize`, con el MISMO score: el mismo sujeto, dos verbos contradictorios
 * pegados, y la cabeza de la cola a mitad de duplicados. Los dos hechos eran ciertos —la
 * query está canibalizada Y tiene brecha de citabilidad— pero una cola de trabajo que dice
 * dos cosas distintas sobre la misma keyword falla justo la pregunta que existe para
 * contestar: qué hago primero.
 *
 * Esto NO es promediar orígenes (eso sigue prohibido, y acá ningún score se mezcla): es
 * elegir QUÉ ACCIÓN se recomienda cuando varios motores señalan el mismo sujeto. El orden no
 * es de importancia sino de DEPENDENCIA entre acciones:
 *
 *   1. `consolidation` — es bloqueante. Empujar una keyword canibalizada es la acción
 *      equivocada: primero se fusiona, después se optimiza.
 *   2. `gsc_striking_distance` — demanda medida y a un empujón de la conversión.
 *   3. `declared_target` — compromiso humano vigente.
 *   4. `aeo_gap` — citabilidad; se trabaja sobre contenido que ya existe y ya rankea.
 *   5. `competitor_gap` — lente estimada del proveedor.
 *   6. `discovery_candidate` — estimado y todavía sin decidir.
 *
 * La BANDA manda por encima de la precedencia: deduplicar nunca puede enterrar un sujeto en
 * una banda peor de la que le corresponde por evidencia.
 */
export const ORIGIN_ACTION_PRECEDENCE: readonly SeoWorkQueueOrigin[] = [
  'consolidation',
  'gsc_striking_distance',
  'declared_target',
  'aeo_gap',
  'competitor_gap',
  'discovery_candidate'
]

const precedenceOf = (origin: SeoWorkQueueOrigin): number => {
  const index = ORIGIN_ACTION_PRECEDENCE.indexOf(origin)

  // Un origen nuevo que nadie agregó a la precedencia va al final en vez de al principio:
  // el default seguro es "no desplaza a nadie".
  return index === -1 ? ORIGIN_ACTION_PRECEDENCE.length : index
}

/**
 * Un sujeto = una fila = una decisión. Los orígenes suprimidos viajan en el breakdown.
 *
 * ⚠️ Sujeto es la keyword normalizada, NO `(origin, keyword)`. La UNIQUE de la tabla permite
 * la segunda forma a propósito —el esquema no debe impedir que dos motores hablen del mismo
 * término— pero el PLAN DEL DÍA se compone con la primera.
 */
export const dedupeBySubject = (items: readonly SeoWorkQueueItemInput[]): SeoWorkQueueItemInput[] => {
  const bySubject = new Map<string, SeoWorkQueueItemInput[]>()

  for (const item of items) {
    const bucket = bySubject.get(item.normalizedKeyword)

    if (bucket) bucket.push(item)
    else bySubject.set(item.normalizedKeyword, [item])
  }

  const winners: SeoWorkQueueItemInput[] = []

  for (const candidates of bySubject.values()) {
    if (candidates.length === 1) {
      winners.push(candidates[0]!)
      continue
    }

    const ranked = [...candidates].sort(
      (a, b) => a.scoreBand - b.scoreBand || precedenceOf(a.origin) - precedenceOf(b.origin)
    )

    const winner = ranked[0]!
    const suppressed = ranked.slice(1).map(item => ({ origin: item.origin, verb: item.recommendedVerb }))

    winners.push({
      ...winner,
      breakdown: {
        ...winner.breakdown,
        alsoSurfacedBy: suppressed,
        basisReason: `${winner.breakdown.basisReason} También lo señalan: ${suppressed
          .map(entry => `${entry.origin} (${entry.verb})`)
          .join(', ')}.`
      }
    })
  }

  return winners
}

/**
 * Hash de los insumos del snapshot.
 *
 * Se computa sobre lo que DECIDE el contenido —versión del score + la identidad y el score de
 * cada item— y no sobre un timestamp: si nada cambió, la corrida de mañana produce el mismo
 * hash y no escribe nada. Incluir la hora habría hecho que cada corrida fuera "distinta" y
 * la idempotencia sería decorativa.
 */
export const computeInputSnapshotHash = (
  version: string,
  items: readonly SeoWorkQueueItemInput[],
  originHealth: readonly SeoWorkQueueOriginHealth[] = []
): string => {
  const payload = items
    .map(item => `${item.origin}|${item.normalizedKeyword}|${item.scoreBasis}|${item.priorityScore ?? 'null'}`)
    .sort()
    .join('\n')

  /*
   * La salud entra al hash por `(origin, state, itemCount)` — y NO por `reason` ni `asOf`.
   *
   * Por qué entra: dos snapshots con los mismos items pero distinta salud NO son el mismo
   * hecho. Si un origen se cae y sus filas ya venían vacías, el plan es idéntico pero la
   * evidencia sobre su COMPLETITUD cambió, y un consumer que lee "origen X caído" necesita
   * que eso sea de hoy. Reusar ahí serviría una declaración de honestidad vencida.
   *
   * Por qué NO entran `reason` ni `asOf`: son redacción y relojes. Incluirlos haría que cada
   * corrida fuera "distinta" —`marketFreshness` y `latestRunAt` se mueven solos— y la
   * idempotencia quedaría decorativa, que es exactamente lo que se evitó no metiendo la hora.
   */
  const healthPayload = [...originHealth]
    .map(entry => `${entry.origin}|${entry.state}|${entry.itemCount}`)
    .sort()
    .join('\n')

  return createHash('sha256').update(`${version}\n${payload}\n${healthPayload}`).digest('hex')
}

const COLLECTORS: ReadonlyArray<{
  origin: SeoWorkQueueOrigin
  run: (ctx: SeoWorkQueueCollectorContext) => Promise<SeoWorkQueueCollectorResult>
}> = [
  { origin: 'gsc_striking_distance', run: collectGscStrikingDistance },
  { origin: 'consolidation', run: collectConsolidation },
  { origin: 'declared_target', run: collectDeclaredTargets },
  { origin: 'discovery_candidate', run: collectDiscoveryCandidates },
  { origin: 'aeo_gap', run: collectAeoGap },
  { origin: 'competitor_gap', run: collectCompetitorGap }
]

/** Última decisión por sujeto, para que los colectores no repropongan lo ya resuelto. */
const readLatestDecisions = async (seoTargetId: string): Promise<Map<string, SeoWorkQueueDecision>> => {
  const rows = await runGreenhousePostgresQuery<{
    origin: string
    normalized_keyword: string
    decision: string
  }>(
    `SELECT DISTINCT ON (origin, normalized_keyword) origin, normalized_keyword, decision
       FROM greenhouse_growth.seo_work_queue_decisions
      WHERE seo_target_id = $1
      ORDER BY origin, normalized_keyword, decided_at DESC`,
    [seoTargetId]
  )

  const map = new Map<string, SeoWorkQueueDecision>()

  for (const row of rows) {
    map.set(decisionKey(row.origin as SeoWorkQueueOrigin, row.normalized_keyword), row.decision as SeoWorkQueueDecision)
  }

  return map
}

/**
 * Aplica el techo por origen DECLARANDO el recorte.
 *
 * Un cap necesita un orden para decidir qué descarta, y ese orden es una afirmación de
 * prioridad encubierta: por eso trunca por el MISMO orden canónico. Y lo declara en la salud
 * del origen — un cap silencioso se lee como "esto es todo lo que hay".
 */
const applyOriginCap = (
  items: SeoWorkQueueItemInput[],
  health: SeoWorkQueueOriginHealth
): { items: SeoWorkQueueItemInput[]; health: SeoWorkQueueOriginHealth } => {
  const cap = WORK_QUEUE_RUNTIME_CONFIG.maxItemsPerOrigin

  if (items.length <= cap) return { items, health }

  const dropped = items.length - cap
  const kept = [...items].sort(compareWorkQueueItems).slice(0, cap)

  return {
    items: kept,
    health: {
      ...health,
      state: health.state === 'ok' ? 'degraded' : health.state,
      reason: `${health.reason ? `${health.reason.replace(/\.\s*$/, '')}. ` : ''}Techo de ${cap} filas por origen: quedaron ${dropped} fuera de este snapshot.`,
      itemCount: kept.length
    }
  }
}

export const materializeSeoWorkQueue = async (
  input: MaterializeSeoWorkQueueInput
): Promise<MaterializeSeoWorkQueueResult> => {
  const env = input.env ?? process.env
  const version = ACTIVE_PRIORITY_SCORE_VERSION
  const config = getPriorityScoreConfig(version)

  try {
    // Tenant binding server-side: el target define la org y TODO lo demás usa ESE org.
    // Nunca uno del request — es el anti-oracle del dominio.
    const targets = await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_growth.seo_targets WHERE seo_target_id = $1 AND status = 'active'`,
      [input.seoTargetId]
    )

    const organizationId = targets[0]?.organization_id

    if (!organizationId) {
      return { ok: false, errorCode: 'target_not_found', originHealth: [] }
    }

    // Piso de recomputación: devuelve el snapshot vigente en vez de rehacer el trabajo.
    if (!input.force) {
      const recent = await runGreenhousePostgresQuery<{
        snapshot_id: string
        item_count: number
        origin_health_json: SeoWorkQueueOriginHealth[]
      }>(
        `SELECT snapshot_id, item_count, origin_health_json
           FROM greenhouse_growth.seo_work_queue_snapshots
          WHERE seo_target_id = $1
            AND computed_at > NOW() - ($2::int * interval '1 minute')
          ORDER BY computed_at DESC
          LIMIT 1`,
        [input.seoTargetId, WORK_QUEUE_RUNTIME_CONFIG.minRecomputeIntervalMinutes]
      )

      const fresh = recent[0]

      if (fresh) {
        return {
          ok: true,
          snapshotId: fresh.snapshot_id,
          itemCount: Number(fresh.item_count),
          originHealth: fresh.origin_health_json ?? [],
          priorityScoreVersion: version,
          reused: true
        }
      }
    }

    const [curve, latestDecisions] = await Promise.all([
      readOrgCtrCurve(organizationId, config.windowDays),
      readLatestDecisions(input.seoTargetId)
    ])

    const ctx: SeoWorkQueueCollectorContext = {
      seoTargetId: input.seoTargetId,
      organizationId,
      curve,
      config,
      latestDecisions,
      env
    }

    // Aislamiento real: `allSettled`, no `all`. Un rechazo no tumba el plan del día.
    const settled = await Promise.allSettled(COLLECTORS.map(collector => collector.run(ctx)))

    const originHealth: SeoWorkQueueOriginHealth[] = []
    const allItems: SeoWorkQueueItemInput[] = []

    settled.forEach((outcome, index) => {
      const { origin } = COLLECTORS[index]!

      if (outcome.status === 'rejected') {
        // Un colector que LANZA en vez de degradar es un bug del colector, no del snapshot:
        // se contiene acá y se reporta a Sentry, pero el resto del plan sigue en pie.
        captureWithDomain(outcome.reason, 'growth', {
          tags: { source: 'seo_work_queue_collector' },
          extra: { origin, seoTargetId: input.seoTargetId }
        })

        originHealth.push(
          unhealthy(origin, 'down', 'El colector falló de forma inesperada; el origen queda fuera de este snapshot.')
        )

        return
      }

      const capped = applyOriginCap(outcome.value.items, outcome.value.health)

      originHealth.push(capped.health)
      allItems.push(...capped.items)
    })

    // Los SEIS orígenes viajan siempre declarados, aunque no aporten filas: la ausencia de
    // un origen en el reporte es indistinguible de un origen sano y vacío, y esa ambigüedad
    // es justo lo que `origin_health_json` existe para eliminar.
    for (const origin of WORK_QUEUE_ORIGINS) {
      if (!originHealth.some(entry => entry.origin === origin)) {
        originHealth.push(unhealthy(origin, 'down', 'El colector no reportó estado.'))
      }
    }

    // Si TODOS cayeron, no se escribe un snapshot vacío: un plan del día vacío es
    // indistinguible de "no hay trabajo", y eso sería una afirmación falsa.
    if (originHealth.every(entry => entry.state === 'down')) {
      return { ok: false, errorCode: 'all_origins_failed', originHealth }
    }

    // Deduplicar ANTES de ordenar y de hashear: el hash debe describir el plan que se
    // persiste, no el material crudo del que salió.
    const ordered = dedupeBySubject(allItems).sort(compareWorkQueueItems)
    const inputSnapshotHash = computeInputSnapshotHash(version, ordered, originHealth)

    // Idempotencia: mismos insumos ⇒ el snapshot ya existe ⇒ cero writes.
    const existing = await runGreenhousePostgresQuery<{ snapshot_id: string; item_count: number }>(
      `SELECT snapshot_id, item_count
         FROM greenhouse_growth.seo_work_queue_snapshots
        WHERE organization_id = $1 AND seo_target_id = $2
          AND priority_score_version = $3 AND input_snapshot_hash = $4`,
      [organizationId, input.seoTargetId, version, inputSnapshotHash]
    )

    if (existing[0]) {
      return {
        ok: true,
        snapshotId: existing[0].snapshot_id,
        itemCount: Number(existing[0].item_count),
        originHealth,
        priorityScoreVersion: version,
        reused: true
      }
    }

    const snapshotId = `seowqs-${randomUUID()}`

    await withTransaction(async client => {
      await client.query(
        `INSERT INTO greenhouse_growth.seo_work_queue_snapshots
           (snapshot_id, organization_id, seo_target_id, priority_score_version, input_snapshot_hash,
            window_days, origin_health_json, item_count, materialized_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9,
                 clock_timestamp() + ($10::int * interval '1 hour'))`,
        [
          snapshotId,
          organizationId,
          input.seoTargetId,
          version,
          inputSnapshotHash,
          config.windowDays,
          JSON.stringify(originHealth),
          ordered.length,
          input.actor,
          WORK_QUEUE_RUNTIME_CONFIG.snapshotTtlHours
        ]
      )

      for (const [index, item] of ordered.entries()) {
        await client.query(
          `INSERT INTO greenhouse_growth.seo_work_queue_items
             (snapshot_id, origin, normalized_keyword, target_url, recommended_verb,
              score_basis, score_band, priority_score, priority_score_version,
              score_breakdown_json, evidence_ref, source_score_version, rank_in_snapshot)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)`,
          [
            snapshotId,
            item.origin,
            item.normalizedKeyword,
            item.targetUrl,
            item.recommendedVerb,
            item.scoreBasis,
            item.scoreBand,
            item.priorityScore,
            version,
            JSON.stringify(item.breakdown),
            item.evidenceRef,
            item.sourceScoreVersion,
            index + 1
          ]
        )
      }
    })

    // El evento va DESPUÉS de la transacción a propósito: publicarlo adentro haría que un
    // consumer reactivo pudiera leer un snapshot que todavía no commiteó.
    await publishOutboxEvent({
      aggregateType: SEO_WORK_QUEUE_AGGREGATE_TYPE,
      aggregateId: input.seoTargetId,
      eventType: SEO_WORK_QUEUE_MATERIALIZED_EVENT,
      payload: {
        seoTargetId: input.seoTargetId,
        organizationId,
        snapshotId,
        priorityScoreVersion: version,
        itemCount: ordered.length,
        actor: input.actor
      }
    })

    return {
      ok: true,
      snapshotId,
      itemCount: ordered.length,
      originHealth,
      priorityScoreVersion: version,
      reused: false
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_work_queue_materialize' },
      extra: { seoTargetId: input.seoTargetId }
    })

    return { ok: false, errorCode: 'query_failed', originHealth: [] }
  }
}
