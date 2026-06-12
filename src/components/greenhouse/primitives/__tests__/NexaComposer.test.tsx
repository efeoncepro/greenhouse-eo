// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import NexaComposer, { NexaComposerInput } from '../NexaComposer'
import { resolveNexaComposerKind, resolveNexaComposerVariant } from '../nexa-composer-controller'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('NexaComposer', () => {
  it('resolves the knowledge ask kind to the command variant', () => {
    expect(resolveNexaComposerKind('knowledgeAsk').variant).toBe('command')
    expect(resolveNexaComposerVariant(undefined, 'knowledgeAsk').shortcutLabel).toBe('⌘ K')
  })

  it('renders the command input with Nexa mark and shortcut affordance', () => {
    const { getByRole, getByText } = renderWithTheme(
      <NexaComposer kind='knowledgeAsk'>
        <NexaComposerInput kind='knowledgeAsk' placeholder='Pregúntale a Nexa' />
      </NexaComposer>
    )

    expect(getByRole('textbox', { name: 'Pregúntale a Nexa' })).toBeInTheDocument()
    expect(getByRole('img', { name: 'Nexa' })).toBeInTheDocument()
    expect(getByText('⌘ K')).toBeInTheDocument()
  })
})
