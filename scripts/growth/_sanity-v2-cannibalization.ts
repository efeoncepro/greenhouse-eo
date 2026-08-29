/**
 * TASK-1700 v2 — Sanity live del predicado de canibalización contra PG real.
 *
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/growth/_sanity-v2-cannibalization.ts
 *
 * SOLO LEE: cero writes, cero llamadas al proveedor, cero dólares.
 *
 * Existe porque los unit tests mockean la base y por lo tanto **no ejercitan el SQL**. Las
 * dos consultas de este cambio (el CTE de páginas fusionables y las columnas aditivas del
 * reader legacy) sólo se prueban corriéndolas. Y porque el efecto del predicado es una
 * afirmación sobre una POBLACIÓN —"v1 llamaba canibalizadas 400, v2 llama 11"— que no se
 * puede sostener con fixtures.
 *
 * Compara v1 contra v2 sobre el mismo insumo y reconstruye el tamaño de la lente que ve el
 * operador. ⚠️ Esa reconstrucción es aproximada: reimplementa el recorte del adapter y el cap
 * del materializador en vez de llamarlos. Sirve para ver el ORDEN DE MAGNITUD del cambio, no
 * como cifra exacta de pantalla.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { SEO_WORK_QUEUE_CONSOLIDATION_SQL } from '@/lib/growth/seo/work-queue/collectors/consolidation'
import { SEO_KEYWORD_OPPORTUNITIES_SQL } from '@/lib/growth/seo/keyword-opportunities-reader'
import { deriveBrandToken, evaluateCannibalization } from '@/lib/growth/seo/work-queue/cannibalization'
import { getPriorityScoreConfig } from '@/lib/growth/seo/work-queue/score-versions'

const ORG = 'org-32333527-02a8-487b-819e-6f76a761777d'
const V2 = getPriorityScoreConfig('incremental-clicks-v2')
const V1 = getPriorityScoreConfig('incremental-clicks-v1')

const main = async () => {
  const brandToken = deriveBrandToken('berel.com')

  console.log(`etiqueta de marca: ${brandToken}\n`)

  // ── SQL 1: consolidación (el que estrena main_page_impressions) ──────────
  const cons = await runGreenhousePostgresQuery<Record<string, string>>(SEO_WORK_QUEUE_CONSOLIDATION_SQL, [ORG, 28, 100, 400])

  console.log(`consolidación SQL: ${cons.length} filas, total sobre umbral ${cons[0]?.total_over_threshold}`)
  console.log(`  columnas: ${Object.keys(cons[0] ?? {}).join(', ')}\n`)

  let v1Yes = 0, v2Yes = 0, marca = 0

  for (const r of cons) {
    const inp = {
      normalizedKeyword: String(r.keyword).toLowerCase(),
      competingPages: Number(r.content_competing_pages ?? r.competing_pages),
      mainPageImpressions: Number(r.main_page_impressions),
      totalImpressions: Number(r.total_page_impressions ?? r.impressions),
      brandToken
    }

    if (evaluateCannibalization(inp, V1).cannibalized) v1Yes++
    const v = evaluateCannibalization(inp, V2)

    if (v.cannibalized) v2Yes++
    if (v.isBrand) marca++
  }

  console.log(`sobre esas ${cons.length} candidatas multi-página:`)
  console.log(`  v1 las llamaba canibalizadas : ${v1Yes}`)
  console.log(`  v2 las llama canibalizadas   : ${v2Yes}`)
  console.log(`  de marca                     : ${marca}\n`)

  console.log('top 5 por demanda — veredicto de cada versión:')

  for (const r of cons.slice(0, 5)) {
    const inp = { normalizedKeyword: String(r.keyword).toLowerCase(), competingPages: Number(r.content_competing_pages ?? r.competing_pages), mainPageImpressions: Number(r.main_page_impressions), totalImpressions: Number(r.total_page_impressions ?? r.impressions), brandToken }
    const v = evaluateCannibalization(inp, V2)
    const share = v.mainPageShare === null ? 'n/d' : `${(v.mainPageShare * 100).toFixed(1)}%`

    console.log(`  "${r.keyword}" — ${r.competing_pages} pág, principal ${share}, marca=${v.isBrand ? 'sí' : 'no'} → v1=consolidar / v2=${v.cannibalized ? 'consolidar' : 'OPTIMIZAR'}`)
  }

  // ── SQL 2: reader legacy (columna aditiva) ───────────────────────────────
  const opp = await runGreenhousePostgresQuery<Record<string, string>>(SEO_KEYWORD_OPPORTUNITIES_SQL, [ORG, 28, 8, 20, 100, 600])

  console.log(`\nreader legacy SQL: ${opp.length} filas`)
  console.log(`  columnas: ${Object.keys(opp[0] ?? {}).join(', ')}`)
  const conShare = opp.filter((r: Record<string, string>) => r.main_page_impressions != null).length

  console.log(`  filas con main_page_impressions no nulo: ${conShare}/${opp.length}`)

  let excl1 = 0, excl2 = 0

  for (const r of opp) {
    const inp = { normalizedKeyword: String(r.keyword).toLowerCase(), competingPages: Number(r.content_competing_pages ?? r.competing_pages), mainPageImpressions: Number(r.main_page_impressions), totalImpressions: Number(r.total_page_impressions ?? r.impressions), brandToken }

    if (evaluateCannibalization(inp, V1).cannibalized) excl1++
    if (evaluateCannibalization(inp, V2).cannibalized) excl2++
  }

  console.log(`\nstriking-distance (8–20), de ${opp.length} filas:`)
  console.log(`  v1 excluía por canibalización: ${excl1}  → quedaban ${opp.length - excl1}`)
  console.log('\ntamaño de la LENTE que ve el operador (adapter, ventana 8–20):')
  console.log(`  v2 excluye                   : ${excl2}  → quedan ${opp.length - excl2}`)
}

const lensSize = async () => {
  const brandToken = deriveBrandToken('berel.com')
  const inWindow = (p: number) => p >= 8 && p <= 20

  const opp = await runGreenhousePostgresQuery<Record<string, string>>(SEO_KEYWORD_OPPORTUNITIES_SQL, [ORG, 28, 8, 20, 100, 600])
  const cons = await runGreenhousePostgresQuery<Record<string, string>>(SEO_WORK_QUEUE_CONSOLIDATION_SQL, [ORG, 28, 100, 400])

  for (const [label, cfg] of [['v1', V1], ['v2', V2]] as const) {
    const inp = (r: Record<string, string>) => ({
      normalizedKeyword: String(r.keyword).toLowerCase(),
      competingPages: Number(r.content_competing_pages ?? r.competing_pages),
      mainPageImpressions: Number(r.main_page_impressions),
      totalImpressions: Number(r.total_page_impressions ?? r.impressions),
      brandToken
    })

    const striking = opp.filter((r: Record<string, string>) => !evaluateCannibalization(inp(r), cfg).cannibalized)

    // El materializador ordena por demanda y recorta a 200 por origen.
    const consItems = cons
      .filter((r: Record<string, string>) => evaluateCannibalization(inp(r), cfg).cannibalized)
      .slice(0, 200)
      .filter((r: Record<string, string>) => inWindow(Number(r.weighted_position)))

    const subjects = new Set<string>([
      ...striking.map((r: Record<string, string>) => String(r.keyword).toLowerCase()),
      ...consItems.map((r: Record<string, string>) => String(r.keyword).toLowerCase())
    ])

    console.log(`  ${label}: ${striking.length} striking + ${consItems.length} consolidación en ventana = ${subjects.size} sujetos únicos`)
  }

  console.log(`  legacy (lo que el operador veía antes del cutover): ${opp.length}`)
}

main().then(lensSize).then(() => process.exit(0)).catch(e => { console.error('FALLÓ:', e.message); process.exit(1) })
