// @vitest-environment jsdom

// ISSUE-171 — el tablero se veía vacío al cambiar de vacante en el selector.
//
// El `onChange` hace `router.replace` con la vacante nueva: navegación soft, el componente NO se
// desmonta, y el servidor le manda un `initialSnapshot` nuevo scopeado a esa vacante. La lista de
// postulaciones vivía en un `useState(initialSnapshot.applications)` que nunca se re-sincronizaba,
// mientras `openingId` sí lo hacía — así que `filtered` cruzaba la vacante nueva contra el arreglo
// del montaje y daba 0. Este test hace exactamente lo que hace la navegación soft: re-renderiza
// la MISMA instancia con props nuevas, y exige que las tarjetas nuevas aparezcan y las viejas no.
//
// Caso fuente: EO-OPN-0674 (15 postulaciones) y EO-OPN-0675 (51) con el tablero en «Sin resultados»
// el 2026-09-12, con los datos intactos en la base.

import { afterEach, describe, expect, it, vi } from 'vitest'

import { cleanup, screen } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'
import { hiringDesk as esCL } from '@/lib/copy/dictionaries/es-CL/hiringDesk'
import type { HiringDeskSnapshot } from '@/types/hiring'

import PipelineDeskView from './PipelineDeskView'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }))

// jsdom no implementa ResizeObserver, que el tablero usa para sus bordes de scroll.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const opening = (openingId: string, publicId: string, title: string, count: number) => ({
  opening: { openingId, publicId, internalTitle: title, publicTitle: title, demandId: `d-${openingId}`, publicArea: 'Growth' },
  demand: { demandId: `d-${openingId}`, requestedRole: title, businessUnit: 'Growth' },
  applicationCount: count,
  activeApplicationCount: count,
}) as unknown as HiringDeskSnapshot['openings'][number]

const application = (openingId: string, openingPublicId: string, n: number) => ({
  application: {
    applicationId: `app-${openingPublicId}-${n}`,
    publicId: `EO-APP-${openingPublicId}-${n}`,
    openingId,
    identityProfileId: `ip-${openingPublicId}-${n}`,
    candidateFacetId: `cf-${openingPublicId}-${n}`,
    stage: 'sourced',
    decision: null,
    source: 'public_careers',
    score: null,
    explainability: null,
    archivedAt: null,
    createdAt: '2026-09-11T12:00:00.000Z',
    updatedAt: '2026-09-11T12:00:00.000Z',
  },
  candidateName: `Candidata ${openingPublicId} ${n}`,
  candidateInitials: 'CX',
  maskedEmail: 'c••••@example.com',
  portfolioUrl: null,
  linkedinUrl: null,
  phoneE164: null,
  residenceCountryCode: 'CL',
  openingTitle: openingPublicId,
  openingPublicId,
  area: 'Growth',
}) as unknown as HiringDeskSnapshot['applications'][number]

const A = { id: 'opng-A', pid: 'EO-OPN-0009' }
const B = { id: 'opng-B', pid: 'EO-OPN-0675' }
const openings = [opening(B.id, B.pid, 'Director de Arte', 51), opening(A.id, A.pid, 'Account Manager', 67)]
const totals = { openings: 4, applications: 187, publishedOpenings: 4, activeDemands: 4 }

/** Lo que el servidor devuelve cuando la page monta con `?openingId=A`: SÓLO filas de A. */
const snapshotScopedToA: HiringDeskSnapshot = {
  openings,
  totals,
  applications: [1, 2, 3].map((n) => application(A.id, A.pid, n)),
}

/** Lo que el servidor devuelve tras `router.replace('?openingId=B')`: SÓLO filas de B. */
const snapshotScopedToB: HiringDeskSnapshot = {
  openings,
  totals,
  applications: [1, 2, 3, 4].map((n) => application(B.id, B.pid, n)),
}

afterEach(cleanup)

describe('Hiring Desk — el tablero sigue al snapshot del servidor (ISSUE-171)', () => {
  it('monta con la vacante A y pinta sus tarjetas', () => {
    renderWithTheme(<PipelineDeskView copy={esCL} initialSnapshot={snapshotScopedToA} initialOpeningId={A.id} />)

    expect(screen.queryAllByText(/Candidata EO-OPN-0009/)).toHaveLength(3)
  })

  it('al re-renderizar la MISMA instancia con el snapshot de B, pinta las tarjetas de B y ninguna de A', () => {
    const { rerender } = renderWithTheme(
      <PipelineDeskView copy={esCL} initialSnapshot={snapshotScopedToA} initialOpeningId={A.id} />,
    )

    expect(screen.queryAllByText(/Candidata EO-OPN-0009/)).toHaveLength(3)

    // Exactamente lo que hace `router.replace` en el onChange del selector: props nuevas, sin desmontar.
    rerender(<PipelineDeskView copy={esCL} initialSnapshot={snapshotScopedToB} initialOpeningId={B.id} />)

    expect(screen.queryAllByText(/Candidata EO-OPN-0675/), 'las 4 filas que el servidor devolvió deben pintarse').toHaveLength(4)
    expect(screen.queryAllByText(/Candidata EO-OPN-0009/), 'no debe quedar residuo del arreglo del montaje').toHaveLength(0)
    expect(screen.queryAllByText(esCL.common.noResults), 'el cartel "Sin resultados" no corresponde con 4 filas').toHaveLength(0)
  })
})
