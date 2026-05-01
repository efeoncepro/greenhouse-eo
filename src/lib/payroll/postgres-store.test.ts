import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockClientQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => true,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: async (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    callback({ query: mockClientQuery })
}))

const { pgListPayrollCompensationMembers, pgUpdatePayrollPeriod, pgSetPeriodApproved, pgSetPeriodExported } =
  await import('./postgres-store')

const PAYROLL_REQUIRED_TABLES = [
  'greenhouse_core.members',
  'greenhouse_core.client_users',
  'greenhouse_payroll.compensation_versions',
  'greenhouse_payroll.payroll_periods',
  'greenhouse_payroll.payroll_entries',
  'greenhouse_payroll.payroll_bonus_config'
]

describe('pgUpdatePayrollPeriod', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
    mockClientQuery.mockReset()
  })

  it('reads the corrected period inside the same transaction before commit', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation(async (text: string) => {
      if (text.includes('FROM pg_tables')) {
        return PAYROLL_REQUIRED_TABLES.map(qualified_name => ({ qualified_name }))
      }

      if (text.includes('SELECT * FROM greenhouse_payroll.payroll_periods')) {
        return [
          {
            period_id: '2026-03',
            year: 2026,
            month: 3,
            status: 'approved',
            calculated_at: '2026-03-05T12:00:00.000Z',
            calculated_by_user_id: 'user-1',
            approved_at: '2026-03-06T12:00:00.000Z',
            approved_by_user_id: 'user-2',
            exported_at: null,
            uf_value: 39990,
            tax_table_version: 'SII-2026-03',
            notes: 'Periodo creado como marzo',
            created_at: '2026-03-01T12:00:00.000Z'
          }
        ]
      }

      if (text.includes('SELECT DISTINCT tax_table_version')) {
        return [{ tax_table_version: 'gael-2026-02' }]
      }

      return []
    })

    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 3 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            period_id: '2026-02',
            year: 2026,
            month: 2,
            status: 'draft',
            calculated_at: null,
            calculated_by_user_id: null,
            approved_at: null,
            approved_by_user_id: null,
            exported_at: null,
            uf_value: 39990,
            tax_table_version: 'gael-2026-02',
            notes: 'Nomina imputable febrero 2026',
            created_at: '2026-03-01T12:00:00.000Z'
          }
        ]
      })

    const updated = await pgUpdatePayrollPeriod('2026-03', {
      year: 2026,
      month: 2,
      ufValue: 39990,
      taxTableVersion: 'gael-2026-02',
      notes: 'Nomina imputable febrero 2026'
    })

    expect(updated.periodId).toBe('2026-02')
    expect(updated.month).toBe(2)
    expect(updated.status).toBe('draft')
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(3)
    expect(mockClientQuery).toHaveBeenCalledTimes(5)

    const selectUpdatedPeriodCall = mockClientQuery.mock.calls.find(call =>
      String(call[0]).includes('FROM greenhouse_payroll.payroll_periods')
    )

    expect(selectUpdatedPeriodCall?.[1]).toEqual(['2026-02'])
  })

  it('resets an approved period back to draft when metadata changes require a recalculation', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation(async (text: string) => {
      if (text.includes('FROM pg_tables')) {
        return PAYROLL_REQUIRED_TABLES.map(qualified_name => ({ qualified_name }))
      }

      if (text.includes('SELECT * FROM greenhouse_payroll.payroll_periods')) {
        return [
          {
            period_id: '2026-03',
            year: 2026,
            month: 3,
            status: 'approved',
            calculated_at: '2026-03-05T12:00:00.000Z',
            calculated_by_user_id: 'user-1',
            approved_at: '2026-03-06T12:00:00.000Z',
            approved_by_user_id: 'user-2',
            exported_at: null,
            uf_value: 39990,
            tax_table_version: 'SII-2026-03',
            notes: 'Periodo aprobado',
            created_at: '2026-03-01T12:00:00.000Z'
          }
        ]
      }

      if (text.includes('SELECT DISTINCT tax_table_version')) {
        return [{ tax_table_version: 'gael-2026-03' }]
      }

      return []
    })

    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            period_id: '2026-03',
            year: 2026,
            month: 3,
            status: 'draft',
            calculated_at: null,
            calculated_by_user_id: null,
            approved_at: null,
            approved_by_user_id: null,
            exported_at: null,
            uf_value: 40000,
            tax_table_version: 'gael-2026-03',
            notes: 'Periodo ajustado',
            created_at: '2026-03-01T12:00:00.000Z'
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            period_id: '2026-03',
            year: 2026,
            month: 3,
            status: 'draft',
            calculated_at: null,
            calculated_by_user_id: null,
            approved_at: null,
            approved_by_user_id: null,
            exported_at: null,
            uf_value: 40000,
            tax_table_version: 'gael-2026-03',
            notes: 'Periodo ajustado',
            created_at: '2026-03-01T12:00:00.000Z'
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            period_id: '2026-03',
            year: 2026,
            month: 3,
            status: 'draft',
            calculated_at: null,
            calculated_by_user_id: null,
            approved_at: null,
            approved_by_user_id: null,
            exported_at: null,
            uf_value: 40000,
            tax_table_version: 'gael-2026-03',
            notes: 'Periodo ajustado',
            created_at: '2026-03-01T12:00:00.000Z'
          }
        ]
      })

    const updated = await pgUpdatePayrollPeriod('2026-03', {
      year: 2026,
      month: 3,
      ufValue: 40000,
      taxTableVersion: 'gael-2026-03',
      notes: 'Periodo ajustado'
    })

    expect(updated.status).toBe('draft')
    expect(updated.calculatedAt).toBeNull()
    expect(updated.approvedAt).toBeNull()

    const updateCall = mockClientQuery.mock.calls.find(call =>
      String(call[0]).includes('UPDATE greenhouse_payroll.payroll_periods')
    )

    expect(updateCall?.[1]?.[3]).toBe('draft')
    expect(updateCall?.[1]?.[4]).toBeNull()
    expect(updateCall?.[1]?.[5]).toBeNull()
    expect(updateCall?.[1]?.[6]).toBeNull()
    expect(updateCall?.[1]?.[7]).toBeNull()
  })
})

