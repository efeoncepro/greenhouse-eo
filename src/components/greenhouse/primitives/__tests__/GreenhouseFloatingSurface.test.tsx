// @vitest-environment jsdom

import { useState } from 'react'

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseFloatingSurface from '../GreenhouseFloatingSurface'
import type { GreenhouseFloatingSurfaceProps } from '../GreenhouseFloatingSurface'

afterEach(cleanup)

const renderSurface = (props: Partial<GreenhouseFloatingSurfaceProps> = {}) =>
  renderWithTheme(
    <GreenhouseFloatingSurface
      variant='evidencePeek'
      kind='costProvenance'
      ariaLabel='Detalle de evidencia'
      dataCapture='evidence-peek'
      anchor={anchorProps => (
        <button type='button' {...anchorProps}>
          Ver evidencia
        </button>
      )}
      content={({ close }) => (
        <div>
          <p>Contenido de la evidencia</p>
          <button type='button' onClick={close}>
            Cerrar
          </button>
        </div>
      )}
      {...props}
    />
  )

describe('GreenhouseFloatingSurface', () => {
  it('exposes resolved-variant + state data hooks on the anchor', () => {
    renderSurface()

    const anchor = screen.getByRole('button', { name: 'Ver evidencia' })

    expect(anchor).toHaveAttribute('data-gh-floating-anchor', 'evidencePeek')
    expect(anchor).toHaveAttribute('data-state', 'closed')
  })

  it('opens on click and renders content inside the managed surface (dialog role)', async () => {
    renderSurface()

    fireEvent.click(screen.getByRole('button', { name: 'Ver evidencia' }))

    const surface = await screen.findByRole('dialog')

    expect(surface).toHaveAttribute('data-gh-floating-surface', 'evidencePeek')
    expect(surface).toHaveAttribute('data-gh-floating-surface-kind', 'costProvenance')
    expect(surface).toHaveAttribute('data-capture', 'evidence-peek')
    expect(surface).toHaveAttribute('aria-label', 'Detalle de evidencia')
    expect(screen.getByText('Contenido de la evidencia')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    renderSurface()

    fireEvent.click(screen.getByRole('button', { name: 'Ver evidencia' }))
    await screen.findByRole('dialog')

    fireEvent.keyDown(document.body, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes via the content close() render-prop', async () => {
    renderSurface()

    fireEvent.click(screen.getByRole('button', { name: 'Ver evidencia' }))
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('supports controlled open state and reports changes', async () => {
    const onOpenChange = vi.fn()

    const Controlled = () => {
      const [open, setOpen] = useState(true)

      return (
        <GreenhouseFloatingSurface
          variant='evidencePeek'
          open={open}
          onOpenChange={next => {
            onOpenChange(next)
            setOpen(next)
          }}
          ariaLabel='Surface controlada'
          anchor={anchorProps => (
            <button type='button' {...anchorProps}>
              Anchor
            </button>
          )}
          content={() => <p>Surface controlada abierta</p>}
        />
      )
    }

    renderWithTheme(<Controlled />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document.body, { key: 'Escape' })

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('uses menu role for the actionMenu variant', async () => {
    renderWithTheme(
      <GreenhouseFloatingSurface
        variant='actionMenu'
        ariaLabel='Acciones de fila'
        anchor={anchorProps => (
          <button type='button' {...anchorProps}>
            Acciones
          </button>
        )}
        content={() => <div>Editar · Duplicar · Archivar</div>}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }))

    expect(await screen.findByRole('menu')).toBeInTheDocument()
  })

  it('opens read-only tooltip variants on focus (keyboard reachable, no focus trap)', async () => {
    renderWithTheme(
      <GreenhouseFloatingSurface
        variant='richTooltip'
        ariaLabel='Ayuda de métrica'
        anchor={anchorProps => (
          <button type='button' {...anchorProps}>
            Métrica
          </button>
        )}
        content={() => <span>Cómo se calcula esta métrica</span>}
      />
    )

    fireEvent.focus(screen.getByRole('button', { name: 'Métrica' }))

    expect(await screen.findByRole('tooltip')).toBeInTheDocument()
  })

  it('keeps inline editors open on outside press (dirty-state safety) but closes on Escape', async () => {
    renderWithTheme(
      <GreenhouseFloatingSurface
        variant='inlineEditor'
        ariaLabel='Editor inline'
        anchor={anchorProps => (
          <button type='button' {...anchorProps}>
            Editar
          </button>
        )}
        content={() => <input aria-label='Valor' defaultValue='100' />}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await screen.findByRole('dialog')

    fireEvent.pointerDown(document.body)
    fireEvent.mouseDown(document.body)

    // Outside press must NOT discard the editor.
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
