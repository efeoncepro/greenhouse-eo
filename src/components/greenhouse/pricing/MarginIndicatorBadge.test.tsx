// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import MarginIndicatorBadge from './MarginIndicatorBadge'

afterEach(cleanup)

const tierTarget = { min: 0.15, opt: 0.3, max: 0.4 }

describe('MarginIndicatorBadge', () => {
  it('classifies margin below min as critical with alert-triangle icon', () => {
    const { container, getByText } = renderWithTheme(
      <MarginIndicatorBadge marginPct={0.1} target={tierTarget} />
    )

    expect(getByText(/Crítico/)).toBeInTheDocument()
    expect(container.querySelector('.tabler-alert-triangle')).toBeInTheDocument()
  })

  it('classifies margin between min and opt as attention', () => {
    const { getByText, container } = renderWithTheme(
      <MarginIndicatorBadge marginPct={0.2} target={tierTarget} />
    )

    expect(getByText(/Atención/)).toBeInTheDocument()
    expect(container.querySelector('.tabler-alert-circle')).toBeInTheDocument()
  })

  it('classifies margin within optimal range as optimal', () => {
    const { getByText, container } = renderWithTheme(
      <MarginIndicatorBadge marginPct={0.35} target={tierTarget} />
    )

    expect(getByText(/Óptimo/)).toBeInTheDocument()
    expect(container.querySelector('.tabler-circle-check')).toBeInTheDocument()
  })

  it('classifies margin above max as overshoot with info-circle icon', () => {
    const { getByText, container } = renderWithTheme(
      <MarginIndicatorBadge marginPct={0.5} target={tierTarget} />
    )

    expect(getByText(/Sobre meta/)).toBeInTheDocument()
    expect(container.querySelector('.tabler-info-circle')).toBeInTheDocument()
  })

  it('hides status label when showLabel=false', () => {
    const { queryByText } = renderWithTheme(
      <MarginIndicatorBadge marginPct={0.35} target={tierTarget} showLabel={false} />
    )

    expect(queryByText(/Óptimo/)).not.toBeInTheDocument()
  })

  it('exposes an accessible aria-label with percentage and status', () => {
    const { getByLabelText } = renderWithTheme(
      <MarginIndicatorBadge marginPct={0.35} target={tierTarget} />
    )

    expect(getByLabelText(/Margen.*Óptimo/)).toBeInTheDocument()
  })

  it('treats margin exactly at min as attention (not critical)', () => {
    const { getByText } = renderWithTheme(
      <MarginIndicatorBadge marginPct={0.15} target={tierTarget} />
    )

    expect(getByText(/Atención/)).toBeInTheDocument()
  })

  it('treats margin exactly at max as optimal (not overshoot)', () => {
    const { getByText } = renderWithTheme(
      <MarginIndicatorBadge marginPct={0.4} target={tierTarget} />
    )

    expect(getByText(/Óptimo/)).toBeInTheDocument()
  })
})
