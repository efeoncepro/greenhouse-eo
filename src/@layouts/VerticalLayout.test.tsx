// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import VerticalLayout from './VerticalLayout'

vi.mock('@core/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      contentWidth: 'wide'
    }
  })
}))

describe('VerticalLayout', () => {
  it('keeps the shell constrained beside the sidebar', () => {
    const { container } = renderWithTheme(
      <VerticalLayout navigation={<div data-testid='nav'>Nav</div>} navbar={<div>Navbar</div>} footer={<div>Footer</div>}>
        <div>Content</div>
      </VerticalLayout>
    )

    const root = container.firstElementChild

    expect(root?.className).toContain('flex-auto')
    expect(root?.className).toContain('min-is-0')
    expect(root?.className).toContain('overflow-hidden')

    const contentWrapper = container.querySelector('.ts-vertical-layout-content-wrapper')

    expect(contentWrapper?.className).toContain('flex-auto')
    expect(contentWrapper?.className).toContain('min-is-0')
    expect(contentWrapper?.className).not.toContain('is-full')
  })
})
