// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import ContextChipStrip from '../ContextChipStrip'

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

afterEach(cleanup)

const renderStrip = (overflowAfter: number | null) =>
  renderWithTheme(
    <ContextChipStrip ariaLabel='Filtros' overflowAfter={overflowAfter}>
      <span data-testid='chip-1'>Chip 1</span>
      <span data-testid='chip-2'>Chip 2</span>
      <span data-testid='chip-3'>Chip 3</span>
      <span data-testid='chip-4'>Chip 4</span>
      <span data-testid='chip-5'>Chip 5</span>
    </ContextChipStrip>
  )

describe('ContextChipStrip', () => {
  it('renders all children inline when overflowAfter is null', () => {
    const { getByTestId, queryByText } = renderStrip(null)

    for (let i = 1; i <= 5; i++) {
      expect(getByTestId(`chip-${i}`)).toBeInTheDocument()
    }

    expect(queryByText(/^\+/)).toBeNull()
  })

  it('renders all children inline when count <= overflowAfter', () => {
    const { getByTestId, queryByText } = renderStrip(5)

    for (let i = 1; i <= 5; i++) {
      expect(getByTestId(`chip-${i}`)).toBeInTheDocument()
    }

    expect(queryByText(/^\+/)).toBeNull()
  })

  it('renders only the first N inline and shows +M overflow chip when count > overflowAfter', () => {
    const { getByTestId, queryByTestId, getByText } = renderStrip(2)

    expect(getByTestId('chip-1')).toBeInTheDocument()
    expect(getByTestId('chip-2')).toBeInTheDocument()
    expect(queryByTestId('chip-3')).toBeNull()
    expect(getByText('+3 más')).toBeInTheDocument()
  })

  it('opens the overflow menu when the +M chip is clicked and reveals remaining children', () => {
    const { getByText, getByRole, getByTestId } = renderStrip(2)

    fireEvent.click(getByText('+3 más'))

    const menu = getByRole('menu', { name: /opciones adicionales/ })

    expect(menu).toBeInTheDocument()
    expect(getByTestId('chip-3')).toBeInTheDocument()
    expect(getByTestId('chip-4')).toBeInTheDocument()
    expect(getByTestId('chip-5')).toBeInTheDocument()
  })
})
