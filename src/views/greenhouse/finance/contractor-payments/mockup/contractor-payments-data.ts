// TASK-974 — Finance Contractor Payments Workbench mockup data.
//
// Typed mock that mirrors the real ContractorPayable shape + readiness so the
// runtime (Slice 1+) can swap the reader without reinterpreting the visual
// direction. Amounts are CLP unless noted; net = gross − withholding.

export type MockPayableStatus =
  | 'pending_readiness'
  | 'blocked'
  | 'ready_for_finance'
  | 'obligation_created'
  | 'payment_order_created'
  | 'paid'
  | 'cancelled'

export interface MockReadinessBlocker {
  code: string
  message: string
}

export interface MockPayable {
  contractorPayableId: string
  publicId: string
  contractorName: string
  engagementPublicId: string
  payableSourceKind: 'work_submission' | 'fixed_recurring' | 'invoice' | 'off_cycle'
  grossAmount: number
  withholdingAmount: number
  netPayable: number
  currency: 'CLP' | 'USD'
  payrollVia: string
  dueDate: string | null
  status: MockPayableStatus
  blockers: MockReadinessBlocker[]
}

export interface MockApprovedSubmission {
  id: string
  contractorName: string
  engagementPublicId: string
  period: string
  gross: number
  currency: 'CLP' | 'USD'
}

export interface MockEngagement {
  id: string
  publicId: string
  contractorName: string
  currency: 'CLP' | 'USD'
}

const b = (code: string, message: string): MockReadinessBlocker => ({ code, message })

export const MOCK_PAYABLES: MockPayable[] = [
  {
    contractorPayableId: 'cpay-001',
    publicId: 'EO-CPAY-0001',
    contractorName: 'Valentina Hoyos',
    engagementPublicId: 'EO-CENG-0001',
    payableSourceKind: 'work_submission',
    grossAmount: 600_000,
    withholdingAmount: 91_500,
    netPayable: 508_500,
    currency: 'CLP',
    payrollVia: 'internal',
    dueDate: '2026-06-05',
    status: 'ready_for_finance',
    blockers: []
  },
  {
    contractorPayableId: 'cpay-002',
    publicId: 'EO-CPAY-0002',
    contractorName: 'Diego Marín',
    engagementPublicId: 'EO-CENG-0004',
    payableSourceKind: 'work_submission',
    grossAmount: 1_200_000,
    withholdingAmount: 183_000,
    netPayable: 1_017_000,
    currency: 'CLP',
    payrollVia: 'internal',
    dueDate: '2026-06-05',
    status: 'blocked',
    blockers: [b('rut_unverified', 'Falta el RUT chileno verificado del prestador.')]
  },
  {
    contractorPayableId: 'cpay-003',
    publicId: 'EO-CPAY-0003',
    contractorName: 'Sofía Restrepo',
    engagementPublicId: 'EO-CENG-0007',
    payableSourceKind: 'off_cycle',
    grossAmount: 850_000,
    withholdingAmount: 0,
    netPayable: 850_000,
    currency: 'CLP',
    payrollVia: 'internal',
    dueDate: '2026-06-05',
    status: 'pending_readiness',
    blockers: [b('payment_profile_unresolved', 'No hay perfil de pago aprobado (ni waiver).')]
  },
  {
    contractorPayableId: 'cpay-004',
    publicId: 'EO-CPAY-0004',
    contractorName: 'Mateo Rivas',
    engagementPublicId: 'EO-CENG-0009',
    payableSourceKind: 'work_submission',
    grossAmount: 980_000,
    withholdingAmount: 149_450,
    netPayable: 830_550,
    currency: 'CLP',
    payrollVia: 'internal',
    dueDate: '2026-06-05',
    status: 'pending_readiness',
    blockers: [b('payment_exceeds_agreed_amount', 'El bruto supera el monto acordado por HR.')]
  },
  {
    contractorPayableId: 'cpay-005',
    publicId: 'EO-CPAY-0005',
    contractorName: 'Camila Ortega',
    engagementPublicId: 'EO-CENG-0011',
    payableSourceKind: 'fixed_recurring',
    grossAmount: 720_000,
    withholdingAmount: 109_800,
    netPayable: 610_200,
    currency: 'CLP',
    payrollVia: 'internal',
    dueDate: '2026-05-05',
    status: 'obligation_created',
    blockers: []
  },
  {
    contractorPayableId: 'cpay-006',
    publicId: 'EO-CPAY-0006',
    contractorName: 'Lucas Fernández',
    engagementPublicId: 'EO-CENG-0013',
    payableSourceKind: 'work_submission',
    grossAmount: 540_000,
    withholdingAmount: 82_350,
    netPayable: 457_650,
    currency: 'CLP',
    payrollVia: 'internal',
    dueDate: '2026-05-05',
    status: 'paid',
    blockers: []
  }
]

export const MOCK_APPROVED_SUBMISSIONS: MockApprovedSubmission[] = [
  {
    id: 'sub-101',
    contractorName: 'Valentina Hoyos',
    engagementPublicId: 'EO-CENG-0001',
    period: 'Mayo 2026',
    gross: 600_000,
    currency: 'CLP'
  },
  {
    id: 'sub-102',
    contractorName: 'Andrés Mejía',
    engagementPublicId: 'EO-CENG-0015',
    period: 'Mayo 2026',
    gross: 1_100_000,
    currency: 'CLP'
  }
]

export const MOCK_ENGAGEMENTS: MockEngagement[] = [
  { id: 'ceng-001', publicId: 'EO-CENG-0001', contractorName: 'Valentina Hoyos', currency: 'CLP' },
  { id: 'ceng-011', publicId: 'EO-CENG-0011', contractorName: 'Camila Ortega', currency: 'CLP' },
  { id: 'ceng-015', publicId: 'EO-CENG-0015', contractorName: 'Andrés Mejía', currency: 'CLP' }
]

/** SII honorarios retention rate for 2026 (TASK-794), for the off-cycle preview. */
export const MOCK_SII_RATE_2026 = 0.1525

export interface MockKpis {
  toPrepareCount: number
  toPrepareNet: number
  blockedCount: number
  blockedNet: number
  readyCount: number
  readyNet: number
  paidCount: number
  paidNet: number
}

export const buildMockKpis = (payables: MockPayable[]): MockKpis => {
  const sum = (list: MockPayable[]) => list.reduce((acc, p) => acc + p.netPayable, 0)
  const toPrepare = payables.filter(p => p.status === 'pending_readiness')
  const blocked = payables.filter(p => p.status === 'blocked')
  const ready = payables.filter(p => p.status === 'ready_for_finance')
  const paid = payables.filter(p => p.status === 'paid')

  return {
    toPrepareCount: toPrepare.length,
    toPrepareNet: sum(toPrepare),
    blockedCount: blocked.length,
    blockedNet: sum(blocked),
    readyCount: ready.length,
    readyNet: sum(ready),
    paidCount: paid.length,
    paidNet: sum(paid)
  }
}

export const STATUS_TONE: Record<MockPayableStatus, 'secondary' | 'warning' | 'error' | 'info' | 'success' | 'primary'> = {
  pending_readiness: 'warning',
  blocked: 'error',
  ready_for_finance: 'success',
  obligation_created: 'info',
  payment_order_created: 'primary',
  paid: 'success',
  cancelled: 'secondary'
}
