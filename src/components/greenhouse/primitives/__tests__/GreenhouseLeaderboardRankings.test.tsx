// @vitest-environment jsdom

import { cleanup, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'
import { formatNumber } from '@/lib/format'

import GreenhouseLeaderboardRankings from '../GreenhouseLeaderboardRankings'

afterEach(cleanup)

const rankings = [
  { userId: 'julio', userName: 'Julio Reyes', rank: 1, value: 2840, byline: 'Nivel 42 · Diamond' },
  { userId: 'daniela', userName: 'Daniela', rank: 2, value: 2510, byline: 'Nivel 39 · Platinum' },
  { userId: 'melkin', userName: 'Melkin', rank: 3, value: 2190, byline: 'Nivel 31 · Silver' }
]

describe('GreenhouseLeaderboardRankings', () => {
  it('renders accessible ranking rows and highlights the current user', () => {
    const { getByRole, getAllByRole } = renderWithTheme(
      <GreenhouseLeaderboardRankings
        rankings={rankings}
        currentUserId='melkin'
        currentUserLabel='Actual'
        ariaLabel='Ranking equipo'
        dataCapture='team-ranking'
      />
    )

    const list = getByRole('list', { name: 'Ranking equipo' })
    const items = getAllByRole('listitem')

    expect(list.closest('[data-capture="team-ranking"]')).toBeInTheDocument()
    expect(items).toHaveLength(3)
    expect(items[2]).toHaveAttribute('aria-current', 'true')
    expect(items[2]).toHaveAttribute('aria-label', `Rank 3: Melkin, ${formatNumber(2190)}`)
    expect(within(items[2]).getByText('Melkin')).toBeInTheDocument()
  })

  it('keeps hidden rows out of the rendered list', () => {
    const { queryByText } = renderWithTheme(
      <GreenhouseLeaderboardRankings
        rankings={[
          ...rankings,
          { userId: 'hidden', userName: 'Oculto', rank: 4, value: 1000, displayed: false }
        ]}
      />
    )

    expect(queryByText('Oculto')).not.toBeInTheDocument()
  })
})
