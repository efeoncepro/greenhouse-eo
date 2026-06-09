// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseThinkingBeat from '../GreenhouseThinkingBeat'
import {
  GREENHOUSE_THINKING_BEAT_MOTION,
  resolveGreenhouseThinkingBeatKind,
  resolveGreenhouseThinkingBeatVariant
} from '../greenhouse-thinking-beat-controller'

afterEach(cleanup)

describe('GreenhouseThinkingBeat', () => {
  it('announces active thinking state by default', () => {
    const { getByRole } = renderWithTheme(<GreenhouseThinkingBeat kind='nexa' dataCapture='thinking-beat' />)

    const beat = getByRole('status', { name: 'Nexa esta pensando' })

    expect(beat).toHaveAttribute('data-kind', 'nexa')
    expect(beat).toHaveAttribute('data-variant', 'inline')
    expect(beat).toHaveAttribute('data-capture', 'thinking-beat')
  })

  it('can be decorative when embedded inside readable copy', () => {
    const { container, queryByRole } = renderWithTheme(<GreenhouseThinkingBeat kind='nexa' decorative />)

    expect(queryByRole('status')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('resolves semantic kind and variant defaults', () => {
    expect(resolveGreenhouseThinkingBeatKind('sync').colorMode).toBe('info')
    expect(resolveGreenhouseThinkingBeatVariant('standalone').surface).toBe(true)
    expect(GREENHOUSE_THINKING_BEAT_MOTION.durationMs).toBe(600)
  })
})
