/**
 * TASK-1700 — Revierte el residuo de decisiones que dejó `_sanity-seo-work-queue-materialize.ts`
 * en producción.
 *
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/growth/_revert-sanity-work-queue-decisions.ts [--apply]
 *
 * ═══ Por qué existe y por qué NO borra ═══
 *
 * El sanity escribía sus INSERT de snapshot dentro de una transacción que abortaba —cero
 * residuo, verificado— pero el bloque de decisiones corría contra el pool A PROPÓSITO, para
 * demostrar que una decisión sobrevive al snapshot siguiente. Lo demostró: cinco `dismissed`
 * quedaron retirando de la cola de `berel.com` sus tres mayores oportunidades (`pinturas`
 * 72,14 clics · `sellador` 59,63 · `removedor de pintura` 43,99), y lo iban a seguir haciendo
 * en cada snapshot futuro.
 *
 * 🔴 **NO se borra.** `seo_work_queue_decisions` es append-only por diseño y su trigger lo
 * impone: borrar falsearía el ledger de qué se decidió y cuándo, que es justo lo que ese
 * diseño existe para impedir. La corrección es una decisión NUEVA que supersede — el colector
 * lee la última por sujeto (`DISTINCT ON … ORDER BY decided_at DESC`) y `deferred` no es
 * terminal, así que devuelve el sujeto a la cola conservando el historial completo.
 *
 * Se usa el command canónico `recordSeoWorkQueueDecision`, nunca un INSERT a mano, y cada
 * reversión apunta al MISMO `item_id` que registró el descarte original: así la evidencia de
 * las dos filas es la misma y el par se lee junto.
 */

import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import { recordSeoWorkQueueDecision } from '../../src/lib/growth/seo/work-queue/record-decision'

const APPLY = process.argv.includes('--apply')
const ACTOR = 'revert-sanity-task-1700'
const RESIDUE_ACTOR = 'sanity-task-1700'

const NOTE =
  'Revierte residuo de prueba: el script _sanity-seo-work-queue-materialize.ts escribió este ' +
  'dismissed contra el pool para demostrar que una decisión sobrevive al snapshot siguiente. ' +
  'No fue una decisión de negocio y estaba retirando de la cola una oportunidad real.'

const ENV = {
  ...process.env,
  GROWTH_SEO_ENABLED: 'true',
  GROWTH_SEO_WORK_QUEUE_ENABLED: 'true'
} as NodeJS.ProcessEnv

const main = async () => {
  const residue = await runGreenhousePostgresQuery<{
    decision_id: string
    origin: string
    normalized_keyword: string
    item_id: string | null
    decided_at: Date
  }>(
    `SELECT decision_id, origin, normalized_keyword, item_id, decided_at
       FROM greenhouse_growth.seo_work_queue_decisions
      WHERE decided_by = $1
      ORDER BY decided_at`,
    [RESIDUE_ACTOR]
  )

  console.log(`Residuo encontrado: ${residue.length} decisión(es) de \`${RESIDUE_ACTOR}\`\n`)

  // Sólo se revierte lo que HOY sigue retirando el sujeto: si el operador ya decidió algo
  // encima, su decisión manda y no se pisa.
  let reverted = 0
  let skipped = 0

  for (const row of residue) {
    const latest = await runGreenhousePostgresQuery<{ decision: string; decided_by: string }>(
      `SELECT decision, decided_by
         FROM greenhouse_growth.seo_work_queue_decisions
        WHERE seo_target_id = (SELECT seo_target_id FROM greenhouse_growth.seo_work_queue_decisions WHERE decision_id = $1)
          AND origin = $2 AND normalized_keyword = $3
        ORDER BY decided_at DESC
        LIMIT 1`,
      [row.decision_id, row.origin, row.normalized_keyword]
    )

    const current = latest[0]
    const label = `${row.origin}/"${row.normalized_keyword}"`

    if (!current || current.decided_by !== RESIDUE_ACTOR) {
      console.log(`  ⏭  ${label} — la última decisión es de \`${current?.decided_by}\`; no se pisa`)
      skipped += 1
      continue
    }

    if (!row.item_id) {
      console.log(`  ⚠️  ${label} — sin item_id; el command lo necesita para derivar el sujeto`)
      skipped += 1
      continue
    }

    if (!APPLY) {
      console.log(`  →  ${label} — se escribiría \`deferred\` sobre item ${row.item_id}`)
      reverted += 1
      continue
    }

    const result = await recordSeoWorkQueueDecision({
      itemId: row.item_id,
      decision: 'deferred',
      actor: ACTOR,
      note: NOTE,
      env: ENV
    })

    if (result.ok) {
      console.log(`  ✓  ${label} — revertido (${result.decisionId})`)
      reverted += 1
    } else {
      console.error(`  ✗  ${label} — ${result.errorCode}`)
      skipped += 1
    }
  }

  console.log(`\n${APPLY ? 'Revertidas' : 'Se revertirían'}: ${reverted} · omitidas: ${skipped}`)

  if (!APPLY) console.log('\n(dry-run — volver a correr con --apply para escribir)')
}

void main()
