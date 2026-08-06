/**
 * TASK-1303 — seed del keyword set de rank tracking de Berel (Fase 0).
 * Fuente: top queries MEDIDAS en GSC (demanda real), mezcla marca + striking distance.
 * Config (mutable con vigencia), NO medición: sembrar acá es el paso operativo del
 * runbook; cerrar una keyword después = UPDATE de effective_to, nunca DELETE.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const TARGET_ID = 'seot-berel-fase0'
const SET_NAME = 'Rank tracking v1 (GSC top medidas)'

const KEYWORDS: Array<{ keyword: string; tags: string[] }> = [
  { keyword: 'berel', tags: ['brand'] },
  { keyword: 'pinturas berel', tags: ['brand'] },
  { keyword: 'pintura berel', tags: ['brand'] },
  { keyword: 'pinturas berel precios', tags: ['brand', 'striking-distance'] },
  { keyword: 'pinturas', tags: ['non-brand', 'striking-distance'] },
  { keyword: 'pintura para madera', tags: ['non-brand', 'striking-distance'] },
  { keyword: 'pintura para alberca', tags: ['non-brand', 'striking-distance'] },
  { keyword: 'pintura para casa', tags: ['non-brand'] }
]

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const target = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT seo_target_id, organization_id, root_domain, location_code, language_code, market, status
       FROM greenhouse_growth.seo_targets WHERE seo_target_id = $1`,
    [TARGET_ID]
  )

  console.log('[target]', JSON.stringify(target[0]))

  const setRows = await runGreenhousePostgresQuery<{ keyword_set_id: string }>(
    `INSERT INTO greenhouse_growth.seo_keyword_sets (seo_target_id, name)
     VALUES ($1, $2)
     ON CONFLICT (seo_target_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING keyword_set_id`,
    [TARGET_ID, SET_NAME]
  )

  const keywordSetId = setRows[0].keyword_set_id

  console.log('[set]', keywordSetId)

  let inserted = 0

  for (const entry of KEYWORDS) {
    const rows = await runGreenhousePostgresQuery<{ keyword_set_member_id: string }>(
      `INSERT INTO greenhouse_growth.seo_keyword_set_members (keyword_set_id, keyword, tags)
       VALUES ($1, $2, $3)
       ON CONFLICT (keyword_set_id, keyword) WHERE effective_to IS NULL DO NOTHING
       RETURNING keyword_set_member_id`,
      [keywordSetId, entry.keyword, entry.tags]
    )

    if (rows.length > 0) inserted += 1
  }

  const vigentes = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM greenhouse_growth.seo_keyword_set_members m
       JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
      WHERE s.seo_target_id = $1 AND m.effective_to IS NULL`,
    [TARGET_ID]
  )

  console.log(`[seed] insertadas=${inserted} vigentes_total=${vigentes[0].n}`)
  process.exit(0)
}

main().catch(e => { console.error('SEED FAILED:', e); process.exit(1) })
