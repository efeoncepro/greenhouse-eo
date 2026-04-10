// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GhIcon from './GhIcon'

describe('GhIcon', () => {
  it('resolves registered Greenhouse icon tokens', () => {
    const { container } = renderWithTheme(<GhIcon icon='linkedin' />)

    expect(container.querySelector('.fi-brands-linkedin')).toBeInTheDocument()
  })

  it('passes through raw icon classes for backward compatibility', () => {
    const { container } = renderWithTheme(<GhIcon icon='tabler-mail' />)

    expect(container.querySelector('.tabler-mail')).toBeInTheDocument()
  })
})

