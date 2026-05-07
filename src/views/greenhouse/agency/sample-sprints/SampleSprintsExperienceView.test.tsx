// @vitest-environment jsdom

import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import SampleSprintsExperienceView from './SampleSprintsExperienceView'

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

  it('keeps mockup-specific copy only in mockup variant', () => {
    renderWithTheme(<SampleSprintsExperienceView />)

    expect(screen.getByText('Mockup navegable')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sample Sprints command center' })).toBeInTheDocument()
  })
})
