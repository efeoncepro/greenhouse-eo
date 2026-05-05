// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import MyPayrollView from './MyPayrollView'

vi.mock('@/lib/payroll/download-payroll-receipt', () => ({
  downloadPayrollReceiptPdf: vi.fn().mockResolvedValue(undefined)
}))

interface MockEntry {
  entryId: string
  periodId: string
  year: number
  month: number
  currency: string
  grossTotal: number
  netTotal: number
  status: string
  paymentStatus?: string
  paymentOrder?: {
    orderId: string
    title: string | null
    state: string | null
    processorSlug: string | null
    scheduledFor: string | null
    paidAt: string | null
    externalReference: string | null
  } | null
  payslipDeliveryTimeline?: Array<{
    deliveryKind: string
    status: string
    sentAt: string | null
    failedAt: string | null
    errorMessage: string | null
    emailProviderId: string | null
    superseded: boolean
    createdAt: string
  }>
}

const mockFetchOnce = (data: { payrollHistory: MockEntry[]; compensation: null; memberId: string }) => {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
  )
}

describe('TASK-759e MyPayrollView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders empty state when payrollHistory is empty', async () => {
    mockFetchOnce({ payrollHistory: [], compensation: null, memberId: 'm-1' })

    render(<MyPayrollView />)

    await waitFor(() => {
      expect(screen.getByText('Sin liquidaciones registradas')).toBeInTheDocument()
    })
  })

  it('renders status chip "Pagado" when paymentStatus=order_paid', async () => {
    mockFetchOnce({
      payrollHistory: [
        {
          entryId: 'e-1',
          periodId: '2026-04',
          year: 2026,
          month: 4,
          currency: 'CLP',
          grossTotal: 1000000,
          netTotal: 800000,
          status: 'exported',
          paymentStatus: 'order_paid',
          paymentOrder: {
            orderId: 'o-1',
            title: 'Payroll Apr 2026',
            state: 'paid',
            processorSlug: 'bank_internal',
            scheduledFor: '2026-05-01',
            paidAt: '2026-05-01T15:00:00Z',
            externalReference: 'WIRE-12345'
          },
          payslipDeliveryTimeline: []
        }
      ],
      compensation: null,
      memberId: 'm-1'
    })

    render(<MyPayrollView />)

    await waitFor(() => {
      expect(screen.getAllByText('Pagado').length).toBeGreaterThan(0)
      expect(screen.getByText('Banco')).toBeInTheDocument()
    })
  })

  it('renders status chip "Cancelado" when paymentStatus=cancelled', async () => {
    mockFetchOnce({
      payrollHistory: [
        {
          entryId: 'e-2',
          periodId: '2026-03',
          year: 2026,
          month: 3,
          currency: 'CLP',
          grossTotal: 500000,
          netTotal: 400000,
          status: 'exported',
          paymentStatus: 'cancelled',
          paymentOrder: {
            orderId: 'o-2',
            title: null,
            state: 'cancelled',
            processorSlug: 'deel',
            scheduledFor: null,
            paidAt: null,
            externalReference: null
          },
          payslipDeliveryTimeline: []
        }
      ],
      compensation: null,
      memberId: 'm-1'
    })

    render(<MyPayrollView />)

    await waitFor(() => {
      expect(screen.getAllByText('Cancelado').length).toBeGreaterThan(0)
    })
  })

  it('opens drawer when clicking on a row', async () => {
    mockFetchOnce({
      payrollHistory: [
        {
          entryId: 'e-3',
          periodId: '2026-04',
          year: 2026,
          month: 4,
          currency: 'CLP',
          grossTotal: 1200000,
          netTotal: 900000,
          status: 'exported',
          paymentStatus: 'order_paid',
          paymentOrder: {
            orderId: 'o-3',
            title: 'Payroll Apr',
            state: 'paid',
            processorSlug: 'bank_internal',
            scheduledFor: '2026-05-01',
            paidAt: '2026-05-01T15:00:00Z',
            externalReference: 'WIRE-987'
          },
          payslipDeliveryTimeline: [
            {
              deliveryKind: 'period_exported',
              status: 'sent',
              sentAt: '2026-05-01T10:00:00Z',
              failedAt: null,
              errorMessage: null,
              emailProviderId: 'resend-1',
              superseded: false,
              createdAt: '2026-05-01T10:00:00Z'
            }
          ]
        }
      ],
      compensation: null,
      memberId: 'm-1'
    })

    const { container } = render(<MyPayrollView />)

    await waitFor(() => {
      expect(container.querySelector('tr[aria-label="Ver detalle del período Abr 2026"]')).not.toBeNull()
    })

    const row = container.querySelector('tr[aria-label="Ver detalle del período Abr 2026"]')

    fireEvent.click(row!)

    await waitFor(() => {
      expect(screen.getByText('Detalle de liquidación')).toBeInTheDocument()
      expect(screen.getByText('Comunicaciones')).toBeInTheDocument()
      expect(screen.getByText('Reenviar recibo a mi email')).toBeInTheDocument()
    })
  })
})
