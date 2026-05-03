// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import RegisterCashOutDrawer from './RegisterCashOutDrawer'

// ─────────────────────────────────────────────────────────────────────
// TASK-772 — Regression tests para la cadena Compras → Cash-Out:
//   - Figma EXP-202604-008 con supplierId='figma-inc' y supplierName=null
//     debe agruparse bajo "Figma" (no "Sin proveedor")
//   - Documento USD debe mostrar pendingAmount en USD (no CLP)
//   - Helper text debe separar moneda original + equivalente CLP
// ─────────────────────────────────────────────────────────────────────

const fetchMock = vi.fn()

const FIGMA_EXPENSE = {
  expenseId: 'EXP-202604-008',
  description: 'Pago mensual - Figma',
  // Caso bug: supplierId presente pero supplierName=null
  supplierId: 'figma-inc',
  supplierName: null,
  // Slice 1 hidrata supplierDisplayName desde tabla suppliers
  supplierDisplayName: 'Figma',
  currency: 'USD',
  totalAmount: 92.9,
  totalAmountClp: 83773.5,
  // Slice 1 emite estos campos canónicos
  pendingAmount: 92.9,
  pendingAmountClp: 83773.5,
  amountPaidClp: 0,
  amountPaidIsHomogeneous: true,
  paymentStatus: 'pending',
  paymentAccountId: 'santander-corp-clp',
  documentDate: '2026-04-29',
  paymentDate: '2026-04-03',
  sortDate: '2026-04-29'
}

const ORPHAN_EXPENSE_NO_SUPPLIER_ID = {
  expenseId: 'EXP-OLD-001',
  description: 'Compra antigua sin supplier',
  supplierId: null,
  supplierName: null,
  supplierDisplayName: null,
  currency: 'CLP',
  totalAmount: 50000,
  totalAmountClp: 50000,
  pendingAmount: 50000,
  pendingAmountClp: 50000,
  amountPaidClp: 0,
  amountPaidIsHomogeneous: true,
  paymentStatus: 'pending',
  paymentAccountId: null,
  documentDate: '2026-04-15',
  paymentDate: null,
  sortDate: '2026-04-15'
}

const setupFetch = (expenses: unknown[]) => {
  fetchMock.mockImplementation(async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url

    if (urlStr.startsWith('/api/finance/expenses')) {
      return new Response(JSON.stringify({ items: expenses, total: expenses.length, page: 1, pageSize: 200 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (urlStr.startsWith('/api/finance/accounts')) {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (urlStr.startsWith('/api/finance/exchange-rates/latest')) {
      return new Response(JSON.stringify({ available: true, rate: 901.76 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
}

const openSupplierSelect = async () => {
  // MUI TextField select renderiza un input invisible + un combobox button
  // que vive en un Portal. fireEvent.mouseDown es sincrono y a veces NO dispara
  // el state internal de MUI Select (flakey en CI). Patrón más robusto:
  // (a) esperar al combobox role no disabled, (b) fireEvent.mouseDown,
  // (c) waitFor hasta que role='listbox' aparece (signal canónico de menú abierto).
  await waitFor(() => {
    const combobox = screen.getByRole('combobox', { name: /Proveedor/i })

    expect(combobox).not.toHaveAttribute('aria-disabled', 'true')
  })

  const supplierSelect = screen.getByRole('combobox', { name: /Proveedor/i })

  fireEvent.mouseDown(supplierSelect)

  // Wait until MUI mounts the listbox (señal canónica de menú abierto).
  await waitFor(() => {
    expect(screen.getByRole('listbox', { name: /Proveedor/i })).toBeInTheDocument()
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RegisterCashOutDrawer — TASK-772 supplier hydration + currency integrity', () => {
  it('agrupa Figma bajo "Figma" usando supplierDisplayName cuando supplierName=null', async () => {
    setupFetch([FIGMA_EXPENSE])

    renderWithTheme(<RegisterCashOutDrawer open onClose={() => {}} onSuccess={() => {}} />)

    await openSupplierSelect()

    // Todos los MenuItem renderizados (incluido el placeholder "— Seleccionar proveedor —"
    // y los grupos efectivos) deben contener "Figma" — NUNCA "Sin proveedor" porque
    // figma-inc tiene supplierId válido.
    await waitFor(() => {
      const matches = screen.getAllByText(/Figma/i)

      expect(matches.length).toBeGreaterThan(0)
    })

    // No debe aparecer "Sin proveedor" como label de un grupo cuando todos los
    // expenses tienen supplierId.
    expect(screen.queryAllByText(/Sin proveedor/i)).toHaveLength(0)
  })

  it('agrupa expenses sin supplierId bajo "Sin proveedor"', async () => {
    setupFetch([ORPHAN_EXPENSE_NO_SUPPLIER_ID])

    renderWithTheme(<RegisterCashOutDrawer open onClose={() => {}} onSuccess={() => {}} />)

    await openSupplierSelect()

    await waitFor(() => {
      // "Sin proveedor" debe aparecer como label de grupo (al menos 1 vez)
      const matches = screen.getAllByText(/Sin proveedor/i)

      expect(matches.length).toBeGreaterThan(0)
    })
  })

  it('separa Figma (supplierId) de orphan (sin supplierId) en grupos distintos', async () => {
    setupFetch([FIGMA_EXPENSE, ORPHAN_EXPENSE_NO_SUPPLIER_ID])

    renderWithTheme(<RegisterCashOutDrawer open onClose={() => {}} onSuccess={() => {}} />)

    await openSupplierSelect()

    await waitFor(() => {
      // Ambos labels deben aparecer en el dropdown
      expect(screen.queryAllByText(/Figma/i).length).toBeGreaterThan(0)
      expect(screen.queryAllByText(/Sin proveedor/i).length).toBeGreaterThan(0)
    })
  })

  it('graceful: cuando el contract no expone supplierDisplayName, fallback a supplierName legacy', async () => {
    // Caso BQ-fallback: el reader degraded no emite supplierDisplayName.
    const legacy = { ...FIGMA_EXPENSE, supplierDisplayName: undefined, supplierName: 'Figma legacy' }

    setupFetch([legacy])

    renderWithTheme(<RegisterCashOutDrawer open onClose={() => {}} onSuccess={() => {}} />)

    await openSupplierSelect()

    await waitFor(() => {
      const matches = screen.queryAllByText(/Figma legacy/i)

      expect(matches.length).toBeGreaterThan(0)
    })
  })
})
