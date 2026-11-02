import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { closeGreenhousePostgres, runGreenhousePostgresQuery as query } from '@/lib/postgres/client'
import { projectNotionDeliveryToPostgres as project, type ProjectProjectionRow } from '@/lib/sync/project-notion-delivery-to-postgres'

import { seedFinanceRouting } from './finance-routing-fixtures'

afterAll(async () => { await closeGreenhousePostgres() })

const row = (id: string, space: string, client: string, overrides: Partial<ProjectProjectionRow> = {}): ProjectProjectionRow => ({
  project_source_id: id, space_id: space, client_id: client, module_id: null,
  project_database_source_id: `db-${space}`, project_name: id, project_status: 'active',
  project_summary: null, completion_label: null, on_time_pct_source: null, avg_rpa_source: null,
  project_phase: null, owner_member_id: null, start_date: null, end_date: null, page_url: null,
  is_deleted: false, last_edited_time: '2026-11-01T12:00:00Z', synced_at: '2026-11-01T13:00:00Z',
  sync_run_id: 'synthetic', payload_hash: 'synthetic-hash', ...overrides
})

const write = (projects: ProjectProjectionRow[], replaceMissingForSpaces = false, targetSpaceIds = ['space-seo']) =>
  project({ syncRunId: 'synthetic', projects, sprints: [], tasks: [], targetSpaceIds, replaceMissingForSpaces })

const designRecord = () => query(`SELECT to_jsonb(p) AS row FROM greenhouse_delivery.projects p WHERE notion_project_id='project-design'`)

describe.each(['A-prime', 'B'] as const)('real Notion project writer with %s', variant => {
  let seoClient: string

  beforeEach(async () => {
    seoClient = await seedFinanceRouting(variant)
    const result = await write([row('project-design', 'space-design', 'client-owner')])

    expect(result.projectsWritten).toBe(1)
    expect(result.failureSamples).toEqual([])
  })

  it('explicit SEO routing adds a new project without changing any Design field', async () => {
    const before = await designRecord()
    const result = await write([row('project-seo', 'space-seo', seoClient)])

    expect(result).toMatchObject({ projectsWritten: 1, projectsSkipped: 0, failureSamples: [] })
    expect(await designRecord()).toEqual(before)
    expect(await query(`SELECT space_id,client_id FROM greenhouse_delivery.projects WHERE notion_project_id='project-seo'`))
      .toEqual([{ space_id: 'space-seo', client_id: seoClient }])
  })

  it('retry keeps one stable project identity and semantic payload', async () => {
    const input = row('project-seo', 'space-seo', seoClient)

    await write([input])
    const before = await query(`SELECT to_jsonb(p)-'updated_at' AS row FROM greenhouse_delivery.projects p ORDER BY notion_project_id`)

    await write([input])
    expect(await query(`SELECT to_jsonb(p)-'updated_at' AS row FROM greenhouse_delivery.projects p ORDER BY notion_project_id`)).toEqual(before)
  })

  it('characterizes the existing upsert accepting ownership reassignment of a Design external ID', async () => {
    const result = await write([row('project-design', 'space-seo', seoClient)])

    expect(result.projectsWritten).toBe(1)
    expect(await query(`SELECT space_id,client_id FROM greenhouse_delivery.projects WHERE notion_project_id='project-design'`))
      .toEqual([{ space_id: 'space-seo', client_id: seoClient }])
  })

  it('characterizes an out-of-order event overwriting newer project content', async () => {
    await write([row('project-seo', 'space-seo', seoClient, { project_name: 'Newer', last_edited_time: '2026-11-02T12:00:00Z' })])
    await write([row('project-seo', 'space-seo', seoClient, { project_name: 'Older', last_edited_time: '2026-11-01T12:00:00Z' })])
    expect(await query(`SELECT project_name FROM greenhouse_delivery.projects WHERE notion_project_id='project-seo'`))
      .toEqual([{ project_name: 'Older' }])
  })

  it('characterizes targetSpaceIds controlling deletion but not authorizing incoming writes', async () => {
    await write([row('project-design', 'space-design', 'client-owner', { project_name: 'Changed outside target' })], false, ['space-seo'])
    expect(await query(`SELECT project_name FROM greenhouse_delivery.projects WHERE notion_project_id='project-design'`))
      .toEqual([{ project_name: 'Changed outside target' }])
  })

  it('characterizes partial batch success and explicit failure reporting', async () => {
    const before = await designRecord()
    const result = await write([row('project-seo', 'space-seo', seoClient), row('invalid', 'space-does-not-exist', seoClient)])

    expect(result).toMatchObject({ projectsWritten: 1, projectsSkipped: 1 })
    expect(result.failureSamples).toHaveLength(1)
    expect(await query(`SELECT notion_project_id FROM greenhouse_delivery.projects WHERE space_id='space-seo'`)).toEqual([{ notion_project_id: 'project-seo' }])
    expect(await designRecord()).toEqual(before)
  })

  it('explicit SEO-only deletion scope preserves Design when source contains no SEO projects', async () => {
    const before = await designRecord()

    await write([row('project-seo', 'space-seo', seoClient)])
    const result = await write([], true, ['space-seo'])

    expect(result.projectsMarkedDeleted).toBe(1)
    expect(await designRecord()).toEqual(before)
    expect(await query(`SELECT is_deleted FROM greenhouse_delivery.projects WHERE notion_project_id='project-seo'`)).toEqual([{ is_deleted: true }])
  })
})
