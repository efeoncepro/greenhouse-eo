// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import FieldsProgressChip from '../FieldsProgressChip'

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0]

  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve() {}
}

window.IntersectionObserver = MockIntersectionObserver

afterEach(cleanup)

const suffix = (total: number) => `de ${total} campos`
const srLabel = (filled: number, total: number) => `Cotización completa en ${total > 0 ? Math.round((filled / total) * 100) : 0}%.`

describe('FieldsProgressChip', () => {
  it('renders the counter suffix and announces progress via role=status', () => {
    const { getByRole, getByText } = renderWithTheme(
      <FieldsProgressChip filled={3} total={6} suffix={suffix} srLabel={srLabel} />
    )

    expect(getByRole('status')).toBeInTheDocument()
    expect(getByText('de 6 campos')).toBeInTheDocument()
  })

  it('handles total=0 without dividing by zero', () => {
    const { getByRole } = renderWithTheme(
      <FieldsProgressChip filled={0} total={0} suffix={suffix} srLabel={srLabel} />
    )

    expect(getByRole('status')).toBeInTheDocument()
  })

  it('renders a polite aria-live region for screen readers', () => {
    const { getByRole } = renderWithTheme(
      <FieldsProgressChip filled={5} total={6} suffix={suffix} srLabel={srLabel} />
    )

    const status = getByRole('status')

    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
  })
})
