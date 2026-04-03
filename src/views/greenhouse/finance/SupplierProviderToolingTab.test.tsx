// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import SupplierProviderToolingTab from './SupplierProviderToolingTab'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

describe('SupplierProviderToolingTab', () => {
  afterEach(() => {
    cleanup()
  })

  it('explains when the supplier is not linked to the canonical provider', () => {
    renderWithTheme(
      <SupplierProviderToolingTab
        supplierId='supplier-1'
        supplierName='Local Studio'
        providerId={null}
        providerTooling={null}
        onLinkProvider={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByText('Sin vínculo canónico de provider')).toBeInTheDocument()
    expect(screen.getByText(/todavía no está enlazado al objeto provider canónico/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear vínculo canónico' })).toBeInTheDocument()
  })

  it('calls the link action when requested from the empty state', async () => {
    const onLinkProvider = vi.fn().mockResolvedValue(undefined)

    renderWithTheme(
      <SupplierProviderToolingTab
        supplierId='supplier-1'
        supplierName='Local Studio'
        providerId={null}
        providerTooling={null}
        onLinkProvider={onLinkProvider}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Crear vínculo canónico' }))

    await waitFor(() => {
      expect(onLinkProvider).toHaveBeenCalledTimes(1)
    })
  })

  it('renders provider 360 KPIs and provenance when a snapshot exists', () => {
    renderWithTheme(
      <SupplierProviderToolingTab
        supplierId='supplier-1'
        supplierName='Anthropic'
        providerId='anthropic'
        providerTooling={{
          providerId: 'anthropic',
          providerName: 'Anthropic',
          providerType: 'ai_vendor',
          supplierCategory: 'software',
          paymentCurrency: 'USD',
          periodId: '2026-03',
          toolCount: 2,
          activeToolCount: 2,
          activeLicenseCount: 3,
          activeMemberCount: 2,
          walletCount: 1,
          activeWalletCount: 1,
          subscriptionCostTotalClp: 78400,
          usageCostTotalClp: 45000,
          financeExpenseCount: 2,
          financeExpenseTotalClp: 120000,
          payrollMemberCount: 2,
          licensedMemberPayrollCostClp: 3200000,
          totalProviderCostClp: 3368400,
          latestExpenseDate: '2026-03-20',
          latestLicenseChangeAt: '2026-03-18T10:00:00.000Z',
          snapshotStatus: 'complete',
          materializedAt: '2026-03-30T12:00:00.000Z'
        }}
      />
    )

    expect(screen.getByText('Vista consolidada por provider canónico')).toBeInTheDocument()
    expect(screen.getByText('Costo total')).toBeInTheDocument()
    expect(screen.getByText('$3.368.400')).toBeInTheDocument()
    expect(screen.getByText('Herramientas activas')).toBeInTheDocument()
    expect(screen.getByText('2 registradas en total')).toBeInTheDocument()
    expect(screen.getByText('Licencias activas')).toBeInTheDocument()
    expect(screen.getByText('2 personas con acceso')).toBeInTheDocument()
    expect(screen.getByText('Wallets activas')).toBeInTheDocument()
    expect(screen.getByText(/Período 2026-03/i)).toBeInTheDocument()
    expect(screen.getByText('Provider anthropic')).toBeInTheDocument()
    expect(screen.getByText('Materializado:')).toBeInTheDocument()
  })
})
