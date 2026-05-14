// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import { GH_WORKFORCE_INTAKE } from '@/lib/copy/workforce'

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args)
  }
}))

const { default: CompleteIntakeDrawer } = await import('./CompleteIntakeDrawer')

const buildMember = (overrides?: Partial<Parameters<typeof CompleteIntakeDrawer>[0]['member']>) => ({
  memberId: 'mem-felipe-uuid',
  displayName: 'Felipe Zurita',
  primaryEmail: 'fzurita@efeoncepro.com',
  workforceIntakeStatus: 'pending_intake' as const,
  identityProfileId: 'identity-felipe',
  createdAt: '2026-05-13T15:24:14Z',
  ageDays: 1,
  ...overrides
})

describe('TASK-873 Slice 3 — CompleteIntakeDrawer', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing visible when closed', () => {
    renderWithTheme(
      <CompleteIntakeDrawer open={false} member={buildMember()} onClose={() => {}} />
    )

    expect(screen.queryByText(GH_WORKFORCE_INTAKE.drawer_title)).toBeNull()
  })

  it('renders member info + warning banner + submit/cancel when open', () => {
    renderWithTheme(<CompleteIntakeDrawer open member={buildMember()} onClose={() => {}} />)

    expect(screen.getByText(GH_WORKFORCE_INTAKE.drawer_title)).toBeInTheDocument()
    expect(screen.getByText('Felipe Zurita')).toBeInTheDocument()
    expect(screen.getByText(GH_WORKFORCE_INTAKE.drawer_warning_title)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: new RegExp(GH_WORKFORCE_INTAKE.drawer_submit, 'i') })
    ).toBeInTheDocument()
    expect(screen.getByText(GH_WORKFORCE_INTAKE.drawer_cancel)).toBeInTheDocument()
  })

  it('happy path: POSTs to canonical endpoint and fires onCompleted + onClose + toast success', async () => {
    const onClose = vi.fn()
    const onCompleted = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ transitioned: true }), { status: 200 }))

    vi.stubGlobal('fetch', fetchMock)

    renderWithTheme(
      <CompleteIntakeDrawer
        open
        member={buildMember()}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: new RegExp(GH_WORKFORCE_INTAKE.drawer_submit, 'i') }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/workforce/members/mem-felipe-uuid/complete-intake',
      expect.objectContaining({ method: 'POST' })
    )
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith(GH_WORKFORCE_INTAKE.toast_submit_success))
    expect(onCompleted).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('403 response toasts forbidden + does NOT call onCompleted', async () => {
    const onClose = vi.fn()
    const onCompleted = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }))

    vi.stubGlobal('fetch', fetchMock)

    renderWithTheme(
      <CompleteIntakeDrawer
        open
        member={buildMember()}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: new RegExp(GH_WORKFORCE_INTAKE.drawer_submit, 'i') }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(GH_WORKFORCE_INTAKE.toast_submit_forbidden))
    expect(onCompleted).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('409 conflict (e.g. already completed) toasts conflict + does NOT close', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 409 }))

    vi.stubGlobal('fetch', fetchMock)

    renderWithTheme(
      <CompleteIntakeDrawer open member={buildMember()} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('button', { name: new RegExp(GH_WORKFORCE_INTAKE.drawer_submit, 'i') }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(GH_WORKFORCE_INTAKE.toast_submit_conflict))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('network failure (fetch throws) toasts generic error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))

    vi.stubGlobal('fetch', fetchMock)

    renderWithTheme(
      <CompleteIntakeDrawer open member={buildMember()} onClose={() => {}} />
    )

    fireEvent.click(screen.getByRole('button', { name: new RegExp(GH_WORKFORCE_INTAKE.drawer_submit, 'i') }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(GH_WORKFORCE_INTAKE.toast_submit_error))
  })

  it('encodes memberId in URL (defense against injection)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))

    vi.stubGlobal('fetch', fetchMock)

    renderWithTheme(
      <CompleteIntakeDrawer
        open
        member={buildMember({ memberId: 'mem/with/slashes' })}
        onClose={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: new RegExp(GH_WORKFORCE_INTAKE.drawer_submit, 'i') }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url] = fetchMock.mock.calls[0]

    expect(url).toBe('/api/admin/workforce/members/mem%2Fwith%2Fslashes/complete-intake')
  })

  it('handles null member gracefully', () => {
    renderWithTheme(<CompleteIntakeDrawer open member={null} onClose={() => {}} />)

    expect(screen.getByText(/no hay colaborador seleccionado/i)).toBeInTheDocument()
  })
})
