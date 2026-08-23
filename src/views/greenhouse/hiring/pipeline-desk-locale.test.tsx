// @vitest-environment jsdom

// TASK-1754 — el tablero leído en `en-US` muestra sus seis columnas en inglés.
//
// El criterio de aceptación pedía verificarlo "leyendo el desk, no sólo el diff", y esa
// distinción es la que importa: `dictionaries/en-US/hiringDesk.ts` heredaba `stages` por
// spread, así que el defecto no tenía línea que mirar en ningún diff — sólo aparecía en
// pantalla. Este test recorre el consumidor real (`copy.pipeline.stages[lane.stage]`), no el
// diccionario suelto, que es donde la herencia se volvía visible.
//
// No se verificó contra el runtime con un navegador porque el locale efectivo sale de
// `session_360.effective_locale`, y la persona agente no tiene perfil de identidad: su locale
// colapsa a `es-CL` por el COALESCE final de la VIEW. Forzarlo habría exigido fabricar una fila
// de identidad en la instancia compartida por dev, staging y producción — un dato inventado
// para una persona, que es exactamente lo que el dominio prohíbe.

import { afterEach, describe, expect, it, vi } from 'vitest'

import { cleanup, screen } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'
import { hiringDesk as enUS } from '@/lib/copy/dictionaries/en-US/hiringDesk'
import { hiringDesk as esCL } from '@/lib/copy/dictionaries/es-CL/hiringDesk'
import type { HiringDeskSnapshot } from '@/types/hiring'

import PipelineDeskView from './PipelineDeskView'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

// jsdom no implementa ResizeObserver, que el tablero usa para sus bordes de scroll.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const emptySnapshot: HiringDeskSnapshot = { demands: [], openings: [], applications: [] } as unknown as HiringDeskSnapshot

afterEach(cleanup)

describe('Hiring Desk — el tablero por locale (TASK-1754)', () => {
  it('en-US nombra las seis columnas en inglés', () => {
    renderWithTheme(<PipelineDeskView copy={enUS} initialSnapshot={emptySnapshot} />)

    for (const label of ['Sourced', 'Screening', 'Evaluation', 'Interview', 'Decision', 'Closed']) {
      expect(screen.getAllByText(label).length, `el desk en inglés no muestra la columna "${label}"`).toBeGreaterThan(0)
    }

    // El defecto no era ausencia de inglés: era castellano heredado. Se afirma también la
    // ausencia, porque una columna con las dos formas presentes pasaría la prueba de arriba.
    for (const label of ['Evaluación', 'Entrevista', 'Decisión', 'Cerrado']) {
      expect(screen.queryAllByText(label), `castellano heredado en el desk en inglés: "${label}"`).toHaveLength(0)
    }
  })

  it('es-CL conserva sus nombres', () => {
    renderWithTheme(<PipelineDeskView copy={esCL} initialSnapshot={emptySnapshot} />)

    for (const label of ['Sourced', 'Screening', 'Evaluación', 'Entrevista', 'Decisión', 'Cerrado']) {
      expect(screen.getAllByText(label).length, `el desk en castellano no muestra la columna "${label}"`).toBeGreaterThan(0)
    }
  })
})
