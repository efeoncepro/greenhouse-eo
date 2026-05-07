// @vitest-environment jsdom

import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import SampleSprintsExperienceView from './SampleSprintsExperienceView'

const pendingApprovalLabel = 'Aprobación pendiente'
const staleProgressLabel = 'Progreso sin actualización'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}))

afterEach(() => {
  cleanup()
})

describe('SampleSprintsExperienceView copy governance', () => {
  it('keeps runtime free of mockup/debug copy and false zero metrics when empty', () => {
    renderWithTheme(
      <SampleSprintsExperienceView
        variant='runtime'
        sprints={[]}
        signals={[]}
        runtimeOptions={{ spaces: [], members: [], conversionTargets: [], quotations: [] }}
      />
    )

    expect(screen.getByRole('heading', { name: 'Sample Sprints comerciales' })).toBeInTheDocument()
    expect(screen.getByText('Aún no hay Sample Sprints')).toBeInTheDocument()
    expect(screen.getAllByText('Sin señales').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sin datos').length).toBeGreaterThan(0)

    expect(screen.queryByText('Experiencia aprobada')).not.toBeInTheDocument()
    expect(screen.queryByText('Backend conectado')).not.toBeInTheDocument()
    expect(screen.queryByText('Sample Sprints command center')).not.toBeInTheDocument()
    expect(screen.queryByText('Prototipo 2026 para declarar, gobernar, operar y cerrar Sample Sprints con trazabilidad de outcome, capacidad y señales de salud comercial.')).not.toBeInTheDocument()
    expect(screen.queryByText('Revisar approval')).not.toBeInTheDocument()
    expect(screen.queryByText('Ver Commercial Health')).not.toBeInTheDocument()
    expect(screen.queryByText('Approval')).not.toBeInTheDocument()
    expect(screen.queryByText('Outcome')).not.toBeInTheDocument()
    expect(screen.queryByText('Commercial Health')).not.toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    expect(screen.queryByText('$0')).not.toBeInTheDocument()
  })

  it('renders operational health signals with Spanish product copy and system primitives', () => {
    renderWithTheme(
      <SampleSprintsExperienceView
        variant='runtime'
        sprints={[]}
        signals={[
          {
            code: 'commercial.engagement.pending_approval',
            label: pendingApprovalLabel,
            severity: 'warning',
            count: 1,
            runbook: 'Revisar capacidad y aprobar o rechazar el Sprint',
            description: 'Sample Sprints declarados que aún no pasan a operación.'
          },
          {
            code: 'commercial.engagement.stale_progress',
            label: staleProgressLabel,
            severity: 'warning',
            count: 0,
            runbook: 'Registrar actualización semanal con contexto operacional',
            description: 'Engagement activo sin actualización reciente.'
          }
        ]}
        runtimeOptions={{ spaces: [], members: [], conversionTargets: [], quotations: [] }}
      />
    )

    fireEvent.click(screen.getByRole('tab', { name: /Salud comercial/i }))

    expect(screen.getByText('Señales operativas')).toBeInTheDocument()
    expect(screen.getByText(staleProgressLabel)).toBeInTheDocument()
    expect(screen.getByText('Estable')).toBeInTheDocument()
    expect(screen.queryByText('Reliability signals')).not.toBeInTheDocument()
    expect(screen.queryByText('steady')).not.toBeInTheDocument()
    expect(screen.queryByText('Progreso stale')).not.toBeInTheDocument()
  })

  it('keeps mockup-specific copy only in mockup variant', () => {
    renderWithTheme(<SampleSprintsExperienceView />)

    expect(screen.getByText('Mockup navegable')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sample Sprints command center' })).toBeInTheDocument()
  })
})
