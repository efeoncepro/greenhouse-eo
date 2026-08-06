/**
 * TASK-1303 — expansión de keyword sets con demanda MEDIDA (top queries GSC por
 * impresiones, piso estadístico). Berel: top 30 · Efeonce: top 15. Config con vigencia;
 * lo ya sembrado se conserva (ON CONFLICT DO NOTHING sobre la membership vigente).
 * La curación fina (términos de marca/competencia no medidos aún) sigue siendo trabajo
 * de consultoría — esto garantiza que la serie acumule desde hoy sobre demanda real.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const PLANS = [
  { targetId: 'seot-berel-fase0', setName: 'Rank tracking v1 (GSC top medidas)', topN: 30, minImpressions: 100 },
  { targetId: 'seot-efeonce-own-brand', setName: 'Rank tracking v1 (GSC top medidas)', topN: 15, minImpressions: 1 }
]

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  for (const plan of PLANS) {
    const candidates = await runGreenhousePostgresQuery<{ query: string; impressions: number }>(
      `SELECT g.query, SUM(g.impressions)::int AS impressions
         FROM greenhouse_growth.seo_gsc_daily g
         JOIN greenhouse_growth.seo_targets t ON t.organization_id = g.organization_id
        WHERE t.seo_target_id = $1
        GROUP BY g.query
        HAVING SUM(g.impressions) >= $2
        ORDER BY SUM(g.impressions) DESC
        LIMIT $3`,
      [plan.targetId, plan.minImpressions, plan.topN]
    )

    if (candidates.length === 0) {
      console.log(`[${plan.targetId}] sin queries GSC sobre el piso — nada que sembrar`)
      continue
    }

    const setRows = await runGreenhousePostgresQuery<{ keyword_set_id: string }>(
      `INSERT INTO greenhouse_growth.seo_keyword_sets (seo_target_id, name)
       VALUES ($1, $2)
       ON CONFLICT (seo_target_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING keyword_set_id`,
      [plan.targetId, plan.setName]
    )

    const keywordSetId = setRows[0].keyword_set_id
    let inserted = 0

    for (const candidate of candidates) {
      const rows = await runGreenhousePostgresQuery<{ keyword_set_member_id: string }>(
        `INSERT INTO greenhouse_growth.seo_keyword_set_members (keyword_set_id, keyword, tags)
         VALUES ($1, $2, $3)
         ON CONFLICT (keyword_set_id, keyword) WHERE effective_to IS NULL DO NOTHING
         RETURNING keyword_set_member_id`,
        [keywordSetId, candidate.query, ['gsc-top']]
      )

      if (rows.length > 0) inserted += 1
    }

    const vigentes = await runGreenhousePostgresQuery<{ n: number }>(
      `SELECT COUNT(*)::int AS n
         FROM greenhouse_growth.seo_keyword_set_members m
         JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
        WHERE s.seo_target_id = $1 AND m.effective_to IS NULL`,
      [plan.targetId]
    )

    console.log(`[${plan.targetId}] candidatas=${candidates.length} nuevas=${inserted} vigentes_total=${vigentes[0].n}`)
  }

  process.exit(0)
}

main().catch(e => { console.error('SEED FAILED:', e); process.exit(1) })
