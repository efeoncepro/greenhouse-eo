// @vitest-environment jsdom

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseEvidenceAttachmentDropzone from '../GreenhouseEvidenceAttachmentDropzone'
import type { GreenhouseEvidenceAttachmentState } from '../GreenhouseEvidenceAttachmentDropzone'

const states: GreenhouseEvidenceAttachmentState[] = ['idle', 'uploading', 'scanning', 'verified', 'rejected', 'disabled']

afterEach(cleanup)

describe('GreenhouseEvidenceAttachmentDropzone', () => {
  it.each(states)('renders %s state with accessible semantics', state => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseEvidenceAttachmentDropzone
        state={state}
        title='Adjuntar respaldo'
        description='Carga evidencia operacional.'
        fileName={state === 'idle' ? undefined : 'respaldo.pdf'}
        dataCapture={`evidence-${state}`}
      />
    )

    const region = getByRole(state === 'rejected' ? 'alert' : 'status')

    expect(region).toHaveAttribute('data-state', state)
    expect(region).toHaveAttribute('data-capture', `evidence-${state}`)
    expect(getByText('Adjuntar respaldo')).toBeInTheDocument()
  })

  it('runs optional remove handler', () => {
    const onRemove = vi.fn()

    const { getByRole } = renderWithTheme(
      <GreenhouseEvidenceAttachmentDropzone state='verified' title='Evidencia verificada' fileName='respaldo.pdf' onRemove={onRemove} />
    )

    fireEvent.click(getByRole('button', { name: 'Quitar' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
