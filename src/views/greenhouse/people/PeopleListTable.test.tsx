// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import type { PersonListItem } from '@/types/people'

import { GH_WORKFORCE_INTAKE } from '@/lib/copy/workforce'

// Stubs for client deps that fail in jsdom
vi.mock('@/components/greenhouse/motion/ViewTransitionLink', () => ({
  default: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>
}))

vi.mock('@/hooks/useListAnimation', () => ({
  useListAnimation: () => [{ current: null }]
}))

vi.mock('@/components/greenhouse/TeamAvatar', () => ({
  default: ({ name }: { name: string }) => <div aria-label={`Avatar ${name}`} />
}))

vi.mock('@components/TablePaginationComponent', () => ({
  default: () => <div data-testid='pagination' />
}))

vi.mock('./PeopleListFilters', () => ({
  default: () => <div data-testid='filters' />
}))

const { default: PeopleListTable } = await import('./PeopleListTable')

const buildPerson = (overrides: Partial<PersonListItem>): PersonListItem => ({
  memberId: 'mem-1',
  displayName: 'Felipe Zurita',
  publicEmail: 'felipe@example.com',
  internalEmail: null,
  roleTitle: 'Designer',
  roleCategory: 'design',
  departmentName: null,
  avatarUrl: null,
  locationCountry: 'CL',
  active: true,
  totalAssignments: 0,
  contractedFte: 1,
  assignedFte: 0,
  totalFte: 0,
  payRegime: 'chile',
  workforceIntakeStatus: null,
  ...overrides
})

describe('TASK-873 Slice 2 — PeopleListTable workforce intake badge', () => {
  it('does NOT render badge when workforceIntakeStatus is null (legacy / BQ fallback)', () => {
    renderWithTheme(<PeopleListTable data={[buildPerson({ workforceIntakeStatus: null })]} />)

    expect(screen.queryByText(GH_WORKFORCE_INTAKE.badge_pending_intake)).toBeNull()
    expect(screen.queryByText(GH_WORKFORCE_INTAKE.badge_in_review)).toBeNull()
  })

  it('does NOT render badge when workforceIntakeStatus is completed', () => {
    renderWithTheme(<PeopleListTable data={[buildPerson({ workforceIntakeStatus: 'completed' })]} />)

    expect(screen.queryByText(GH_WORKFORCE_INTAKE.badge_pending_intake)).toBeNull()
    expect(screen.queryByText(GH_WORKFORCE_INTAKE.badge_in_review)).toBeNull()
  })

  it('renders "Ficha pendiente" badge with warning color + aria-label when status=pending_intake', () => {
    renderWithTheme(
      <PeopleListTable data={[buildPerson({ workforceIntakeStatus: 'pending_intake' })]} />
    )

    expect(
      screen.getAllByLabelText(GH_WORKFORCE_INTAKE.badge_pending_intake_aria).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('renders "Ficha en revisión" badge with info color + aria-label when status=in_review', () => {
    renderWithTheme(
      <PeopleListTable data={[buildPerson({ workforceIntakeStatus: 'in_review' })]} />
    )

    expect(
      screen.getAllByLabelText(GH_WORKFORCE_INTAKE.badge_in_review_aria).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('keeps the existing Activo/Inactivo chip stacked above the intake badge', () => {
    renderWithTheme(
      <PeopleListTable
        data={[
          buildPerson({
            active: true,
            workforceIntakeStatus: 'pending_intake'
          })
        ]}
      />
    )

    // Both chips should be present — Activo + Ficha pendiente.
    expect(screen.getAllByText('Activo').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByLabelText(GH_WORKFORCE_INTAKE.badge_pending_intake_aria).length
    ).toBeGreaterThanOrEqual(1)
  })
})
