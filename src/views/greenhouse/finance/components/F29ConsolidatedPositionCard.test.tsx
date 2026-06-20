// @vitest-environment jsdom

import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import F29ConsolidatedPositionCard from './F29ConsolidatedPositionCard'
import type { F29ConsolidatedPayload } from './f29-consolidated-position-types'
import { renderWithTheme } from '@/test/render'

const basePayload = (): F29ConsolidatedPayload => ({
  enabledByLine: { vat: true, retention: false, ppm: false },
  vat: {
    periodId: '2026-06',
    debitFiscalAmountClp: 1285952,
    creditFiscalAmountClp: 200000,
    nonRecoverableVatAmountClp: 0,
    netVatPositionClp: 1085952,
    materializedAt: null
  },
  retention: {
    periodId: '2026-06',
    totalRetentionAmountClp: 138646,
    documentCount: 2,
    materializedAt: null
  },
  ppm: {
    periodId: '2026-06',
    baseAmountClp: 5800000,
    ppmRate: 0.0025,
    ppmAmountClp: 14500,
    materializedAt: null
  },
  periodId: '2026-06',
  year: 2026,
  month: 6,
  legalEntity: { organizationId: 'org-1', legalName: 'Efeonce Group SpA', taxId: '77.357.182-1', country: 'CL' }
})

afterEach(() => cleanup())

describe('F29ConsolidatedPositionCard', () => {
  it('muestra las 3 líneas con la cifra del payload sin recomputar', () => {
    renderWithTheme(<F29ConsolidatedPositionCard loading={false} payload={basePayload()} />)

    // Los montos se muestran tal cual el VM (CLP sin decimales). No se reagrega nada.
    expect(screen.getByText('$1.085.952')).toBeInTheDocument()
    expect(screen.getByText('$138.646')).toBeInTheDocument()
    expect(screen.getByText('$14.500')).toBeInTheDocument()
    // Sub-detalles derivados del VM, no recálculo de la posición.
    expect(screen.getByText('IVA por pagar')).toBeInTheDocument()
    expect(screen.getByText('Documentos: 2')).toBeInTheDocument()
    expect(screen.getByText('Tasa aplicada: 0,25%')).toBeInTheDocument()
  })

  it('propaga oficial vs shadow desde enabledByLine (badge con texto, no solo color)', () => {
    renderWithTheme(<F29ConsolidatedPositionCard loading={false} payload={basePayload()} />)

    // IVA oficial (enabled), retención + PPM en shadow (enabled:false).
    expect(screen.getByText('Oficial')).toBeInTheDocument()
    expect(screen.getAllByText('En validación')).toHaveLength(2)
  })

  it('degrada honesto: línea null muestra "Sin datos del período", nunca $0', () => {
    const payload = basePayload()

    payload.retention = null
    payload.ppm = null

    renderWithTheme(<F29ConsolidatedPositionCard loading={false} payload={payload} />)

    expect(screen.getAllByText('Sin datos del período')).toHaveLength(2)
    expect(screen.queryByText('$0')).not.toBeInTheDocument()
  })

  it('estado loading: muestra skeletons, no cifras', () => {
    renderWithTheme(<F29ConsolidatedPositionCard loading payload={null} />)

    expect(screen.queryByText('$1.085.952')).not.toBeInTheDocument()
    expect(screen.getByText('Cargando las 3 líneas del F29 del período')).toBeInTheDocument()
  })

  it('estado error: muestra título de error es-CL + botón reintentar, sin prosa cruda', () => {
    const onRetry = vi.fn()

    renderWithTheme(
      <F29ConsolidatedPositionCard
        loading={false}
        payload={null}
        error='La posición F29 del período no está disponible en este momento. Vuelve a intentarlo.'
        onRetry={onRetry}
      />
    )

    expect(screen.getByText('No pudimos cargar la posición F29 de este período')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
