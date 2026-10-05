// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { server } from '@/mocks/node'
import { renderWithTheme } from '@/test/render'
import type { ContractorSelfServiceScenario } from '@/lib/contractor-engagements/projection-types'

vi.mock('@/components/greenhouse/GreenhouseFileUploader', () => ({
  default: ({
    contextType,
    value,
    onChange
  }: {
    contextType: string
    value: object | null
    onChange: (v: object) => void
  }) => (
    <button onClick={() => onChange({ assetId: contextType, fileName: 'fixture.pdf' })}>
      {contextType}
      {value ? ' seleccionado' : ''}
    </button>
  )
}))
vi.mock('./ContractorClosureSidecar', () => ({ default: () => null }))
vi.mock('./ContractorTimeline', () => ({ default: () => null }))
vi.mock('./PaymentProfileHandoff', () => ({ default: () => null }))
vi.mock('@/components/greenhouse/contractors/RemittanceAdviceSection', () => ({ default: () => null }))

import ContractorSubmissionComposer from './ContractorSubmissionComposer'
import ContractorSelfServiceView from './ContractorSelfServiceView'
import ContractorDisputeResponse from './ContractorDisputeResponse'

const scenario = {
  kind: 'honorarios_ready',
  currency: 'CLP',
  paymentModel: 'payg_invoice',
  engagementPublicId: 'EO-CENG-FIXTURE',
  relationshipSubtype: 'honorarios_cl',
  supportItems: [],
  requiresInvoice: true,
  requiresWorkApproval: true,
  supportSubmissionId: 'observed-own',
  agreedRate: { rateAmount: 1000, rateType: 'fixed', paymentCadence: 'monthly', currency: 'CLP' },
  blockers: [],
  kpis: [],
  submissions: [],
  timeline: [],
  paidRemittances: [],
  closureVisible: false,
  secondaryHref: '/my/payment-profile',
  secondaryAction: 'Cuenta de pago'
} as unknown as ContractorSelfServiceScenario

let bodies: Record<string, unknown>[]

beforeEach(() => {
  bodies = []
  // Resolve browser-relative URLs while keeping the real transport intercepted by MSW.
  const transport = globalThis.fetch

  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    transport(typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input, init)
  )
  server.use(
    http.post('http://localhost/api/my/contractor/work-submissions', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>)

      return HttpResponse.json({ submission: { contractorWorkSubmissionId: 'saved-own' } }, { status: 201 })
    })
  )
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