describe('pgSetPeriodApproved', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
    mockClientQuery.mockReset()
  })

  it('rejects approval when the period is not calculated', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce(PAYROLL_REQUIRED_TABLES.map(qualified_name => ({ qualified_name })))
      .mockResolvedValueOnce([{ user_id: 'user-1' }])

    mockClientQuery.mockResolvedValueOnce({
      rows: [
        {
          period_id: '2026-03',
          year: 2026,
          month: 3,
          status: 'draft',
          calculated_at: null,
          calculated_by_user_id: null,
          approved_at: null,
          approved_by_user_id: null,
          exported_at: null,
          uf_value: 39990,
          tax_table_version: 'SII-2026-03',
          notes: null,
          created_at: '2026-03-01T12:00:00.000Z'
        }
      ]
    })

    await expect(pgSetPeriodApproved('2026-03', 'hr@example.com')).rejects.toThrow(
      'Only calculated payroll periods can be approved.'
    )

    expect(mockClientQuery).toHaveBeenCalledTimes(1)
  })
})

describe('pgSetPeriodExported', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
    mockClientQuery.mockReset()
  })

  it('publishes an outbox event when an approved payroll period is exported', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce(PAYROLL_REQUIRED_TABLES.map(qualified_name => ({ qualified_name })))

    mockClientQuery
      .mockResolvedValueOnce({
        rows: [
          {
            period_id: '2026-03',
            year: 2026,
            month: 3,
            status: 'approved',
            calculated_at: '2026-03-05T12:00:00.000Z',
            calculated_by_user_id: 'user-1',
            approved_at: '2026-03-06T12:00:00.000Z',
            approved_by_user_id: 'user-2',
            exported_at: '2026-03-07T12:00:00.000Z',
            uf_value: 39990,
            tax_table_version: 'SII-2026-03',
            notes: null,
            created_at: '2026-03-01T12:00:00.000Z'
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            period_id: '2026-03',
            year: 2026,
            month: 3,
            status: 'exported',
            calculated_at: '2026-03-05T12:00:00.000Z',
            calculated_by_user_id: 'user-1',
            approved_at: '2026-03-06T12:00:00.000Z',
            approved_by_user_id: 'user-2',
            exported_at: '2026-03-07T12:00:00.000Z',
            uf_value: 39990,
            tax_table_version: 'SII-2026-03',
            notes: null,
            created_at: '2026-03-01T12:00:00.000Z'
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] })

    await pgSetPeriodExported('2026-03')

    expect(mockClientQuery).toHaveBeenCalledTimes(3)
    expect(mockClientQuery.mock.calls[0]?.[0]).toContain('SELECT *')
    expect(mockClientQuery.mock.calls[1]?.[0]).toContain('UPDATE greenhouse_payroll.payroll_periods')
    expect(mockClientQuery.mock.calls[2]?.[0]).toContain('INSERT INTO greenhouse_sync.outbox_events')
    expect(mockClientQuery.mock.calls[2]?.[1]?.[3]).toBe('payroll_period.exported')
  })

  it('rejects export when the period is not approved yet', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce(PAYROLL_REQUIRED_TABLES.map(qualified_name => ({ qualified_name })))

    mockClientQuery.mockResolvedValueOnce({
      rows: [
        {
          period_id: '2026-03',
          year: 2026,
          month: 3,
          status: 'draft',
          calculated_at: null,
          calculated_by_user_id: null,
          approved_at: null,
          approved_by_user_id: null,
          exported_at: null,
          uf_value: 39990,
          tax_table_version: 'SII-2026-03',
          notes: null,
          created_at: '2026-03-01T12:00:00.000Z'
        }
      ]
    })

    await expect(pgSetPeriodExported('2026-03')).rejects.toThrow('Only approved payroll periods can be exported.')

    expect(mockClientQuery).toHaveBeenCalledTimes(1)
  })
})

