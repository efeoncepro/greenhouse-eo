/**
 * TASK-998 — test del connect store (token-por-teamspace).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const discoverMock = vi.fn()
const secretMock = vi.fn()
const queryMock = vi.fn()
const captureMock = vi.fn()

vi.mock('./notion-token-connect', () => ({
  discoverNotionDatabasesForToken: (...a: unknown[]) => discoverMock(...a)
}))
vi.mock('@/lib/secrets/secret-manager', () => ({
  createOrAddSecretVersion: (...a: unknown[]) => secretMock(...a)
}))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...a: unknown[]) => queryMock(...a)
}))
vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...a: unknown[]) => captureMock(...a)
}))

import { connectNotionTeamspaceForSpace, slugifyForSecret } from './notion-connect-store'

const baseInput = {
  spaceId: 'spc-berel',
  clientSlug: 'Grupo Berel',
  token: 'ntn_xxx',
  tareasDbId: 'db-tareas',
  proyectosDbId: 'db-proyectos',
  sprintsDbId: 'db-sprints',
  actorUserId: 'user-1'
}

const discovery = {
  ok: true,
  databases: [
    { databaseId: 'db-tareas', title: 'Tareas', classification: 'tareas', url: '' },
    { databaseId: 'db-proyectos', title: 'Proyectos', classification: 'proyectos', url: '' },
    { databaseId: 'db-sprints', title: 'Sprints', classification: 'sprints', url: '' }
  ],
  suggested: { tareas: 'db-tareas', proyectos: 'db-proyectos', sprints: 'db-sprints', revisiones: null }
}

beforeEach(() => {
  discoverMock.mockReset()
  secretMock.mockReset()
  queryMock.mockReset()
  captureMock.mockReset()
})
afterEach(() => vi.clearAllMocks())

describe('slugifyForSecret', () => {
  it('normaliza acentos, espacios y mayúsculas', () => {
    expect(slugifyForSecret('Grupo Berel')).toBe('grupo-berel')
    expect(slugifyForSecret('  ANAM  ')).toBe('anam')
    expect(slugifyForSecret('Pinturas & Cía')).toBe('pinturas-cia')
  })
})

describe('connectNotionTeamspaceForSpace — TASK-998', () => {
  it('falla invalid_input sin las 3 DBs', async () => {
    const r = await connectNotionTeamspaceForSpace({ ...baseInput, tareasDbId: '' })

    expect(r.ok).toBe(false)
    expect(r.errorCode).toBe('invalid_input')
    expect(discoverMock).not.toHaveBeenCalled()
  })

  it('falla token_invalid cuando el token no valida', async () => {
    discoverMock.mockResolvedValueOnce({ ok: false, reason: 'rechazado', databases: [], suggested: {} })
    const r = await connectNotionTeamspaceForSpace(baseInput)

    expect(r.errorCode).toBe('token_invalid')
    expect(secretMock).not.toHaveBeenCalled()
  })

  it('anti-tampering: rechaza una DB que el token NO ve', async () => {
    discoverMock.mockResolvedValueOnce(discovery)
    const r = await connectNotionTeamspaceForSpace({ ...baseInput, sprintsDbId: 'db-ajena' })

    expect(r.errorCode).toBe('db_not_visible')
    expect(secretMock).not.toHaveBeenCalled()
  })

  it('propaga secret_write_failed (IAM) sin escribir PG', async () => {
    discoverMock.mockResolvedValueOnce(discovery)
    secretMock.mockResolvedValueOnce({ ok: false, errorCode: 'permission_denied', reason: 'sin permiso', secretId: 'x' })
    const r = await connectNotionTeamspaceForSpace(baseInput)

    expect(r.errorCode).toBe('secret_write_failed')
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('happy path: valida → secret → UPSERT con secret_ref + sync_enabled=FALSE', async () => {
    discoverMock.mockResolvedValueOnce(discovery)
    secretMock.mockResolvedValueOnce({ ok: true, secretId: 'notion-integration-token-greenhouse-grupo-berel' })
    queryMock.mockResolvedValueOnce([{ source_id: 'sns-1' }])

    const r = await connectNotionTeamspaceForSpace(baseInput)

    expect(r.ok).toBe(true)
    expect(r.secretRef).toBe('notion-integration-token-greenhouse-grupo-berel')
    expect(r.sourceId).toBe('sns-1')
    expect(secretMock).toHaveBeenCalledWith('notion-integration-token-greenhouse-grupo-berel', 'ntn_xxx')

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('notion_token_secret_ref')
    expect(sql).toContain('sync_enabled')
    expect(sql).toMatch(/FALSE/)
    expect(sql).toContain('ON CONFLICT (space_id)')
  })
})
