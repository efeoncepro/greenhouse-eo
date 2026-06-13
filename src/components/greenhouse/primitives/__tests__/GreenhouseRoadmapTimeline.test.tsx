// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseRoadmapTimeline, {
  normalizeGreenhouseRoadmapTimelineStatus,
  resolveGreenhouseRoadmapTimelineVariant,
  type GreenhouseRoadmapTimelineItem
} from '../GreenhouseRoadmapTimeline'

const roadmapItems: GreenhouseRoadmapTimelineItem[] = [
  {
    id: 'foundation',
    period: 'Q1',
    title: 'Core platform',
    description: 'Shared contracts and primitives land in the product core.',
    status: 'done'
  },
  {
    id: 'moments',
    period: 'Q2',
    title: 'Nexa moments',
    description: 'Context-aware AI moments become reusable across domains.',
    status: 'in-progress',
    meta: 'Now'
  },
  {
    id: 'domains',
    period: 'Q3',
    title: 'Domain consumers',
    description: 'Finance, People and Client surfaces consume the same primitive.',
    status: 'upcoming'
  }
]

afterEach(cleanup)

describe('GreenhouseRoadmapTimeline', () => {
  it('renders the prompt item shape as an accessible roadmap region', () => {
    const { getAllByRole, getByRole, getByText } = renderWithTheme(
      <GreenhouseRoadmapTimeline
        title='Greenhouse roadmap'
        description='Agentic product direction'
        items={roadmapItems}
        kind='productRoadmap'
        dataCapture='roadmap-timeline-test'
      />
    )

    const region = getByRole('region', { name: 'Greenhouse roadmap' })

    expect(region).toHaveAttribute('data-capture', 'roadmap-timeline-test')
    expect(region).toHaveAttribute('data-kind', 'productRoadmap')
    expect(region).toHaveAttribute('data-variant', 'horizontal')
    expect(getAllByRole('listitem')).toHaveLength(roadmapItems.length)
    expect(getByText('Completado')).toBeInTheDocument()
    expect(getByText('En curso')).toBeInTheDocument()
    expect(getByText('Próximo')).toBeInTheDocument()
    expect(getByText('Now')).toBeInTheDocument()
  })

  it('marks the active roadmap item as the current step', () => {
    const { getAllByRole } = renderWithTheme(
      <GreenhouseRoadmapTimeline
        ariaLabel='Release timeline'
        items={roadmapItems}
        variant='stacked'
        kind='releasePlan'
      />
    )

    expect(getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step')
  })

  it('normalizes imported status aliases and resolves kind defaults', () => {
    expect(normalizeGreenhouseRoadmapTimelineStatus('done')).toBe('complete')
    expect(normalizeGreenhouseRoadmapTimelineStatus('in-progress')).toBe('active')
    expect(normalizeGreenhouseRoadmapTimelineStatus('upcoming')).toBe('pending')
    expect(resolveGreenhouseRoadmapTimelineVariant({ kind: 'clientOnboarding' })).toBe('stacked')
    expect(resolveGreenhouseRoadmapTimelineVariant({ kind: 'productRoadmap', variant: 'compact' })).toBe('compact')
  })
})
