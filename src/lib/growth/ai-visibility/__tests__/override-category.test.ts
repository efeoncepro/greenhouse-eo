import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1962 — corrección de la categoría de un perfil AEO (gobernada + auditada). Caso fuente: Berel clasificado como
 * «Manufactura». Cubre el gate, que el nodo exista en la taxonomía, perfil inexistente, no-op real y la transacción
 * (perfil + historial append-only + outbox).
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: vi.fn(), withGreenhousePostgresTransaction: vi.fn() }))

import { can } from '@/lib/entitlements/runtime'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { overrideProfileCategory } from '../override-category'
import { getCategoryTaxonomyNode } from '../taxonomy'

const subject = { roleCodes: ['efeonce_account'], routeGroups: ['internal'], authorizedViews: [] } as never
const fakeClient = { query: vi.fn() }
const base = { subject, profileId: 'gprf-berel', updatedBy: 'user-op-1', reason: 'Berel es pintura, no manufactura genérica' }

beforeEach(() => {
  vi.clearAllMocks()
  fakeClient.query.mockReset()
  vi.mocked(withGreenhousePostgresTransaction).mockImplementation((async (cb: (c: typeof fakeClient) => unknown) => cb(fakeClient)) as never)
})

describe('overrideProfileCategory', () => {
  it('la taxonomía tiene el nodo de pinturas y recubrimientos, activo y bajo bienes de consumo', () => {
    expect(getCategoryTaxonomyNode('sector:paints_coatings')).toMatchObject({ status: 'active', label: { es: 'Pinturas y recubrimientos' }, parentIds: ['industry:consumer_goods'] })
  })

  it('sin la capability no abre transacción', async () => {
    vi.mocked(can).mockReturnValue(false)
    await expect(overrideProfileCategory({ ...base, categoryNodeId: 'sector:paints_coatings' })).rejects.toMatchObject({ code: 'forbidden' })
    expect(can).toHaveBeenCalledWith(subject, 'growth.ai_visibility.profile.set_category', 'execute', 'tenant')
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('un nodo que no existe en la taxonomía no se acepta (nunca texto libre)', async () => {
    vi.mocked(can).mockReturnValue(true)
    await expect(overrideProfileCategory({ ...base, categoryNodeId: 'sector:pinturitas' })).rejects.toMatchObject({ code: 'invalid_category' })
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('perfil inexistente', async () => {
    vi.mocked(can).mockReturnValue(true)
    fakeClient.query.mockResolvedValueOnce({ rows: [] })
    await expect(overrideProfileCategory({ ...base, categoryNodeId: 'sector:paints_coatings' })).rejects.toMatchObject({ code: 'profile_not_found' })
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('mismo nodo ya corregido: no-op sin historial ni evento', async () => {
    vi.mocked(can).mockReturnValue(true)
    fakeClient.query.mockResolvedValueOnce({ rows: [{ profile_id: 'gprf-berel', organization_id: 'org-1', category_node_id: 'sector:paints_coatings', category_label: 'Pinturas y recubrimientos', category_source: 'operator_override' }] })

    await expect(overrideProfileCategory({ ...base, categoryNodeId: 'sector:paints_coatings' })).resolves.toMatchObject({ changed: false })
    expect(fakeClient.query).toHaveBeenCalledTimes(1)
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('corrige: perfil, historial con de → a y evento en la misma transacción', async () => {
    vi.mocked(can).mockReturnValue(true)
    fakeClient.query.mockResolvedValueOnce({ rows: [{ profile_id: 'gprf-berel', organization_id: 'org-1', category_node_id: 'industry:manufacturing', category_label: 'Manufactura', category_source: 'brand_intelligence' }] }).mockResolvedValue({ rows: [] })

    const result = await overrideProfileCategory({ ...base, categoryNodeId: 'sector:paints_coatings' })

    expect(result).toEqual({ changed: true, categoryNodeId: 'sector:paints_coatings', categoryLabel: 'Pinturas y recubrimientos', source: 'operator_override' })
    expect(fakeClient.query.mock.calls[1]![0]).toContain('UPDATE greenhouse_growth.grader_profiles')
    expect(fakeClient.query.mock.calls[2]![0]).toContain('INSERT INTO greenhouse_growth.grader_category_history')
    expect(fakeClient.query.mock.calls[2]![1]).toEqual(expect.arrayContaining(['industry:manufacturing', 'Manufactura', 'sector:paints_coatings', 'Pinturas y recubrimientos']))
    expect(publishOutboxEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'growth.ai_visibility.category_overridden' }), fakeClient)
  })
})
