// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'
import NexaMentionText from '@/components/greenhouse/NexaMentionText'

const TEXT = 'Coordina con @[Daniela](member:mem-1) en @[Sky](space:spc-9)'

describe('NexaMentionText safe mode (TASK-1027)', () => {
  it('renders navigable chips by default (admin surfaces)', () => {
    const { container, getByText } = renderWithTheme(<NexaMentionText text={TEXT} />)

    expect(getByText('Daniela')).toBeInTheDocument()
    expect(container.querySelector('a[href="/people/mem-1"]')).not.toBeNull()
    expect(container.querySelector('a[href="/agency/spaces/spc-9"]')).not.toBeNull()
  })

  it('renders non-navigable chips in safe mode (self-service /my surfaces)', () => {
    const { container, getByText } = renderWithTheme(<NexaMentionText text={TEXT} safeMode />)

    // Labels stay human and visible…
    expect(getByText('Daniela')).toBeInTheDocument()
    expect(getByText('Sky')).toBeInTheDocument()
    // …but no link escapes to admin/agency surfaces.
    expect(container.querySelector('a[href="/people/mem-1"]')).toBeNull()
    expect(container.querySelector('a[href="/agency/spaces/spc-9"]')).toBeNull()
    expect(container.querySelector('a[href]')).toBeNull()
    // IDs are never shown as visible labels.
    expect(container.textContent).not.toContain('mem-1')
    expect(container.textContent).not.toContain('spc-9')
  })

  it('returns null for empty text', () => {
    const { container } = renderWithTheme(<NexaMentionText text={null} />)

    expect(container.firstChild).toBeNull()
  })
})
