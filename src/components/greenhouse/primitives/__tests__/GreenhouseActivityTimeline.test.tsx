// @vitest-environment jsdom

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseActivityTimeline from '../GreenhouseActivityTimeline'
import type { GreenhouseActivityTimelineItem } from '../GreenhouseActivityTimeline'

const items: GreenhouseActivityTimelineItem[] = [
  {
    id: 'paid',
    title: '12 invoices have been paid',
    timestamp: '12 min ago',
    description: 'Invoices have been paid to the company',
    tone: 'success',
    attachment: { label: 'invoices.pdf' }
  },
  {
    id: 'meeting',
    title: 'Client Meeting',
    timestamp: '45 min ago',
    description: 'Project meeting with john @10:15am',
    tone: 'info',
    person: { name: 'Lester McCarthy (Client)', description: 'CEO of ThemeSelection', initials: 'LM' }
  },
  {
    id: 'project',
    title: 'Create a new project for client',
    timestamp: '2 Day Ago',
    description: '6 team members in a project',
    tone: 'warning',
    avatars: [
      { id: 'a', alt: 'Ava One', initials: 'AO' },
      { id: 'b', alt: 'Ben Two', initials: 'BT' }
    ]
  }
]

afterEach(cleanup)

describe('GreenhouseActivityTimeline', () => {
  it('renders activity items as an accessible ordered timeline', () => {
    const { getByRole, getAllByRole, getByText } = renderWithTheme(
      <GreenhouseActivityTimeline
        title='Activity Timeline'
        items={items}
        variant='card'
        kind='activityTimeline'
        dataCapture='timeline-test'
      />
    )

    const region = getByRole('region', { name: 'Activity Timeline' })

    expect(region).toHaveAttribute('data-variant', 'card')
    expect(region).toHaveAttribute('data-kind', 'activityTimeline')
    expect(region).toHaveAttribute('data-capture', 'timeline-test')
    expect(getAllByRole('listitem')).toHaveLength(items.length)
    expect(getByText('invoices.pdf')).toBeInTheDocument()
    expect(getByText('Lester McCarthy (Client)')).toBeInTheDocument()
    expect(getByText('AO')).toBeInTheDocument()
  })

  it('supports embedded variant and optional header action', () => {
    const onAction = vi.fn()

    const { getByRole } = renderWithTheme(
      <GreenhouseActivityTimeline
        title='Contract audit trail'
        items={items.slice(0, 1)}
        variant='embedded'
        kind='auditTrail'
        actionLabel='Abrir acciones'
        onAction={onAction}
      />
    )

    fireEvent.click(getByRole('button', { name: 'Abrir acciones' }))

    expect(getByRole('region', { name: 'Contract audit trail' })).toHaveAttribute('data-variant', 'embedded')
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
