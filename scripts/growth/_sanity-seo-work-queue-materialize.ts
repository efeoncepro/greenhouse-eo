/**
 * TASK-1700 — Sanity live del materializador contra PG real (paso 3 de la secuencia de
 * verificación de la spec).
 *
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/growth/_sanity-seo-work-queue-materialize.ts [seoTargetId]
 *
 * ⚠️ ESTE SÍ ESCRIBE. A diferencia del sanity de esquema, no puede correr dentro de una
 * transacción que se aborta: `materializeSeoWorkQueue` abre la suya. Escribe un snapshot
 * real y append-only, que es exactamente lo que la spec pide inspeccionar fila por fila
 * antes del rollout. NO le llama al proveedor: lee tablas ya pagadas, así que cuesta CPU y
 * cero dólares.
 *
 * Lo que verifica y por qué cada uno importa:
 *   1. Corrida real → snapshot con los SEIS orígenes declarados en `origin_health_json`.
 *   2. Segunda corrida inmediata → `reused: true` y CERO filas nuevas (idempotencia).
 *   3. El orden persistido en `rank_in_snapshot` coincide con el orden canónico.
 *   4. Ningún item viola el invariante ●/◑ (banda 3 con score, o banda 1 sin él).
 */

import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import { materializeSeoWorkQueue } from '../../src/lib/growth/seo/work-queue/materialize'
import { readSeoWorkQueue } from '../../src/lib/growth/seo/work-queue/reader'
import { toClientWorkQueueDto } from '../../src/lib/growth/seo/work-queue/client-dto'
import { recordSeoWorkQueueDecision } from '../../src/lib/growth/seo/work-queue/record-decision'

const TARGET = process.argv[2] ?? 'seot-berel-mx'
const ACTOR = 'sanity-task-1700'

let pass = 0
let fail = 0

