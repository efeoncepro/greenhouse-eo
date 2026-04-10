// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import VerifiedByEfeonceBadge from './VerifiedByEfeonceBadge'

describe('VerifiedByEfeonceBadge', () => {
  it('renders inline verification copy and Efeonce wordmark in spanish', () => {
    const { getByRole, getByText } = renderWithTheme(<VerifiedByEfeonceBadge />)

    expect(getByRole('img', { name: 'Verificado por Efeonce' })).toBeInTheDocument()
    expect(getByText('Verificado por')).toBeInTheDocument()
    expect(document.querySelector('img[alt="Efeonce"]')).toBeInTheDocument()
  })

  it('renders english copy when locale is en', () => {
    const { getByRole, getByText } = renderWithTheme(<VerifiedByEfeonceBadge locale='en' />)

    expect(getByRole('img', { name: 'Verified by Efeonce' })).toBeInTheDocument()
    expect(getByText('Verified by')).toBeInTheDocument()
  })
})
