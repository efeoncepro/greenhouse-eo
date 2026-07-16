/**
 * TASK-1415 — Corrida REAL end-to-end del chapter-author de diagnóstico (run `EO-GRUN-00046`).
 *
 * Ejercita EXACTAMENTE el camino gobernado del motor (ningún atajo):
 *   1. Resuelve el run por public_id y lee el reporte con el reader canónico (`readGraderReport`).
 *   2. `deriveDiagnosticoFacts` — el mapper puro (cifras + evidenceRef desde el run; el hecho
 *      Semrush entra pre-evidenciado por el operador).
 *   3. `proposeChapter` — el LLM REAL (structured output, cliente canónico) enmarca los hechos;
 *      validación fail-closed.
 *   4. `confirmChapter` — actor member (la instrucción del operador ES la confirmación humana
 *      de esta corrida sanity; no persiste nada).
 *   5. `composeArtifact` — el composer renderiza las láminas reales (PNG + PDF) para revisión
 *      a ojo contra las del deck SKY.
 *
 * Uso: proxy 15432 activo + ANTHROPIC_API_KEY(_SECRET_REF) resolvible →
 *   TENDER_CHAPTER_AUTHOR_ENABLED=true GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= \
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/commercial/_sanity-diagnostico-chapter-author.ts [outDir]
 */
import fs from 'node:fs'
import path from 'node:path'

import { composeArtifact, type DeckPlan } from '@/lib/artifact-composer'
import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'
import { readGraderReport } from '@/lib/growth/ai-visibility/report/command'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { confirmChapter, proposeChapter } from '@/lib/commercial/tenders/proposals/authoring/chapter-author'
import { diagnosticoChapterAuthor } from '@/lib/commercial/tenders/proposals/authoring/diagnostico-chapter-author'
import type { DiagnosticoSource } from '@/lib/commercial/tenders/proposals/authoring/diagnostico-facts'

const RUN_PUBLIC_ID = 'EO-GRUN-00046'

const main = async () => {
  const outDir = process.argv[2] ?? path.join(process.cwd(), '.captures', 'task-1415-diagnostico-sanity')

  const rows = await runGreenhousePostgresQuery<{ run_id: string }>(
    `SELECT run_id FROM greenhouse_growth.grader_runs WHERE public_id = $1`,
    [RUN_PUBLIC_ID]
  )

  if (rows.length === 0) throw new Error(`run ${RUN_PUBLIC_ID} no encontrado`)

  const { report } = await readGraderReport({ runId: rows[0].run_id })

  const source: DiagnosticoSource = {
    runPublicId: RUN_PUBLIC_ID,
    brandName: 'SKY Airline',
    publicReportUrl:
      'https://think.efeoncepro.com/brand-visibility/r/grt-9892e5684c394557a63f8171926871c26d3278216daf42a2a8100951ccb5537f',
    report,
    operatorFacts: [
      {
        factId: 'goal.organic-traffic',
        label: 'Visitas orgánicas mensuales del blog',
        value: '~40.000',
        evidenceRef: 'Semrush · database CL · 2026-07-11'
      }
    ]
  }

  console.log('→ propose (LLM real, structured output)…')

  const { proposal, trace } = await proposeChapter(diagnosticoChapterAuthor, {
    source,
    operatorBrief:
      'Propuesta SKY Blog 2026 (proceso Wherex). Capítulo de diagnóstico: tesis = la IA conoce a SKY ' +
      'pero su contenido propio no está en la respuesta; el blog ya trae tráfico (activo desaprovechado). ' +
      'Tono institucional formal, sobrio; el comité se trata de usted.'
  })

  console.log('\n── framing propuesto ──')
  console.log(JSON.stringify(proposal.framing, null, 2))
  console.log('\ntrace:', trace)

  const confirmed = confirmChapter(diagnosticoChapterAuthor, {
    proposal,
    trace,
    // La instrucción del operador (corrida sanity solicitada en TASK-1415) es la confirmación
    // humana de ESTA corrida; nada se persiste — el output es un render local de revisión.
    actor: { kind: 'member', memberId: 'julio-reyes' }
  })

  console.log('\nidempotencyKey:', confirmed.idempotencyKey)

  fs.mkdirSync(outDir, { recursive: true })

  const plan = {
    tenderId: 'task-1415-diagnostico-sanity',
    slides: confirmed.slides
  } as unknown as DeckPlan // plan canónico sin `template`: el selector del composer lo asigna

  console.log('\n→ composeArtifact (render real)…')

  const result = await composeArtifact(deckAxisCatalog, plan, outDir)

  console.log(JSON.stringify(result, null, 2))
  console.log(`\nRevisión a ojo: ${outDir}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
