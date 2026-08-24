// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { cleanup, screen, waitFor } from '@testing-library/react'

import { hiringDesk as esCL } from '@/lib/copy/dictionaries/es-CL/hiringDesk'
import { renderWithTheme } from '@/test/render'
import type { HiringDeskSnapshot } from '@/types/hiring'

import HiringDeskFrame from './HiringDeskFrame'
import PipelineDeskView from './PipelineDeskView'
import { buildHiringPipelineHref, hiringApplicationViewTransitionName } from './hiring-navigation'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() })
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Hiring — navegación contextual lista/detalle', () => {
  it('construye un destino durable para cualquier vacante y postulación', () => {
    expect(buildHiringPipelineHref('opng-account-manager', 'happ-candidate-2')).toBe(
      '/agency/hiring/pipeline?openingId=opng-account-manager&focusApplication=happ-candidate-2'
    )
    expect(buildHiringPipelineHref()).toBe('/agency/hiring/pipeline')
  })

  it('produce un nombre CSS seguro y estable para el morph compartido', () => {
    expect(hiringApplicationViewTransitionName('happ:one/two')).toBe('hiring-application-happ-one-two')
  })

  it('convierte la pestaña Pipeline en retorno al padre sin duplicar un botón', () => {
    renderWithTheme(
      <HiringDeskFrame
        surface='application'
        copy={esCL}
        primary={<div>Detalle</div>}
        applicationContext={{
          applicationId: 'happ-candidate-2',
          openingId: 'opng-account-manager',
          openingTitle: 'Account Manager'
        }}
      />
    )

    const pipeline = screen.getByRole('link', {
      name: 'Volver al pipeline de Account Manager'
    })

    expect(pipeline).toHaveAttribute(
      'href',
      '/agency/hiring/pipeline?openingId=opng-account-manager&focusApplication=happ-candidate-2'
    )
    expect(pipeline).toHaveAttribute('aria-current', 'location')
    expect(pipeline).toHaveAttribute('data-parent-return', 'true')
    expect(screen.queryByRole('button', { name: /volver/i })).not.toBeInTheDocument()
  })

  it('mantiene aria-current=page sólo en la página exacta del Pipeline', () => {
    renderWithTheme(<HiringDeskFrame surface='pipeline' copy={esCL} primary={<div>Tablero</div>} />)

    const pipeline = screen.getByRole('link', { name: 'Pipeline' })

    expect(pipeline).toHaveAttribute('href', '/agency/hiring/pipeline')
    expect(pipeline).toHaveAttribute('aria-current', 'page')
  })

  it('vuelve a la vacante exacta, enfoca la tarjeta y no restaura un filtro', async () => {
    const scrollIntoView = vi.fn()

    HTMLElement.prototype.scrollIntoView = scrollIntoView
    window.history.replaceState({}, '', '/agency/hiring/pipeline?openingId=opng-account-manager&focusApplication=happ-account')
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)

      return 1
    })

    const snapshot = {
      demands: [],
      openings: [
        {
          demand: { businessUnit: 'Growth' },
          opening: {
            openingId: 'opng-content',
            publicId: 'EO-OPEN-1',
            publicTitle: 'Content Creator',
            internalTitle: 'Content Creator'
          }
        },
        {
          demand: { businessUnit: 'Comercial' },
          opening: {
            openingId: 'opng-account-manager',
            publicId: 'EO-OPEN-2',
            publicTitle: 'Account Manager',
            internalTitle: 'Account Manager'
          }
        }
      ],
      applications: [
        {
          application: {
            applicationId: 'happ-content',
            openingId: 'opng-content',
            publicId: 'EO-APP-1',
            stage: 'sourced',
            source: 'manual',
            createdAt: '2026-08-20T00:00:00.000Z',
            explainability: {}
          },
          candidateName: 'Candidata Content',
          candidateInitials: 'CC',
          openingTitle: 'Content Creator'
        },
        {
          application: {
            applicationId: 'happ-account',
            openingId: 'opng-account-manager',
            publicId: 'EO-APP-2',
            stage: 'screening',
            source: 'manual',
            createdAt: '2026-08-21T00:00:00.000Z',
            explainability: {}
          },
          candidateName: 'Candidato Account',
          candidateInitials: 'CA',
          openingTitle: 'Account Manager'
        }
      ],
      totals: { openings: 2, applications: 2, publishedOpenings: 2, activeDemands: 2 }
    } as unknown as HiringDeskSnapshot

    renderWithTheme(
      <PipelineDeskView
        copy={esCL}
        initialSnapshot={snapshot}
        initialOpeningId='opng-account-manager'
        initialFocusApplicationId='happ-account'
      />
    )

    const returnedApplication = screen.getByRole('link', {
      name: 'Candidato Account · Abrir postulación'
    })

    expect(screen.queryByText('Candidata Content')).not.toBeInTheDocument()
    await waitFor(() => expect(returnedApplication).toHaveFocus())
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    })
    expect(window.location.pathname + window.location.search).toBe(
      '/agency/hiring/pipeline?openingId=opng-account-manager'
    )
  })

  it('consume un foco inválido y deja una recuperación estable dentro del pipeline', async () => {
    window.history.replaceState({}, '', '/agency/hiring/pipeline?openingId=opng-content&focusApplication=happ-missing')

    const snapshot = {
      demands: [],
      openings: [{
        demand: { businessUnit: 'Growth' },
        opening: {
          openingId: 'opng-content',
          publicId: 'EO-OPEN-1',
          publicTitle: 'Content Creator',
          internalTitle: 'Content Creator'
        }
      }],
      applications: [],
      totals: { openings: 1, applications: 0, publishedOpenings: 1, activeDemands: 1 }
    } as unknown as HiringDeskSnapshot

    renderWithTheme(
      <PipelineDeskView
        copy={esCL}
        initialSnapshot={snapshot}
        initialOpeningId='opng-content'
        initialFocusUnavailable
      />
    )

    expect(await screen.findByText(esCL.pipeline.returnUnavailableTitle)).toBeVisible()
    expect(screen.getByText(esCL.pipeline.returnUnavailableBody)).toBeVisible()
    expect(window.location.pathname + window.location.search).toBe('/agency/hiring/pipeline?openingId=opng-content')
  })
})
