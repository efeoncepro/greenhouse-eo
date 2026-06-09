// @vitest-environment jsdom

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseCommandFeedback from '../GreenhouseCommandFeedback'
import type { GreenhouseCommandFeedbackTone } from '../GreenhouseCommandFeedback'

const tones: GreenhouseCommandFeedbackTone[] = ['success', 'error', 'warning', 'info', 'retrying']
const feedbackTitle = 'Resultado registrado'
const feedbackDescription = 'La accion quedo persistida.'
const actionLabel = 'Ver detalle'

afterEach(cleanup)

describe('GreenhouseCommandFeedback', () => {
  it.each(tones)('renders %s tone with semantic status metadata', tone => {
    const { getByText, getByRole } = renderWithTheme(
      <GreenhouseCommandFeedback
        tone={tone}
        title={feedbackTitle}
        description={feedbackDescription}
        timestamp='hace 1m'
        referenceId='CMD-123'
        dataCapture={`feedback-${tone}`}
      />
    )

    const region = getByRole(tone === 'error' ? 'alert' : 'status')

    expect(region).toHaveAttribute('data-tone', tone)
    expect(region).toHaveAttribute('data-capture', `feedback-${tone}`)
    expect(getByText(feedbackTitle)).toBeInTheDocument()
    expect(getByText(feedbackDescription)).toBeInTheDocument()
    expect(getByText('CMD-123')).toBeInTheDocument()
  })

  it('runs optional action handler', () => {
    const onAction = vi.fn()

    const { getByRole } = renderWithTheme(
      <GreenhouseCommandFeedback tone='error' title={feedbackTitle} actionLabel={actionLabel} onAction={onAction} />
    )

    fireEvent.click(getByRole('button', { name: actionLabel }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
