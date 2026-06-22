// @vitest-environment jsdom

import { cleanup, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'
import { formatNumber } from '@/lib/format'

import GreenhouseLeaderboardPodium from '../GreenhouseLeaderboardPodium'

afterEach(cleanup)

const rankings = [
  { userId: 'julio', userName: 'Julio Reyes', rank: 1, value: 2840, avatarUrl: '/images/greenhouse/team/EO_Avatar-Jullio.png' },
  { userId: 'daniela', userName: 'Daniela', rank: 2, value: 2510, avatarUrl: '/images/greenhouse/team/EO_Avatar-Daniela.png' },
  { userId: 'valentina', userName: 'Valentina', rank: 3, value: 2320, avatarUrl: '/images/greenhouse/team/EO_Avatar-Valentina.png' }
]

describe('GreenhouseLeaderboardPodium', () => {
  it('renders the podium in visual order 2, 1, 3 while preserving accessible rank labels', () => {
    const { getByRole, getAllByRole } = renderWithTheme(
      <GreenhouseLeaderboardPodium rankings={rankings} ariaLabel='Top equipo' dataCapture='team-podium' />
    )

    const podium = getByRole('list', { name: 'Top equipo' })
    const items = getAllByRole('listitem')

    expect(podium).toHaveAttribute('data-capture', 'team-podium')
    expect(items).toHaveLength(3)
    expect(items.map(item => item.getAttribute('aria-label'))).toEqual([
      `Rank 2: Daniela, ${formatNumber(2510)}`,
      `Rank 1: Julio Reyes, ${formatNumber(2840)}`,
      `Rank 3: Valentina, ${formatNumber(2320)}`
    ])
  })

  it('supports custom value formatting and avatar fallback initials', () => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseLeaderboardPodium
        rankings={[{ userId: 'melkin', userName: 'Melkin', rank: 1, value: 91 }]}
        valueFormatter={value => `${value} pts`}
      />
    )

    expect(getByRole('listitem')).toHaveAttribute('aria-label', 'Rank 1: Melkin, 91 pts')
    expect(getByText('M')).toBeInTheDocument()
    expect(within(getByRole('listitem')).getByText('91 pts')).toBeInTheDocument()
  })
})