describe('contractor submission flow', () => {
  it('sends one atomic request, retries the same attempt, then clears period/documents after success', async () => {
    let attempts = 0

    server.use(
      http.post('http://localhost/api/my/contractor/work-submissions', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>)

        return ++attempts === 1
          ? HttpResponse.json({ error: 'Soporte temporalmente no disponible' }, { status: 409 })
          : HttpResponse.json({ submission: { contractorWorkSubmissionId: 'saved-own' } })
      })
    )
    const props = { scenario, onSubmitted: vi.fn(), onClose: vi.fn() }
    const { rerender } = renderWithTheme(<ContractorSubmissionComposer open {...props} />)

    fireEvent.change(screen.getByLabelText(/Inicio del servicio/), { target: { value: '2026-09-01' } })
    fireEvent.click(screen.getByText('contractor_invoice_draft'))
    fireEvent.click(screen.getByText('contractor_work_evidence_draft'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    await screen.findByText('Soporte temporalmente no disponible')
    expect(props.onSubmitted).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    await waitFor(() => expect(props.onSubmitted).toHaveBeenCalledOnce())
    expect(bodies).toHaveLength(2)
    expect(bodies[1]).toEqual(bodies[0])
    expect(bodies[0]).toMatchObject({
      invoiceAssetId: 'contractor_invoice_draft',
      evidenceAssetId: 'contractor_work_evidence_draft',
      submit: true
    })
    expect(bodies[0]).not.toHaveProperty('grossAmount')
    expect(bodies[0]).not.toHaveProperty('currency')
    rerender(<ContractorSubmissionComposer open={false} {...props} />)
    rerender(<ContractorSubmissionComposer open {...props} />)
    expect(screen.getByLabelText(/Inicio del servicio/)).toHaveValue('')
    expect(screen.getByText('contractor_invoice_draft')).toBeVisible()
    fireEvent.change(screen.getByLabelText(/Inicio del servicio/), { target: { value: '2026-10-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    await waitFor(() => expect(bodies).toHaveLength(3))
    expect(bodies[2].idempotencyKey).not.toBe(bodies[0].idempotencyKey)
    expect(bodies[2].invoiceAssetId).toBeNull()
  })

  it('retains the same draft ID and attempt when saving and reopening', async () => {
    const props = { scenario, onSubmitted: vi.fn(), onClose: vi.fn() }
    const { rerender } = renderWithTheme(<ContractorSubmissionComposer open {...props} />)

    fireEvent.change(screen.getByLabelText(/Inicio del servicio/), { target: { value: '2026-09-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    await waitFor(() => expect(props.onSubmitted).toHaveBeenCalledOnce())
    rerender(<ContractorSubmissionComposer open={false} {...props} />)
    rerender(<ContractorSubmissionComposer open {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    await waitFor(() => expect(props.onSubmitted).toHaveBeenCalledTimes(2))
    expect(bodies[1]).toMatchObject({
      contractorWorkSubmissionId: 'saved-own',
      idempotencyKey: bodies[0].idempotencyKey
    })
  })

  it.each(['hourly', 'daily'] as const)('uses the agreed currency and accepts decimal quantities for %s', async rateType => {
    const props = {
      scenario: { ...scenario, agreedRate: { ...scenario.agreedRate, rateType } },
      onSubmitted: vi.fn(),
      onClose: vi.fn()
    }

    renderWithTheme(<ContractorSubmissionComposer open {...props} />)
    expect(screen.getByLabelText('Moneda')).toHaveAttribute('readonly')
    fireEvent.change(screen.getByLabelText(/Inicio del servicio/), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '4,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a revisión' }))
    await waitFor(() => expect(props.onSubmitted).toHaveBeenCalledOnce())
    expect(bodies[0]).toMatchObject({ submissionType: 'timesheet', quantity: 4.5 })
  })

  it.each([
    ['paid', 'Ver comprobante', 'contractor-remittances'],
    ['submitted_review', 'Ver envío', 'contractor-submissions'],
    ['closure_pending', 'Ver pendientes', 'contractor-pending']
  ] as const)('%s primary action focuses the existing record', (kind, primaryAction, id) => {
    renderWithTheme(
      <ContractorSelfServiceView
        initialProjection={{
          state: 'active',
          degraded: [],
          generatedAt: '2026-10-05T00:00:00Z',
          contractVersion: 'contractor-self-service.v1',
          scenario: { ...scenario, kind, primaryAction, closureVisible: kind === 'closure_pending' }
        }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: primaryAction }))
    expect(document.activeElement?.id).toBe(id)
    expect(screen.queryByText('Preparar envío')).not.toBeInTheDocument()

    if (kind !== 'closure_pending') {
      fireEvent.click(screen.getByRole('button', { name: 'Preparar otro período' }))
      expect(screen.getByText('Preparar envío')).toBeVisible()
    }
  })

  it('responds to the same observed submission without creating a new dated invoice', async () => {
    const responded = vi.fn()

    renderWithTheme(<ContractorDisputeResponse open scenario={scenario} onClose={vi.fn()} onResponded={responded} />)
    fireEvent.change(screen.getByLabelText('Respuesta al revisor'), { target: { value: 'Adjunto la corrección' } })
    fireEvent.click(screen.getByText('contractor_work_evidence_draft'))
    fireEvent.click(screen.getByRole('button', { name: 'Responder observación' }))
    await waitFor(() => expect(responded).toHaveBeenCalledOnce())
    expect(bodies[0]).toMatchObject({
      contractorWorkSubmissionId: 'observed-own',
      title: 'Adjunto la corrección',
      evidenceAssetId: 'contractor_work_evidence_draft'
    })
    expect(bodies[0]).not.toHaveProperty('servicePeriodStart')
  })
})
