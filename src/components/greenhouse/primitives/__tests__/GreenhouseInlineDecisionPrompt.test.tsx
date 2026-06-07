// @vitest-environment jsdom

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseInlineDecisionPrompt from '../GreenhouseInlineDecisionPrompt'
import type { GreenhouseInlineDecisionState, GreenhouseInlineDecisionVariant } from '../GreenhouseInlineDecisionPrompt'

afterEach(cleanup)

describe('GreenhouseInlineDecisionPrompt', () => {
  it.each<GreenhouseInlineDecisionVariant>(['choice', 'confirmation', 'impact'])('renders %s variant', variant => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseInlineDecisionPrompt
        variant={variant}
        title='Propagar cambio'
        description='Este ajuste afecta registros relacionados.'
        primaryLabel='Aplicar'
        secondaryLabel='Solo este registro'
        impactItems={['Actualiza registros draft.', 'Mantiene audit trail.']}
        dataCapture={`decision-${variant}`}
      />
    )

    const region = getByRole('status')

    expect(region).toHaveAttribute('data-variant', variant)
    expect(region).toHaveAttribute('data-capture', `decision-${variant}`)
    expect(getByText('Propagar cambio')).toBeInTheDocument()
  })

  it.each<GreenhouseInlineDecisionState>(['submitting', 'blocked'])('handles %s command availability', state => {
    const onPrimary = vi.fn()

    const { getByRole } = renderWithTheme(
      <GreenhouseInlineDecisionPrompt state={state} title='Resolver fuente' primaryLabel='Aplicar' onPrimary={onPrimary} />
    )

    expect(getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })

  it('runs secondary and tertiary handlers', () => {
    const onSecondary = vi.fn()
    const onTertiary = vi.fn()

    const { getByRole } = renderWithTheme(
      <GreenhouseInlineDecisionPrompt
        title='Resolver fuente'
        primaryLabel='Usar externa'
        secondaryLabel='Mantener override'
        tertiaryLabel='Cancelar'
        onSecondary={onSecondary}
        onTertiary={onTertiary}
      />
    )

    fireEvent.click(getByRole('button', { name: 'Mantener override' }))
    fireEvent.click(getByRole('button', { name: 'Cancelar' }))
    expect(onSecondary).toHaveBeenCalledTimes(1)
    expect(onTertiary).toHaveBeenCalledTimes(1)
  })
})
