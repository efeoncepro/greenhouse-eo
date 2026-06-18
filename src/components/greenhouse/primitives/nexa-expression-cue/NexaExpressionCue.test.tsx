// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import NexaExpressionCue from './NexaExpressionCue'

afterEach(cleanup)

describe('NexaExpressionCue', () => {
  it('renders a semantic icon-only cue with accessible name', () => {
    const { getByRole } = renderWithTheme(<NexaExpressionCue cue='idea' dataCapture='idea-cue' />)

    const cue = getByRole('img', { name: 'Idea de Nexa' })

    expect(cue).toHaveAttribute('data-cue', 'idea')
    expect(cue).toHaveAttribute('data-context', 'chatText')
    expect(cue).toHaveAttribute('data-treatment', 'fluentAsset')
    expect(cue).toHaveAttribute('data-sensitive', 'false')
    expect(cue).toHaveAttribute('data-capture', 'idea-cue')
  })

  it('renders a compact state chip label for stateChip context', () => {
    const { getByText } = renderWithTheme(<NexaExpressionCue cue='ready' context='stateChip' />)

    const label = getByText('Listo')
    const cue = label.closest('[data-cue="ready"]')

    expect(cue).toHaveAttribute('data-treatment', 'statusDot')
  })

  it('degrades sensitive domain cues to sober visible text', () => {
    const { getByText, queryByRole } = renderWithTheme(
      <NexaExpressionCue cue='opportunity' domain='payroll' context='answerSurface' />
    )

    const label = getByText('Oportunidad por validar')
    const cue = label.closest('[data-cue="opportunity"]')

    expect(cue).toHaveAttribute('data-treatment', 'textOnly')
    expect(cue).toHaveAttribute('data-sensitive', 'true')
    expect(cue).toHaveAttribute('data-degradation', 'sensitive-domain')
    expect(queryByRole('img', { name: 'Oportunidad detectada' })).not.toBeInTheDocument()
  })

  it('honors decorative rendering by removing the semantic img role', () => {
    const { container, queryByRole } = renderWithTheme(<NexaExpressionCue cue='source' decorative />)

    expect(queryByRole('img', { name: 'Fuente o evidencia' })).not.toBeInTheDocument()
    expect(container.querySelector('[data-cue="source"]')).toHaveAttribute('aria-hidden', 'true')
  })

  it('returns no visual node for none treatment unless a label is requested', () => {
    const hidden = renderWithTheme(<NexaExpressionCue cue='sensitive' context='chatText' />)

    expect(hidden.container.querySelector('[data-cue="sensitive"]')).not.toBeInTheDocument()
    hidden.unmount()

    const visible = renderWithTheme(<NexaExpressionCue cue='sensitive' context='chatText' showLabel />)

    expect(visible.getByText('Tema sensible')).toBeInTheDocument()
  })
})
