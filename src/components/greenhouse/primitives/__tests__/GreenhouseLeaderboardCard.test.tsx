// @vitest-environment jsdom

import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import { getMicrocopy } from '@/lib/copy'
import { formatNumber } from '@/lib/format'

import GreenhouseLeaderboardCard from '../GreenhouseLeaderboardCard'

afterEach(cleanup)

const podiumRankings = [
  { userId: 'julio', userName: 'Julio Reyes', rank: 1, value: 2840, avatarUrl: '/images/greenhouse/team/EO_Avatar-Jullio.png' },
  { userId: 'daniela', userName: 'Daniela', rank: 2, value: 2510, avatarUrl: '/images/greenhouse/team/EO_Avatar-Daniela.png' },
  { userId: 'valentina', userName: 'Valentina', rank: 3, value: 2320, avatarUrl: '/images/greenhouse/team/EO_Avatar-Valentina.png' }
]

const rankings = [
  { ...podiumRankings[0], byline: 'Nivel 42 · Diamond' },
  { ...podiumRankings[1], byline: 'Nivel 39 · Platinum' },
  { ...podiumRankings[2], byline: 'Nivel 35 · Gold' },
  { userId: 'melkin', userName: 'Melkin', rank: 4, value: 2190, byline: 'Nivel 31 · Silver' }
]

const currentRunLabel = 'Semana actual'
const previousRunLabel = 'Semana anterior'

describe('GreenhouseLeaderboardCard', () => {
  it('composes the header, podium and rankings into one governed leaderboard surface', () => {
    const { getByText, getAllByRole } = renderWithTheme(
      <GreenhouseLeaderboardCard
        title='Weekly leaderboard'
        fromDate='2026-06-15'
        toDate='2026-06-20'
        podiumRankings={podiumRankings}
        rankings={rankings}
        currentUserId='melkin'
        valueFormatter={value => `${formatNumber(value)} pts`}
        dataCapture='leaderboard-card'
      />
    )

    expect(getByText('Weekly leaderboard')).toBeInTheDocument()
    expect(getByText(/2026/)).toBeInTheDocument()
    expect(getByText(`${formatNumber(2190)} pts`)).toBeInTheDocument()
    expect(getAllByRole('list')).toHaveLength(2)
  })

  it('emits run changes from the controlled selector', async () => {
    const handleRunChange = vi.fn()
    const microcopy = getMicrocopy()

    renderWithTheme(
      <GreenhouseLeaderboardCard
        fromDate='2026-06-15'
        toDate='2026-06-20'
        podiumRankings={podiumRankings}
        rankings={rankings}
        runOptions={[
          { id: 'current', label: currentRunLabel },
          { id: 'previous', label: previousRunLabel }
        ]}
        selectedRunId='current'
        onRunChange={handleRunChange}
      />
    )

    expect(screen.getByLabelText(microcopy.aria.leaderboardRunSelect)).toBeInTheDocument()

    fireEvent.mouseDown(screen.getAllByRole('combobox')[0])
    fireEvent.click(await screen.findByRole('option', { name: previousRunLabel }))

    expect(handleRunChange).toHaveBeenCalledWith('previous')
  })
})
