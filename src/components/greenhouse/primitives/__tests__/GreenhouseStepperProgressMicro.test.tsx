// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseStepperProgressMicro from '../GreenhouseStepperProgressMicro'
import type { GreenhouseStepperProgressStep, GreenhouseStepperProgressVariant } from '../GreenhouseStepperProgressMicro'

const steps: GreenhouseStepperProgressStep[] = [
  { id: 'validate', label: 'Validar', state: 'complete' },
  { id: 'render', label: 'Renderizar', state: 'active', meta: 'en curso' },
  { id: 'send', label: 'Enviar', state: 'pending' }
]

afterEach(cleanup)

describe('GreenhouseStepperProgressMicro', () => {
  it.each<GreenhouseStepperProgressVariant>(['horizontal', 'vertical', 'compact'])('renders %s variant', variant => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseStepperProgressMicro
        title='Pipeline documental'
        description='Progreso compacto'
        variant={variant}
        steps={steps}
        ariaLabel={`stepper-${variant}`}
        dataCapture={`stepper-${variant}`}
      />
    )

    const region = getByRole('status')

    expect(region).toHaveAttribute('data-variant', variant)
    expect(region).toHaveAttribute('data-capture', `stepper-${variant}`)
    expect(region).toHaveAttribute('aria-label', `stepper-${variant}`)
    expect(getByText('Renderizar').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('uses alert semantics for blocked or error steps', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseStepperProgressMicro steps={[{ id: 'blocked', label: 'Bloqueado', state: 'blocked' }]} />
    )

    expect(getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })
})
