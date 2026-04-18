// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import CurrencySwitcher from './CurrencySwitcher'

afterEach(cleanup)

describe('CurrencySwitcher', () => {
  it('renders the visible label "Moneda" from nomenclature', () => {
    const { getByLabelText } = renderWithTheme(<CurrencySwitcher value='CLP' onChange={() => {}} />)

    expect(getByLabelText('Moneda')).toBeInTheDocument()
  })

  it('reflects the current value in the select', () => {
    const { getByRole } = renderWithTheme(<CurrencySwitcher value='USD' onChange={() => {}} />)

    expect(getByRole('combobox')).toHaveTextContent(/USD/)
  })

  it('invokes onChange with the new currency when selection changes', () => {
    const onChange = vi.fn()

    const { getByRole, getAllByRole } = renderWithTheme(
      <CurrencySwitcher value='CLP' onChange={onChange} />
    )

    fireEvent.mouseDown(getByRole('combobox'))
    const options = getAllByRole('option')
    const usdOption = options.find(o => o.textContent?.includes('USD'))

    expect(usdOption).toBeDefined()
    fireEvent.click(usdOption!)

    expect(onChange).toHaveBeenCalledWith('USD')
  })

  it('hides disclaimer when exchange rate snapshot base matches current value', () => {
    const { queryByText } = renderWithTheme(
      <CurrencySwitcher
        value='CLP'
        onChange={() => {}}
        exchangeRateSnapshot={{ base: 'CLP', rate: 1, asOf: '2026-04-18' }}
      />
    )

    expect(queryByText(/Vista interna/)).not.toBeInTheDocument()
  })

  it('shows disclaimer with base currency and formatted rate when view differs from snapshot', () => {
    const { getByText } = renderWithTheme(
      <CurrencySwitcher
        value='USD'
        onChange={() => {}}
        exchangeRateSnapshot={{ base: 'CLP', rate: 945.2, asOf: '2026-04-18' }}
      />
    )

    expect(getByText(/Vista interna/)).toBeInTheDocument()
    expect(getByText(/CLP/)).toBeInTheDocument()
    expect(getByText(/945,20/)).toBeInTheDocument()
  })

  it('exposes the 6 LatAm-focused currencies aligned with pricing engine v2', () => {
    const { getByRole, getAllByRole } = renderWithTheme(
      <CurrencySwitcher value='CLP' onChange={() => {}} />
    )

    fireEvent.mouseDown(getByRole('combobox'))
    const options = getAllByRole('option')
    const codes = options.map(o => o.textContent?.split('·')[0]?.trim())

    expect(codes).toEqual(['CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN'])
  })

  it('disables the select when disabled=true', () => {
    const { getByRole } = renderWithTheme(
      <CurrencySwitcher value='CLP' onChange={() => {}} disabled />
    )

    expect(getByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
  })
})
