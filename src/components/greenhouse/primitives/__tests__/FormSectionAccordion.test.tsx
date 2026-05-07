// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import FormSectionAccordion from '../FormSectionAccordion'

afterEach(cleanup)

describe('FormSectionAccordion', () => {
  it('renders the title and exposes a button summary', () => {
    const { getByRole } = renderWithTheme(
      <FormSectionAccordion title='Detalle y notas'>
        <p>contenido</p>
      </FormSectionAccordion>
    )

    expect(getByRole('button', { name: /Detalle y notas/ })).toBeInTheDocument()
  })

  it('starts expanded when defaultExpanded=true and renders children', () => {
    const { getByText } = renderWithTheme(
      <FormSectionAccordion title='Sección' defaultExpanded>
        <p>contenido visible</p>
      </FormSectionAccordion>
    )

    expect(getByText('contenido visible')).toBeVisible()
  })

  it('renders summaryCount badge when provided', () => {
    const { getByText } = renderWithTheme(
      <FormSectionAccordion title='Sección' summaryCount={4}>
        <p>contenido</p>
      </FormSectionAccordion>
    )

    expect(getByText('4')).toBeInTheDocument()
  })

  it('omits the summaryCount badge when null', () => {
    const { queryByText } = renderWithTheme(
      <FormSectionAccordion title='Sección' summaryCount={null}>
        <p>contenido</p>
      </FormSectionAccordion>
    )

    expect(queryByText(/Sección/)).toBeInTheDocument()

    // No leftover digit nodes (the summary chip is the only badge in this primitive)
    expect(queryByText('0')).toBeNull()
  })

  it('wires aria-controls to the content id derived from the id prop', () => {
    const { getByRole } = renderWithTheme(
      <FormSectionAccordion id='my-section' title='Sección'>
        <p>contenido</p>
      </FormSectionAccordion>
    )

    expect(getByRole('button', { name: /Sección/ })).toHaveAttribute('aria-controls', 'my-section-content')
  })

  it('toggles when clicked', () => {
    const { getByRole, getByText } = renderWithTheme(
      <FormSectionAccordion title='Sección'>
        <p>contenido togglable</p>
      </FormSectionAccordion>
    )

    const button = getByRole('button', { name: /Sección/ })

    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(getByText('contenido togglable')).toBeVisible()
  })
})
