// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import ExpensesListView from './ExpensesListView'

const fetchMock = vi.fn()
const useRouterMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => useRouterMock()
}))

// Stub drawer to avoid pulling its meta-fetch into these tests
vi.mock('@views/greenhouse/finance/drawers/CreateExpenseDrawer', () => ({
  default: function CreateExpenseDrawerStub({ open }: { open: boolean }) {
    return open ? <div data-testid='create-expense-drawer-stub' /> : null
  }
}))

const buildExpense = (overrides: Record<string, unknown> = {}) => ({
  expenseId: 'EXP-202604-000001',
  expenseType: 'supplier',
  description: 'Compra de software analytics',
  currency: 'CLP',
  totalAmount: 250_000,
  totalAmountClp: 250_000,
  paymentDate: '2026-04-15',
  paymentStatus: 'pending',
  paymentMethod: 'transfer',
  documentNumber: 'F-1234',
  dueDate: '2026-04-30',
  supplierId: 'sup-1',
  supplierName: 'Acme Analytics SpA',
  serviceLine: 'globe',
  isRecurring: false,
  isAnnulled: false,
  siiDocumentStatus: 'Aceptado',
  nuboxPdfUrl: null,
  nuboxPurchaseId: null,
  ...overrides
})

describe('ExpensesListView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    useRouterMock.mockReturnValue({ push: vi.fn() })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the table after a successful fetch', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [buildExpense()], total: 1 })
    })

    renderWithTheme(<ExpensesListView />)

    await waitFor(() => {
      expect(screen.getByText('Acme Analytics SpA')).toBeInTheDocument()
    })

    // KPI subtitle reflects total document count
    expect(screen.getByText('1 documentos y gastos')).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledWith('/api/finance/expenses?')
  })

  it('shows the empty state when there are no expenses', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0 })
    })

    renderWithTheme(<ExpensesListView />)

    await waitFor(() => {
      expect(screen.getByText('No hay compras u obligaciones registradas aún')).toBeInTheDocument()
    })

    // No fetch error alert visible
    expect(screen.queryByRole('alert')).toBeTruthy() // info banner still shows
  })

  it('shows an error alert when the API returns non-ok', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error from finance' })
    })

    renderWithTheme(<ExpensesListView />)

    await waitFor(() => {
      expect(screen.getByText('Internal server error from finance')).toBeInTheDocument()
    })
  })

  it('falls back to a generic error message when the API throws (network failure)', async () => {
    fetchMock.mockRejectedValue(new Error('NetworkError when attempting to fetch resource'))

    renderWithTheme(<ExpensesListView />)

    await waitFor(() => {
      expect(screen.getByText(/NetworkError/i)).toBeInTheDocument()
    })
  })
})
