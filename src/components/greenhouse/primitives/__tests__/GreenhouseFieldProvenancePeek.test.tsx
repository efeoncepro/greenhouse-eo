// @vitest-environment jsdom

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseFieldProvenancePeek from '../GreenhouseFieldProvenancePeek'

afterEach(cleanup)

describe('GreenhouseFieldProvenancePeek', () => {
  it('opens provenance details from the trigger', () => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseFieldProvenancePeek
        source='integration'
        confidence='verified'
        freshness='recent'
        fieldLabel='Revenue owner'
        sourceLabel='HubSpot CRM'
        triggerLabel='HubSpot'
        referenceId='HS-20481'
        dataCapture='field-provenance'
      />
    )

    const trigger = getByRole('button', { name: 'Ver procedencia de Revenue owner' })

    expect(trigger).toHaveAttribute('data-source', 'integration')
    expect(trigger).toHaveAttribute('data-capture', 'field-provenance')

    fireEvent.click(trigger)

    expect(getByRole('dialog')).toBeInTheDocument()
    expect(getByText('HubSpot CRM')).toBeInTheDocument()
    expect(getByText('HS-20481')).toBeInTheDocument()
  })
})
