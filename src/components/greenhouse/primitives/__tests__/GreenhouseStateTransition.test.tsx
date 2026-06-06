// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseStateTransition from '../GreenhouseStateTransition'
import type { GreenhouseStateTransitionTone } from '../GreenhouseStateTransition'

const tones: GreenhouseStateTransitionTone[] = ['success', 'warning', 'error', 'info', 'neutral']

afterEach(cleanup)

describe('GreenhouseStateTransition', () => {
  it.each(tones)('renders %s tone with transition metadata', tone => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseStateTransition
        tone={tone}
        fromLabel='Pendiente'
        toLabel='Aprobado'
        title='Estado actualizado'
        description='El cambio quedo registrado.'
        timestamp='hace 2s'
        referenceId='EVT-2481'
        dataCapture={`state-transition-${tone}`}
      />
    )

    const region = getByRole(tone === 'error' ? 'alert' : 'status')

    expect(region).toHaveAttribute('data-tone', tone)
    expect(region).toHaveAttribute('data-transition', 'Pendiente -> Aprobado')
    expect(region).toHaveAttribute('data-capture', `state-transition-${tone}`)
    expect(getByText('Estado actualizado')).toBeInTheDocument()
    expect(getByText('Pendiente')).toBeInTheDocument()
    expect(getByText('Aprobado')).toBeInTheDocument()
    expect(getByText('EVT-2481')).toBeInTheDocument()
  })

  it('supports inline variant and inactive state', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseStateTransition
        tone='info'
        variant='inline'
        active={false}
        fromLabel='Sin sync'
        toLabel='Sincronizado'
        title='Sync completado'
        ariaLabel='Estado de sincronizacion actualizado'
      />
    )

    const region = getByRole('status')

    expect(region).toHaveAttribute('aria-label', 'Estado de sincronizacion actualizado')
    expect(region).toHaveAttribute('data-active', 'false')
  })
})