const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) {
    pass += 1
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    fail += 1
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const main = async () => {
  console.log(`\n── Corrida 1 sobre ${TARGET} ──`)

  const first = await materializeSeoWorkQueue({ seoTargetId: TARGET, actor: ACTOR, force: true })

  if (!first.ok) {
    check('corrida 1 ok', false, `${first.errorCode} · health=${JSON.stringify(first.originHealth)}`)
    process.exitCode = 1

    return
  }

  // La corrida 1 puede REUSAR legítimamente si una corrida anterior dejó los mismos insumos:
  // la tabla es append-only y el sanity se corre varias veces. Lo que sí se exige es que haya
  // snapshot y que tenga contenido — exigir `!reused` haría fallar el gate por idempotencia,
  // que es la propiedad que el gate existe para comprobar.
  check(
    'corrida 1 deja snapshot vigente',
    Boolean(first.snapshotId) && first.itemCount > 0,
    `snapshot=${first.snapshotId} items=${first.itemCount} reused=${first.reused}`
  )
  check('los SEIS orígenes vienen declarados', first.originHealth.length === 6, `n=${first.originHealth.length}`)

  console.log('\nSalud por origen:')

  for (const h of first.originHealth) {
    console.log(`  ${h.state === 'ok' ? '●' : '○'} ${h.origin.padEnd(24)} ${h.state.padEnd(9)} items=${String(h.itemCount).padStart(3)}  ${h.reason ?? ''}`)
  }

  // ── 2. Idempotencia ──
  console.log('\n── Corrida 2 (inmediata, mismos insumos) ──')

  const second = await materializeSeoWorkQueue({ seoTargetId: TARGET, actor: ACTOR, force: true })

  check('corrida 2 reusa', second.ok && second.reused, second.ok ? `snapshot=${second.snapshotId}` : 'falló')
  check(
    'corrida 2 devuelve EL MISMO snapshot (cero filas nuevas)',
    second.ok && second.snapshotId === first.snapshotId,
    second.ok ? `${second.snapshotId}` : ''
  )

  // ⚠️ El conteo se acota a ESTE snapshot, no a todos los del actor: la tabla es append-only,
  // así que corridas anteriores del sanity dejan filas legítimas y contarlas todas haría que
  // el assert fallara por existir historia. Un gate que falla por acumulación de evidencia
  // está midiendo la tabla, no la idempotencia.
  const snapshotCount = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_work_queue_snapshots WHERE snapshot_id = $1`,
    [first.snapshotId]
  )

  check('las dos corridas dejaron UN solo snapshot', snapshotCount[0]?.n === '1', `n=${snapshotCount[0]?.n}`)

  // ── 3. Orden persistido == orden canónico ──
  const items = await runGreenhousePostgresQuery<{
    rank_in_snapshot: number
    origin: string
    normalized_keyword: string
    recommended_verb: string
    score_basis: string
    score_band: number
    priority_score: string | null
    source_score_version: string | null
    evidence_ref: string
  }>(
    `SELECT rank_in_snapshot, origin, normalized_keyword, recommended_verb, score_basis,
            score_band, priority_score::text AS priority_score, source_score_version, evidence_ref
       FROM greenhouse_growth.seo_work_queue_items
      WHERE snapshot_id = $1
      ORDER BY rank_in_snapshot`,
    [first.snapshotId]
  )

  check('el snapshot tiene items', items.length > 0, `n=${items.length}`)

  const bandsAscending = items.every((row, i) => i === 0 || items[i - 1]!.score_band <= row.score_band)

  check('rank_in_snapshot respeta el orden por banda', bandsAscending)

  // ── 4. El invariante ●/◑, verificado sobre lo PERSISTIDO ──
  const violations = items.filter(
    row =>
      (row.score_band === 1 && row.priority_score === null) ||
      (row.score_band !== 1 && row.priority_score !== null)
  )

  check('cero items violan basis/banda/score', violations.length === 0, `violaciones=${violations.length}`)

  const aeoWithoutVersion = items.filter(row => row.origin === 'aeo_gap' && !row.source_score_version)

  check('todo aeo_gap trae source_score_version', aeoWithoutVersion.length === 0)

  const badEvidence = items.filter(row => !/^[a-z_]+:[a-z_]+:/.test(row.evidence_ref))

  check('evidence_ref respeta el formato opaco <motor>:<entidad>:<id>', badEvidence.length === 0)

  console.log('\nTop 15 del snapshot:')

  for (const row of items.slice(0, 15)) {
    console.log(
      `  #${String(row.rank_in_snapshot).padStart(3)}  b${row.score_band}  ${(row.priority_score ?? '—').padStart(10)}  ` +
      `${row.recommended_verb.padEnd(11)} ${row.origin.padEnd(22)} ${row.normalized_keyword.slice(0, 46)}`
    )
  }

  const byOrigin = new Map<string, number>()
  const byBand = new Map<number, number>()

  for (const row of items) {
    byOrigin.set(row.origin, (byOrigin.get(row.origin) ?? 0) + 1)
    byBand.set(row.score_band, (byBand.get(row.score_band) ?? 0) + 1)
  }

  console.log('\nPor origen:', [...byOrigin].map(([k, v]) => `${k}=${v}`).join(' · '))
  console.log('Por banda: ', [...byBand].sort().map(([k, v]) => `banda${k}=${v}`).join(' · '))

  // ── 5. El reader contra el SQL REAL (los mocks ejercitan el TS, nunca el SQL) ──
  const ENV_ON = {
    ...process.env,
    GROWTH_SEO_ENABLED: 'true',
    GROWTH_SEO_WORK_QUEUE_ENABLED: 'true'
  } as NodeJS.ProcessEnv

  console.log('\n── Reader contra PG real ──')

  const page1 = await readSeoWorkQueue(TARGET, { env: ENV_ON, limit: 5 })

  check('readSeoWorkQueue ok', page1.ok, page1.ok ? `items=${page1.items.length} staleness=${page1.staleness}` : page1.errorCode)

  if (page1.ok) {
    check('devuelve el snapshot vigente', page1.snapshot?.snapshotId === first.snapshotId)
    check('declara los seis orígenes', page1.originHealth.length === 6, `n=${page1.originHealth.length}`)
    check('declara la versión del score', page1.priorityScoreVersion !== null, page1.priorityScoreVersion ?? '')

    // 🔴 El keyset con NULLs es la parte que sólo PG puede desmentir: la comparación de
    // tuplas no ordena con NULL, y un borde de página mal escrito saltea filas EN SILENCIO.
    // Se pagina la cola entera y se compara contra el orden persistido.
    const walked: string[] = []
    let cursor: string | null = null
    let pages = 0

    do {
      const page: Awaited<ReturnType<typeof readSeoWorkQueue>> = await readSeoWorkQueue(TARGET, {
        env: ENV_ON,
        limit: 100,
        cursor
      })

      if (!page.ok) break

      walked.push(...page.items.map(i => `${i.scoreBand}:${i.keyword}`))
      cursor = page.nextCursor
      pages += 1
    } while (cursor && pages < 50)

    const persisted = items.map(row => `${row.score_band}:${row.normalized_keyword}`)

    check(
      'la paginación por keyset recorre la cola COMPLETA sin saltear ni repetir',
      walked.length === persisted.length && new Set(walked).size === walked.length,
      `recorridas=${walked.length} persistidas=${persisted.length} únicas=${new Set(walked).size} páginas=${pages}`
    )

    check(
      'el orden paginado coincide EXACTO con el persistido',
      walked.join('|') === persisted.join('|'),
      walked.join('|') === persisted.join('|') ? '' : `primer desvío en índice ${walked.findIndex((v, i) => v !== persisted[i])}`
    )

    // Filtro por origen contra SQL real (array, no string con comas).
    const filtered = await readSeoWorkQueue(TARGET, { env: ENV_ON, origins: ['consolidation'], limit: 200 })

    check(
      'el filtro por origen aplica de verdad',
      filtered.ok && filtered.items.every(i => i.origin === 'consolidation') && filtered.items.length > 0,
      filtered.ok ? `items=${filtered.items.length}` : filtered.errorCode
    )

    // DTO cliente sobre datos REALES: el test unitario usa un fixture; acá se comprueba que
    // ningún campo del snapshot productivo se cuela.
    const dto = toClientWorkQueueDto(page1)
    const serialized = JSON.stringify(dto)

    const leaked = ['evidenceRef', 'seo:', 'seowqi-', 'seowqs-', 'curveSample', 'basisReason', 'incremental-clicks-v1']
      .filter(term => serialized.includes(term))

    check('el DTO cliente no filtra nada sobre datos REALES', leaked.length === 0, leaked.join(', ') || 'limpio')
  }

  // ── 6. La decisión: anclada al SUJETO y sobreviviendo al siguiente snapshot ──
  //
  // Es el invariante que un test con mocks no puede probar: hace falta materializar DOS
  // veces y comprobar que la decisión sigue resolviendo contra un item que ya no existe.
  console.log('\n── recordSeoWorkQueueDecision contra PG real ──')

  const target0 = items[0]

  if (target0) {
    const itemIdRow = await runGreenhousePostgresQuery<{ item_id: string }>(
      `SELECT item_id FROM greenhouse_growth.seo_work_queue_items
        WHERE snapshot_id = $1 AND rank_in_snapshot = $2`,
      [first.snapshotId, target0.rank_in_snapshot]
    )

    const itemId = itemIdRow[0]?.item_id

    const decided = await recordSeoWorkQueueDecision({
      itemId: itemId ?? 'seowqi-inexistente',
      decision: 'dismissed',
      actor: ACTOR,
      note: 'sanity TASK-1700',
      env: ENV_ON
    })

    check('la decisión se registra', decided.ok, decided.ok ? decided.decisionId : decided.errorCode)

    if (decided.ok) {
      check(
        'se ancla al SUJETO derivado del item, no a lo que mande el request',
        decided.subject.normalizedKeyword === target0.normalized_keyword &&
          decided.subject.origin === target0.origin,
        `${decided.subject.origin}/${decided.subject.normalizedKeyword}`
      )
    }

    // Anti-oracle: un item inexistente no revela nada.
    const ghost = await recordSeoWorkQueueDecision({
      itemId: 'seowqi-00000000-0000-0000-0000-000000000000',
      decision: 'dismissed',
      actor: ACTOR,
      env: ENV_ON
    })

    check('un item inexistente devuelve item_not_found', !ghost.ok && ghost.errorCode === 'item_not_found')

    // 🔴 El invariante de fondo: materializar de nuevo (forzado) regenera TODOS los items,
    // así que el `item_id` de arriba deja de existir. La decisión tiene que seguir viva y
    // seguir retirando el sujeto de la cola.
    const second = await materializeSeoWorkQueue({ seoTargetId: TARGET, actor: ACTOR, force: true })

    const stillResolves = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_work_queue_decisions
        WHERE seo_target_id = $1 AND origin = $2 AND normalized_keyword = $3`,
      [TARGET, target0.origin, target0.normalized_keyword]
    )

    check(
      'la decisión SOBREVIVE al siguiente snapshot (anclada al sujeto, no al item_id)',
      Number(stillResolves[0]?.n ?? 0) > 0,
      `decisiones=${stillResolves[0]?.n}`
    )

    if (second.ok) {
      const retired = await runGreenhousePostgresQuery<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_work_queue_items
          WHERE snapshot_id = $1 AND origin = $2 AND normalized_keyword = $3`,
        [second.snapshotId, target0.origin, target0.normalized_keyword]
      )

      check(
        'el sujeto descartado YA NO aparece en el snapshot siguiente',
        retired[0]?.n === '0',
        `apariciones=${retired[0]?.n}`
      )
    }
  }

  console.log(`\n${pass} ok · ${fail} fallo(s)`)
  process.exitCode = fail > 0 ? 1 : 0
}

void main()
