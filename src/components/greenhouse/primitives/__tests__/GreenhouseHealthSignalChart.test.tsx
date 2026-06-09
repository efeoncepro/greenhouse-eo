// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseHealthSignalChart from '../GreenhouseHealthSignalChart'
import type { GreenhouseHealthSignalSegment } from '../GreenhouseHealthSignalChart'

afterEach(cleanup)

const segments: GreenhouseHealthSignalSegment[] = [
  { id: 'stable', label: 'Estable', value: 82, tone: 'success' },
  { id: 'watch', label: 'En observación', value: 13, tone: 'warning' },
  { id: 'critical', label: 'Intervención', value: 5, tone: 'error' }
]

describe('GreenhouseHealthSignalChart', () => {
  it('renders an accessible segmented health signal', () => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseHealthSignalChart score={82} segments={segments} />
    )

    expect(getByRole('img')).toHaveAccessibleName(/Salud 82 de 100/)
    expect(getByRole('img')).toHaveAttribute('data-chart-kind', 'teamHealth')
    expect(getByText('82')).toBeInTheDocument()
  })
})
