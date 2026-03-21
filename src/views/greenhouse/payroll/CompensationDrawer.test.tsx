// @vitest-environment jsdom

import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import type { CompensationVersion } from '@/types/payroll'

import CompensationDrawer from './CompensationDrawer'

const existingVersion: CompensationVersion = {
  versionId: 'member-1_v1',
  memberId: 'member-1',
  memberName: 'Andres Carlosama',
  memberEmail: 'andres@efeoncepro.com',
  memberAvatarUrl: null,
  notionUserId: null,
  version: 1,
  payRegime: 'international',
  currency: 'USD',
  baseSalary: 2000,
  remoteAllowance: 50,
  bonusOtdMin: 0,
  bonusOtdMax: 500,
  bonusRpaMin: 0,
  bonusRpaMax: 300,
  afpName: null,
  afpRate: null,
  healthSystem: null,
  healthPlanUf: null,
  unemploymentRate: 0,
  contractType: 'indefinido',
  hasApv: false,
  apvAmount: 0,
  effectiveFrom: '2026-03-01',
  effectiveTo: null,
  isCurrent: true,
  changeReason: 'Alta inicial',
  createdBy: 'hr@efeoncepro.com',
  createdAt: '2026-03-01T12:00:00.000Z'
}

describe('CompensationDrawer', () => {
  afterEach(() => {
    cleanup()
  })

  it('treats the same effective date as an in-place update', () => {
    renderWithTheme(
      <CompensationDrawer
        open
        onClose={vi.fn()}
        existingVersion={existingVersion}
        memberId={existingVersion.memberId}
        memberName={existingVersion.memberName}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    expect(
      screen.getByText('Si mantienes esta fecha, actualizarás la compensación vigente.')
    ).toBeInTheDocument()
  })

  it('switches to new-version mode when the effective date changes', () => {
    renderWithTheme(
      <CompensationDrawer
        open
        onClose={vi.fn()}
        existingVersion={existingVersion}
        memberId={existingVersion.memberId}
        memberName={existingVersion.memberName}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    )

    fireEvent.change(screen.getAllByLabelText('Vigente desde')[0], {
      target: { value: '2026-04-01' }
    })

    expect(screen.getByRole('button', { name: 'Crear nueva versión' })).toBeInTheDocument()
    expect(
      screen.getByText('Si cambias la fecha, se creará una nueva versión desde esa vigencia.')
    ).toBeInTheDocument()
  })
})
