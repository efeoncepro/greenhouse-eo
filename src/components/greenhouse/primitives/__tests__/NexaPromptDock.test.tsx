// @vitest-environment jsdom

import { cleanup, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import NexaPromptDock from '../nexa-prompt-dock/NexaPromptDock'
import {
  resolveNexaPromptDockCopy,
  resolveNexaPromptDockKind,
  resolveNexaPromptDockVariant
} from '../nexa-prompt-dock/nexa-prompt-dock-controller'

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

describe('NexaPromptDock', () => {
  it('resolves semantic kinds to official variants and copy', () => {
    expect(resolveNexaPromptDockKind('knowledgeAsk').variant).toBe('inlinePanel')
    expect(resolveNexaPromptDockVariant(undefined, 'contextualAction').variant).toBe('floatingPrompt')
    expect(resolveNexaPromptDockVariant('compactDock', 'knowledgeAsk').variant).toBe('compactDock')
    expect(resolveNexaPromptDockCopy('surfaceFollowUp').submitLabel).toBe('Enviar follow-up')
  })

  it('opens from the collapsed dock and submits with meta enter', async () => {
    const onSubmit = vi.fn()
    const { getByRole, getByPlaceholderText } = renderWithTheme(<NexaPromptDock onSubmit={onSubmit} />)

    fireEvent.click(getByRole('button', { name: /preguntar a nexa/i }))

    const input = getByPlaceholderText('Escribe tu pregunta para Nexa')

    fireEvent.change(input, { target: { value: 'Resume este contrato' } })
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true })

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Resume este contrato'))
    expect(getByRole('button', { name: /pregunta enviada/i })).toBeInTheDocument()
  })

  it('closes the expanded panel with escape', () => {
    const { getByRole, getByPlaceholderText, queryByPlaceholderText } = renderWithTheme(<NexaPromptDock />)

    fireEvent.click(getByRole('button', { name: /preguntar a nexa/i }))

    const input = getByPlaceholderText('Escribe tu pregunta para Nexa')

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(queryByPlaceholderText('Escribe tu pregunta para Nexa')).not.toBeInTheDocument()
    expect(getByRole('button', { name: /preguntar a nexa/i })).toBeInTheDocument()
  })
})
