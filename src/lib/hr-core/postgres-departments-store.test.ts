import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { mockQuery, mockClientQuery } = vi.hoisted(() => ({
  mockQuery: (() => {
    process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret'

    return vi.fn()
  })(),
  mockClientQuery: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: async (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    callback({ query: mockClientQuery })
}))

vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => true
}))

const loadStore = async () => import('./postgres-departments-store')

const REQUIRED_TABLES = [
  { qualified_name: 'greenhouse_core.departments' },
  { qualified_name: 'greenhouse_core.members' }
]

describe('postgres-departments-store', () => {
  beforeEach(() => {
    vi.resetModules()
    mockQuery.mockReset()
    mockClientQuery.mockReset()
  })

  it('lists departments from Postgres without filtering inactive rows', async () => {
    mockQuery
      .mockResolvedValueOnce(REQUIRED_TABLES)
      .mockResolvedValueOnce([
        {
          department_id: 'creative-studio',
          name: 'Creative Studio',
          description: 'Equipo creativo',
          parent_department_id: null,
          head_member_id: 'member-1',
          head_member_name: 'Daniela Ferreira',
          business_unit: 'globe',
          active: false,
          sort_order: 4
        }
      ])

    const { listDepartmentsFromPostgres } = await loadStore()
    const departments = await listDepartmentsFromPostgres()

    expect(departments).toEqual([
      {
        departmentId: 'creative-studio',
        name: 'Creative Studio',
        description: 'Equipo creativo',
        parentDepartmentId: null,
        headMemberId: 'member-1',
        headMemberName: 'Daniela Ferreira',
        businessUnit: 'globe',
        active: false,
        sortOrder: 4
      }
    ])
  })

  it('creates a department in Postgres and reloads it inside the same transaction', async () => {
    mockQuery.mockResolvedValueOnce(REQUIRED_TABLES)

    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ member_id: 'member-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            department_id: 'creative-team',
            name: 'Creative Team',
            description: 'Equipo creativo',
            parent_department_id: null,
            head_member_id: 'member-1',
            head_member_name: 'Daniela Ferreira',
            business_unit: 'globe',
            active: true,
            sort_order: 1
          }
        ]
      })

    const { createDepartmentInPostgres } = await loadStore()

    const created = await createDepartmentInPostgres({
      name: 'Creative Team',
      description: 'Equipo creativo',
      headMemberId: 'member-1',
      businessUnit: 'globe',
      active: true,
      sortOrder: 1
    })

    expect(created.departmentId).toBe('creative-team')
    expect(created.headMemberId).toBe('member-1')

    const insertCall = mockClientQuery.mock.calls.find(call =>
      String(call[0]).includes('INSERT INTO greenhouse_core.departments')
    )

    expect(insertCall?.[1]).toEqual([
      'creative-team',
      'Creative Team',
      'Equipo creativo',
      null,
      'member-1',
      'globe',
      true,
      1
    ])
  })

  it('updates department relations in Postgres after validating the new head member', async () => {
    mockQuery.mockResolvedValueOnce(REQUIRED_TABLES)

    mockClientQuery
      .mockResolvedValueOnce({
        rows: [
          {
            department_id: 'creative-team',
            name: 'Creative Team',
            description: 'Equipo creativo',
            parent_department_id: null,
            head_member_id: 'member-1',
            head_member_name: 'Daniela Ferreira',
            business_unit: 'globe',
            active: true,
            sort_order: 1
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [{ member_id: 'member-2' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            department_id: 'creative-team',
            name: 'Creative Team',
            description: 'Equipo creativo actualizado',
            parent_department_id: null,
            head_member_id: 'member-2',
            head_member_name: 'Felipe Rojas',
            business_unit: 'globe',
            active: true,
            sort_order: 2
          }
        ]
      })

    const { updateDepartmentInPostgres } = await loadStore()

    const updated = await updateDepartmentInPostgres('creative-team', {
      description: 'Equipo creativo actualizado',
      headMemberId: 'member-2',
      sortOrder: 2
    })

    expect(updated.headMemberId).toBe('member-2')
    expect(updated.sortOrder).toBe(2)

    const updateCall = mockClientQuery.mock.calls.find(call =>
      String(call[0]).includes('UPDATE greenhouse_core.departments')
    )

    expect(String(updateCall?.[0])).toContain('head_member_id')
    expect(updateCall?.[1]?.[0]).toBe('creative-team')
  })
})
