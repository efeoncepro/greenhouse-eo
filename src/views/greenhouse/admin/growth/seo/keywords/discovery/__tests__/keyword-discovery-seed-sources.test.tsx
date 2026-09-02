// @vitest-environment jsdom

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import KeywordDiscoveryBuilder from '../KeywordDiscoveryBuilder'
import type { KeywordDiscoveryBuilderProps } from '../KeywordDiscoveryBuilder'

/**
 * TASK-1693 Slice 2 — el selector de fuente de seed.
 *
 * `resolveSeeds` cubre cinco fuentes desde TASK-1664; el workbench mandaba `'manual'` fijo, así
 * que cuatro eran inalcanzables. Lo que se protege acá son los tres modos de falla del cableado,
 * y ninguno es cosmético:
 *
 *  1. **Degradar en silencio.** Una fuente sin insumo que cae a `manual` deja al operador leyendo
 *     resultados de otra pregunta creyendo que corrió la suya.
 *  2. **La banda de costo muda.** El estimador exigía seeds escritas, así que en los modos que no
 *     usan el textarea la cifra habría desaparecido justo donde el operador no escribe nada y más
 *     necesita saber qué va a pagar antes de confirmar.
 *  3. **Armar una combinación que el command rebota.** `target_domain` sin `keywords_for_site`
 *     es un rechazo tipado del primitive; llegar hasta el envío convierte un error de la UI en
 *     algo que el operador lee como falla del sistema.
 */

const baseProps = (overrides: Partial<KeywordDiscoveryBuilderProps> = {}): KeywordDiscoveryBuilderProps => ({
  marketLabel: 'MX · es',
  canExecute: true,
  disabledReason: null,
  budgetRemainingUsd: 10,
  seedSourceAvailability: { gscQueries: 12, trackedKeywords: 4 },
  onSubmit: vi.fn().mockResolvedValue(undefined),
  ...overrides
})

const sourceButton = (name: RegExp) => screen.getByRole('button', { name })
const submitButton = () => screen.getByRole('button', { name: /iniciar la corrida/i })

describe('KeywordDiscoveryBuilder — fuentes de seed', () => {
  it('ofrece las cuatro fuentes simples', () => {
    renderWithTheme(<KeywordDiscoveryBuilder {...baseProps()} />)

    expect(sourceButton(/consultas medidas/i)).toBeInTheDocument()
    expect(sourceButton(/keywords seguidas/i)).toBeInTheDocument()
    expect(sourceButton(/seeds escritas/i)).toBeInTheDocument()
    expect(sourceButton(/dominio propio/i)).toBeInTheDocument()
  })

  it('estima el costo con la fuente medida SIN seeds escritas', async () => {
    renderWithTheme(<KeywordDiscoveryBuilder {...baseProps()} />)

    fireEvent.click(sourceButton(/consultas medidas/i))

    // 12 consultas medidas ⇒ hay cifra. Antes de TASK-1693 el estimador devolvía `null` sin
    // texto en el textarea y la banda quedaba muda en este modo.
    //
    // Se afirma sobre el conteo de LLAMADAS y no sobre «US$»: el cupo del período también lleva
    // el símbolo, así que buscarlo pasaría igual con el estimador roto.
    await waitFor(() => expect(screen.getByText(/llamadas estimadas/i)).toBeInTheDocument())
  })

  it('bloquea una fuente sin insumo con su razón, sin degradar a manual', async () => {
    renderWithTheme(
      <KeywordDiscoveryBuilder {...baseProps({ seedSourceAvailability: { gscQueries: 0, trackedKeywords: 4 } })} />
    )

    fireEvent.click(sourceButton(/consultas medidas/i))

    // La razón aparece dos veces por diseño: como texto de la fuente elegida y como motivo del
    // bloqueo del CTA. Ambas son deliberadas — una explica la fuente, la otra por qué no se puede
    // enviar — así que se afirma la presencia, no la unicidad.
    await waitFor(() => expect(screen.getAllByText(/no hay consultas medidas/i).length).toBeGreaterThan(0))

    // 🔴 El invariante: bloquea, no degrada. Con degradación silenciosa el CTA seguiría activo y
    // la corrida saldría con seeds del textarea sin que nadie lo dijera.
    expect(submitButton()).toBeDisabled()
  })

  it('envía la fuente elegida y NO manda seeds del textarea cuando no las usa', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    renderWithTheme(<KeywordDiscoveryBuilder {...baseProps({ onSubmit })} />)

    fireEvent.click(sourceButton(/keywords seguidas/i))
    fireEvent.click(submitButton())

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    expect(onSubmit.mock.calls[0][0]).toMatchObject({ seedSource: 'tracked_keywords', seeds: [] })
  })

  it('con dominio propio fuerza keywords_for_site antes del envío', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    renderWithTheme(<KeywordDiscoveryBuilder {...baseProps({ onSubmit })} />)

    fireEvent.click(sourceButton(/dominio propio/i))
    fireEvent.click(submitButton())

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    // El primitive rechaza cualquier otra combinación con
    // `target_domain_requires_keywords_for_site`; la UI no la deja armar.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      seedSource: 'target_domain',
      methods: ['keywords_for_site'],
      seeds: []
    })
  })

  it('con seeds escritas exige al menos una', () => {
    renderWithTheme(<KeywordDiscoveryBuilder {...baseProps()} />)

    // `manual` es el default y el textarea arranca vacío.
    expect(submitButton()).toBeDisabled()
  })
})
