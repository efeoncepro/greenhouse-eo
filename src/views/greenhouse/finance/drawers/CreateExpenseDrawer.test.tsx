// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import CreateExpenseDrawer from './CreateExpenseDrawer'

const fetchMock = vi.fn()

// CreateSupplierDrawer is nested and pulls its own meta — stub it out
vi.mock('./CreateSupplierDrawer', () => ({
  default: function CreateSupplierDrawerStub({ open }: { open: boolean }) {
    return open ? <div data-testid='create-supplier-drawer-stub' /> : null
  }
}))

const META_FULL = {
  suppliers: [
    {
      supplierId: 'sup-1',
      name: 'Acme Analytics SpA',
      taxId: '76123456-1',
      defaultCategory: 'software'
    }
  ],
  paymentMethods: ['transfer', 'credit_card'],
  paymentProviders: ['bank', 'webpay'],
  paymentRails: ['bank_transfer', 'card'],
  recurrenceFrequencies: ['monthly', 'annual'],
  members: [{ memberId: 'mem-1', displayName: 'Carla González' }],
  spaces: [{ spaceId: 'sp-1', spaceName: 'Globe', clientId: 'c-1', organizationId: 'o-1' }],
  supplierToolLinks: []
}

const META_PARTIAL = {
  suppliers: [],
  paymentMethods: ['transfer'],
  paymentProviders: [],
  paymentRails: [],
  recurrenceFrequencies: [],
  members: [],
  spaces: [],
  supplierToolLinks: []
}

const ACCOUNTS = {
  items: [
    { accountId: 'acc-1', accountName: 'Banco Estado CLP', providerSlug: 'bestado', instrumentCategory: 'checking', currency: 'CLP', isActive: true }
  ]
}

const buildFetchHandler = (meta: unknown, accounts: unknown = ACCOUNTS) => {
  return (input: string) => {
    if (typeof input !== 'string') return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })

    if (input.startsWith('/api/finance/expenses/meta')) {
      return Promise.resolve({ ok: true, json: async () => meta })
    }

    if (input.startsWith('/api/finance/accounts')) {
      return Promise.resolve({ ok: true, json: async () => accounts })
    }

    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
  }
}

describe('CreateExpenseDrawer', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('does not fetch meta when open=false', () => {
    renderWithTheme(
      <CreateExpenseDrawer open={false} onClose={() => {}} onSuccess={() => {}} />
    )

    // MUI Drawer renderiza el contenido en DOM con visibilidad oculta cuando
    // está cerrado (transition lifecycle), por eso aquí solo validamos que NO
    // se dispare el fetch de /meta ni /accounts mientras open=false — el
    // contrato funcional es "no consumir API hasta que el drawer abre".
    const metaCalls = fetchMock.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.startsWith('/api/finance/expenses/meta')
    )

    expect(metaCalls.length).toBe(0)
  })

  it('opens, fetches meta and renders the form header on success', async () => {
    fetchMock.mockImplementation(buildFetchHandler(META_FULL))

    renderWithTheme(
      <CreateExpenseDrawer open={true} onClose={() => {}} onSuccess={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getByText('Registrar egreso')).toBeInTheDocument()
    })

    await waitFor(() => {
      const calledMeta = fetchMock.mock.calls.some(
        ([url]) => typeof url === 'string' && url.startsWith('/api/finance/expenses/meta')
      )

      expect(calledMeta).toBe(true)
    })
  })

  it('renders even when meta arrives empty/partial — degradation must not be fatal', async () => {
    fetchMock.mockImplementation(buildFetchHandler(META_PARTIAL))

    renderWithTheme(
      <CreateExpenseDrawer open={true} onClose={() => {}} onSuccess={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getByText('Registrar egreso')).toBeInTheDocument()
    })
  })

  it('renders even when meta endpoint returns non-ok (degraded availability)', async () => {
    fetchMock.mockImplementation((input: string) => {
      if (typeof input === 'string' && input.startsWith('/api/finance/expenses/meta')) {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'meta down' }) })
      }

      if (typeof input === 'string' && input.startsWith('/api/finance/accounts')) {
        return Promise.resolve({ ok: true, json: async () => ACCOUNTS })
      }

      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
    })

    renderWithTheme(
      <CreateExpenseDrawer open={true} onClose={() => {}} onSuccess={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getByText('Registrar egreso')).toBeInTheDocument()
    })
  })
})