describe('pgListPayrollCompensationMembers', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
    mockClientQuery.mockReset()
  })

  it('qualifies member_id references in current_compensation to avoid ambiguous SQL', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation(async (text: string) => {
      if (text.includes('information_schema.tables')) {
        return PAYROLL_REQUIRED_TABLES.map(qualified_name => ({ qualified_name }))
      }

      if (text.includes('WITH compensation_counts AS')) {
        return [
          {
            member_id: 'member-1',
            display_name: 'Andres Carlosama',
            primary_email: 'andres@efeoncepro.com',
            avatar_url: null,
            active: true,
            compensation_version_count: 2,
            current_version_id: 'member-1_v2',
            current_effective_from: '2026-04-01',
            current_contract_type: 'employee',
            current_pay_regime: 'chile',
            current_payroll_via: 'greenhouse',
            current_daily_required: true,
            current_deel_contract_id: null,
            contract_end_date: null,
            current_currency: 'CLP'
          }
        ]
      }

      throw new Error(`Unexpected query: ${text}`)
    })

    const members = await pgListPayrollCompensationMembers()

    expect(members).toHaveLength(1)
    expect(members[0]).toMatchObject({
      memberId: 'member-1',
      memberName: 'Andres Carlosama',
      hasCompensationHistory: true,
      compensationVersionCount: 2,
      currentCompensationVersionId: 'member-1_v2'
    })

    const sqlCall = mockRunGreenhousePostgresQuery.mock.calls.find(call =>
      String(call[0]).includes('WITH compensation_counts AS')
    )

    const sql = String(sqlCall?.[0] ?? '')

    expect(sql).toContain('SELECT DISTINCT ON (cv.member_id)')
    expect(sql).toContain('cv.member_id,')
    expect(sql).toContain('cv.version_id AS current_version_id')
    expect(sql).toContain('cv.effective_from AS current_effective_from')
    expect(sql).toContain('cv.contract_type AS current_contract_type')
    expect(sql).toContain('cv.pay_regime AS current_pay_regime')
    expect(sql).toContain('cv.currency AS current_currency')
    expect(sql).toContain('WHERE cv.effective_from <= CURRENT_DATE')
    expect(sql).toContain('cv.effective_to IS NULL OR cv.effective_to >= CURRENT_DATE')
    expect(sql).toContain('ORDER BY cv.member_id, cv.effective_from DESC, cv.version DESC')
    expect(sql).not.toContain('SELECT DISTINCT ON (member_id)')
    expect(sql).not.toContain('ORDER BY member_id, effective_from DESC, version DESC')
  })
})
