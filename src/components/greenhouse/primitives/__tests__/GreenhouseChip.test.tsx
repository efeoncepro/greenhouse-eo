// @vitest-environment jsdom

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseChip from '../GreenhouseChip'

afterEach(cleanup)

describe('GreenhouseChip', () => {
  it('exposes the canonical variant, tone and kind data contract', () => {
    const { getByText } = renderWithTheme(
      <GreenhouseChip label='Activo' variant='solid' tone='success' kind='status' dataCapture='chip-active' />
    )

    const chip = getByText('Activo').closest('.MuiChip-root')

    expect(chip).toHaveAttribute('data-variant', 'solid')
    expect(chip).toHaveAttribute('data-tone', 'success')
    expect(chip).toHaveAttribute('data-kind', 'status')
    expect(chip).toHaveAttribute('data-capture', 'chip-active')
  })

  it('renders avatar and closable affordance for input chips', () => {
    const onDelete = vi.fn()

    const { getByLabelText, getByText } = renderWithTheme(
      <GreenhouseChip
        label='Julio'
        variant='label'
        tone='primary'
        kind='input'
        avatarInitials='JR'
        closable
        closeLabel='Quitar Julio'
        onDelete={onDelete}
      />
    )

    expect(getByText('JR')).toBeInTheDocument()

    fireEvent.click(getByLabelText('Quitar Julio'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
