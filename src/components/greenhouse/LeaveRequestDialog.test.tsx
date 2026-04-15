// @vitest-environment jsdom

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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

  it('keeps the draft values when submit fails', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Unable to create leave request.'))

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
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    const dialog = screen.getByRole('dialog')
    const startDateInput = within(dialog).getByLabelText(/desde/i, { selector: 'input' })
    const endDateInput = within(dialog).getByLabelText(/hasta/i, { selector: 'input' })
    const reasonInput = within(dialog).getAllByLabelText(/motivo/i, { selector: 'textarea' }).at(-1)

    expect(startDateInput).toBeTruthy()
    expect(endDateInput).toBeTruthy()
    expect(reasonInput).toBeTruthy()

    fireEvent.change(startDateInput!, { target: { value: '2026-04-17' } })
    fireEvent.change(endDateInput!, { target: { value: '2026-04-17' } })
    fireEvent.change(reasonInput!, { target: { value: 'Control médico' } })

    const submitButton = screen.getByRole('button', { name: /solicitar/i })

    await waitFor(() => {
      expect(submitButton).toBeEnabled()
    })

    await user.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    expect(startDateInput).toHaveValue('2026-04-17')
    expect(endDateInput).toHaveValue('2026-04-17')
    expect(reasonInput).toHaveValue('Control médico')
  })
})
