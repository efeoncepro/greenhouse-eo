import process from 'node:process'
import { createHash, randomUUID } from 'node:crypto'

import {
  buildAutoCampaignSeedCandidates,
  type CampaignSeedCandidate,
  type DeliveryProjectSeedSource
} from '@/lib/campaigns/backfill-heuristics'

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('migrator')

const MANUAL_SEEDS = [
  {
    spaceId: 'spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9',
    displayName: 'Sky Airlines Kick-Off',
    campaignType: 'launch' as const,
    projectNameEquals: ['Kick-Off - Sky Airlines']
  }
]

type CampaignRow = {
  campaign_id: string
}

type DeliveryProjectRow = {
  space_id: string | null
  client_id: string | null
  project_name: string
  notion_project_id: string
  project_status: string | null
  start_date: string | null
  end_date: string | null
}

const hasApplyFlag = process.argv.includes('--apply')
const hasManualOnlyFlag = process.argv.includes('--manual-only')

const toDateOnly = (value: string | null) => (value ? value.slice(0, 10) : null)

const toSlug = (name: string): string =>
  name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

const toLinkId = (campaignId: string, spaceId: string, projectSourceId: string) => {
  const digest = createHash('sha256').update(`${campaignId}:${spaceId}:${projectSourceId}`).digest('hex').slice(0, 24)

  return `cpl-${digest}`
}

const fetchProjects = async (): Promise<DeliveryProjectSeedSource[]> => {
  const rows = await runGreenhousePostgresQuery<DeliveryProjectRow>(
     `SELECT
       COALESCE(space_by_client.space_id, space_by_name.space_id) AS space_id,
       project.client_id,
       project.project_name,
       project.notion_project_id,
       project.project_status,
       project.start_date::text,
       project.end_date::text
     FROM greenhouse_delivery.projects project
     LEFT JOIN greenhouse_core.notion_workspaces notion_space
       ON notion_space.space_id = project.space_id
     LEFT JOIN greenhouse_core.spaces space_by_client
       ON space_by_client.client_id = notion_space.client_id
     LEFT JOIN greenhouse_core.spaces space_by_name
       ON notion_space.client_id IS NULL
      AND LOWER(space_by_name.space_name) = LOWER(notion_space.space_name)
     WHERE project.is_deleted = FALSE
       AND project.active = TRUE
       AND project.space_id IS NOT NULL
       AND project.notion_project_id IS NOT NULL
       AND project.project_name IS NOT NULL
     ORDER BY space_id, project_name`
  )

  return rows.map(row => ({
    spaceId: row.space_id || '',
    clientId: row.client_id,
    projectSourceId: row.notion_project_id,
    projectName: row.project_name,
    projectStatus: row.project_status,
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date)
  })).filter(project => Boolean(project.spaceId))
}

const buildManualCandidates = (projects: DeliveryProjectSeedSource[]): CampaignSeedCandidate[] =>
  {
    const candidates: CampaignSeedCandidate[] = []

    for (const seed of MANUAL_SEEDS) {
      const matched = projects.filter(project =>
        project.spaceId === seed.spaceId && seed.projectNameEquals.includes(project.projectName)
      )

      if (matched.length === 0) {
        continue
      }

      const startDates = matched.map(project => project.startDate).filter(Boolean) as string[]
      const endDates = matched.map(project => project.endDate).filter(Boolean) as string[]

      const isActive = matched.some(project =>
        ['en curso', 'trabajo acumulado', 'backlog'].includes((project.projectStatus || '').toLowerCase())
      )

      candidates.push({
        spaceId: seed.spaceId,
        clientId: matched[0]?.clientId || null,
        displayName: seed.displayName,
        campaignType: seed.campaignType,
        status: isActive ? 'active' : 'completed',
        plannedStartDate: startDates.length > 0 ? startDates.sort()[0] : null,
        plannedEndDate: endDates.length > 0 ? endDates.sort().at(-1) || null : null,
        projectSourceIds: matched.map(project => project.projectSourceId),
        sourceProjectNames: matched.map(project => project.projectName),
        strategy: 'manual-seed'
      })
    }

    return candidates
  }

const ensureCampaign = async (seed: CampaignSeedCandidate) => {
  const existing = await runGreenhousePostgresQuery<CampaignRow>(
    `SELECT campaign_id
     FROM greenhouse_core.campaigns
     WHERE space_id = $1
       AND LOWER(display_name) = LOWER($2)
     LIMIT 1`,
    [seed.spaceId, seed.displayName]
  )

  if (existing[0]?.campaign_id) {
    return existing[0].campaign_id
  }

  const campaignId = `cmp-${randomUUID()}`

  const [seqRow] = await runGreenhousePostgresQuery<{ nextval: string } & Record<string, unknown>>(
    `SELECT nextval('greenhouse_core.campaigns_eo_id_seq'::regclass)::text`
  )

  const eoId = `EO-CMP-${String(seqRow?.nextval ?? Date.now()).padStart(4, '0')}`
  const slug = `${toSlug(seed.displayName)}-${eoId.slice(-4).toLowerCase()}`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.campaigns (
       campaign_id,
       eo_id,
       slug,
       space_id,
       display_name,
       description,
       campaign_type,
       status,
       planned_start_date,
       planned_end_date,
       tags,
       channels,
       notes,
       currency,
       created_at,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::date,
       $11, $12, $13, 'CLP', NOW(), NOW()
     )`,
    [
      campaignId,
      eoId,
      slug,
      seed.spaceId,
      seed.displayName,
      `Seeded from real delivery projects via ${seed.strategy}.`,
      seed.campaignType,
      seed.status,
      seed.plannedStartDate,
      seed.plannedEndDate,
      ['seeded', seed.strategy],
      [],
      `Projects: ${seed.sourceProjectNames.join(' | ')}`
    ]
  )

  return campaignId
}

const ensureCampaignLinks = async (campaignId: string, seed: CampaignSeedCandidate) => {
  for (const projectSourceId of seed.projectSourceIds) {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_core.campaign_project_links (
         campaign_project_link_id,
         campaign_id,
         space_id,
         project_source_system,
         project_source_id,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, 'notion', $4, NOW(), NOW())
       ON CONFLICT (space_id, project_source_id) DO UPDATE
       SET campaign_id = EXCLUDED.campaign_id,
           updated_at = NOW()`,
      [toLinkId(campaignId, seed.spaceId, projectSourceId), campaignId, seed.spaceId, projectSourceId]
    )
  }
}

const main = async () => {
  const projects = await fetchProjects()
  const autoCandidates = hasManualOnlyFlag ? [] : buildAutoCampaignSeedCandidates(projects)
  const manualCandidates = buildManualCandidates(projects)
  const candidates = [...autoCandidates, ...manualCandidates]

  console.log(JSON.stringify({ apply: hasApplyFlag, candidates }, null, 2))

  if (!hasApplyFlag) {
    return
  }

  for (const candidate of candidates) {
    const campaignId = await ensureCampaign(candidate)

    await ensureCampaignLinks(campaignId, candidate)
  }

  const summary = await runGreenhousePostgresQuery(
    `SELECT
       COUNT(*)::int AS campaigns_count,
       (SELECT COUNT(*)::int FROM greenhouse_core.campaign_project_links) AS links_count
     FROM greenhouse_core.campaigns`
  )

  console.log(JSON.stringify(summary[0] || {}, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
