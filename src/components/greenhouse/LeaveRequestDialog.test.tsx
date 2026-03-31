// @vitest-environment jsdom

import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import LeaveRequestDialog from './LeaveRequestDialog'

const uploaderSpy = vi.hoisted(() => vi.fn())

vi.mock('./GreenhouseFileUploader', () => ({
  default: (props: Record<string, unknown>) => {
    uploaderSpy(props)

    return <div data-testid='mock-uploader' />
  }
}))

describe('LeaveRequestDialog', () => {
  beforeEach(() => {
    uploaderSpy.mockClear()
  })

  it('propagates ownerMemberId to the uploader and leave payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithTheme(
      <LeaveRequestDialog
        open
        saving={false}
        leaveTypes={[
          {
            leaveTypeCode: 'medical',
            leaveTypeName: 'Permiso médico / cita médica',
            description: null,
            defaultAnnualAllowanceDays: 0,
            requiresAttachment: false,
            isPaid: true,
            active: true,
            colorToken: null
          }
        ]}
        ownerMemberId='member-123'
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    await waitFor(() => {
      expect(uploaderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerMemberId: 'member-123'
        })
      )
    })

    fireEvent.change(screen.getByLabelText(/desde/i), { target: { value: '2026-04-13' } })
    fireEvent.change(screen.getByLabelText(/hasta/i), { target: { value: '2026-04-14' } })

    await user.click(screen.getByRole('button', { name: /solicitar/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'member-123',
        leaveTypeCode: 'medical',
        startDate: '2026-04-13',
        endDate: '2026-04-14'
      })
    )
  })
})
