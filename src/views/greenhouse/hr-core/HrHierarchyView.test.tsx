// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

const fetchMock = vi.fn()

const baseHierarchy = {
  items: [
    {
      reportingLineId: 'line-1',
      memberId: 'member-1',
      memberName: 'Ana Perez',
      memberActive: true,
      roleTitle: 'Lead',
      departmentId: 'dept-1',
      departmentName: 'Delivery',
      supervisorMemberId: 'member-2',
      supervisorName: 'Carlos Diaz',
      supervisorActive: true,
      effectiveFrom: '2026-04-10T12:00:00.000Z',
      sourceSystem: 'greenhouse_manual',
      changeReason: 'initial_setup',
      changedByUserId: 'user-1',
      directReportsCount: 2,
      subtreeSize: 4,
      depth: 1,
      isRoot: false,
      delegation: {
        responsibilityId: 'resp-1',
        delegateMemberId: 'member-3',
        delegateMemberName: 'Marta Silva',
        effectiveFrom: '2026-04-10T12:00:00.000Z',
        effectiveTo: null
      }
    },
    {
      reportingLineId: 'line-2',
      memberId: 'member-2',
      memberName: 'Carlos Diaz',
      memberActive: true,
      roleTitle: 'Head of Delivery',
      departmentId: 'dept-1',
      departmentName: 'Delivery',
      supervisorMemberId: null,
      supervisorName: null,
      supervisorActive: null,
      effectiveFrom: '2026-04-10T12:00:00.000Z',
      sourceSystem: 'greenhouse_manual',
      changeReason: 'root_setup',
      changedByUserId: 'user-1',
      directReportsCount: 1,
      subtreeSize: 3,
      depth: 0,
      isRoot: true,
      delegation: null
    },
    {
      reportingLineId: 'line-3',
      memberId: 'member-3',
      memberName: 'Marta Silva',
      memberActive: true,
      roleTitle: 'Senior',
      departmentId: 'dept-2',
      departmentName: 'Operations',
      supervisorMemberId: 'member-2',
      supervisorName: 'Carlos Diaz',
      supervisorActive: true,
      effectiveFrom: '2026-04-10T12:00:00.000Z',
      sourceSystem: 'greenhouse_manual',
      changeReason: 'team_update',
      changedByUserId: 'user-1',
      directReportsCount: 0,
      subtreeSize: 0,
      depth: 1,
      isRoot: false,
      delegation: null
    }
  ],
  summary: {
    total: 3,
    active: 3,
    roots: 1,
    withoutSupervisor: 1,
    delegatedApprovals: 1
  }
}

const baseHistory = {
  history: [
    {
      reportingLineId: 'line-1',
      memberId: 'member-1',
      memberName: 'Ana Perez',
      supervisorMemberId: 'member-2',
      supervisorName: 'Carlos Diaz',
      previousSupervisorMemberId: null,
      previousSupervisorName: null,
      effectiveFrom: '2026-04-10T12:00:00.000Z',
      effectiveTo: null,
      sourceSystem: 'greenhouse_manual',
      changeReason: 'initial_setup',
      changedByUserId: 'user-1',
      changedByName: 'HR Admin',
      createdAt: '2026-04-10T12:00:00.000Z'
    }
  ]
}

const baseDelegations = {
  delegations: [
    {
      responsibilityId: 'resp-1',
      supervisorMemberId: 'member-1',
      supervisorName: 'Ana Perez',
      delegateMemberId: 'member-3',
      delegateMemberName: 'Marta Silva',
      effectiveFrom: '2026-04-10T12:00:00.000Z',
      effectiveTo: null,
      active: true,
      isPrimary: true,
      createdAt: '2026-04-10T12:00:00.000Z',
      updatedAt: '2026-04-10T12:00:00.000Z'
    }
  ]
}

describe('HrHierarchyView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.startsWith('/api/hr/core/members/options')) {
        return Response.json({
          members: [
            { memberId: 'member-1', displayName: 'Ana Perez', roleTitle: 'Lead' },
            { memberId: 'member-2', displayName: 'Carlos Diaz', roleTitle: 'Head of Delivery' },
            { memberId: 'member-3', displayName: 'Marta Silva', roleTitle: 'Senior' }
          ]
        })
      }

      if (url.startsWith('/api/hr/core/hierarchy/history')) {
        return Response.json(baseHistory)
      }

      if (url.startsWith('/api/hr/core/hierarchy/delegations')) {
        return Response.json(baseDelegations)
      }

      if (url.startsWith('/api/hr/core/hierarchy') && !init?.method) {
        return Response.json(baseHierarchy)
      }

      if (url === '/api/hr/core/hierarchy/reassign' && init?.method === 'POST') {
        return Response.json({
          memberId: 'member-1',
          supervisorMemberId: 'member-3'
        })
      }

      if (url === '/api/hr/core/hierarchy/delegations' && init?.method === 'POST') {
        return Response.json(
          {
            delegation: {
              responsibilityId: 'resp-2'
            }
          },
          { status: 201 }
        )
      }

      if (url === '/api/hr/core/hierarchy/delegations' && init?.method === 'DELETE') {
        return Response.json({ responsibilityId: 'resp-1', revoked: true })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
  })

  it('renders the hierarchy table and audit panel', async () => {
    const { default: HrHierarchyView } = await import('./HrHierarchyView')

    renderWithTheme(<HrHierarchyView />)

    expect(await screen.findByRole('heading', { name: 'Jerarquía HR' })).toBeInTheDocument()
    expect((await screen.findAllByText('Ana Perez')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Carlos Diaz').length).toBeGreaterThan(0)
    expect(screen.getByText('Panel auditado')).toBeInTheDocument()
    expect(screen.getByText('Historial auditado')).toBeInTheDocument()
    expect(screen.getByText('Delegaciones temporales')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Cambiar supervisor' }).length).toBeGreaterThan(0)
  })

  it('opens the supervisor change dialog from the table', async () => {
    const user = userEvent.setup()
    const { default: HrHierarchyView } = await import('./HrHierarchyView')

    renderWithTheme(<HrHierarchyView />)

    await screen.findAllByText('Ana Perez')
    await user.click(screen.getAllByRole('button', { name: 'Cambiar' })[0])

    expect(screen.getByRole('heading', { name: 'Cambiar supervisor' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Nuevo supervisor' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Razón' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambio' })).toBeDisabled()
  })

  it('opens the temporary delegation dialog from the audit panel', async () => {
    const user = userEvent.setup()
    const { default: HrHierarchyView } = await import('./HrHierarchyView')

    renderWithTheme(<HrHierarchyView />)

    await screen.findAllByText('Ana Perez')
    await user.click(screen.getAllByRole('button', { name: 'Nueva delegación' })[0])

    expect(screen.getByRole('heading', { name: 'Nueva delegación temporal' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Delegado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear delegación' })).toBeInTheDocument()
  })
})
