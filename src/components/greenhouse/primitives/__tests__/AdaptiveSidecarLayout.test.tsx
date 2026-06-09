// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import AdaptiveSidecarLayout from '../AdaptiveSidecarLayout'
import ContextualSidecar from '../ContextualSidecar'

afterEach(cleanup)

const renderSidecarLayout = ({
  open = true,
  dirty = false,
  onOpenChange = vi.fn(),
  onDirtyCloseAttempt = vi.fn(),
  resizable = false,
  sidecarExtent = 'content',
  viewportShellReflow = 'none'
}: {
  open?: boolean
  dirty?: boolean
  onOpenChange?: (open: boolean) => void
  onDirtyCloseAttempt?: () => void
  resizable?: boolean
  sidecarExtent?: 'content' | 'viewport'
  viewportShellReflow?: 'none' | 'greenhouse-vertical-navbar'
} = {}) =>
  renderWithTheme(
    <AdaptiveSidecarLayout
      open={open}
      onOpenChange={onOpenChange}
      preferredMode='inline'
      sidecarWidth={420}
      sidecarMinWidth={360}
      sidecarMaxWidth={560}
      resizable={resizable}
      sidecarExtent={sidecarExtent}
      viewportOffsetTop='calc(var(--header-height, 54px) + 24px)'
      viewportShellReflow={viewportShellReflow}
      sidecar={
        <ContextualSidecar title='Inspector' onClose={() => onOpenChange(false)}>
          <p>Detalle contextual</p>
        </ContextualSidecar>
      }
      dirty={dirty}
      onDirtyCloseAttempt={onDirtyCloseAttempt}
      dataCapture='test-sidecar'
    >
      <main>Contenido principal</main>
    </AdaptiveSidecarLayout>
  )

describe('AdaptiveSidecarLayout', () => {
  it('renders main content and sidecar in inline layout when open', () => {
    const { getByText, getByRole, container } = renderSidecarLayout()

    expect(getByText('Contenido principal')).toBeInTheDocument()
    expect(getByRole('complementary', { name: 'Inspector' })).toHaveTextContent('Detalle contextual')
    expect(container.querySelector('[data-sidecar-mode="inline"]')).toBeInTheDocument()
  })

  it('does not render the sidecar when closed', () => {
    const { getByText, queryByRole, container } = renderSidecarLayout({ open: false })

    expect(getByText('Contenido principal')).toBeInTheDocument()
    expect(queryByRole('complementary', { name: 'Inspector' })).not.toBeInTheDocument()
    expect(container.querySelector('[data-sidecar-mode="closed"]')).toBeInTheDocument()
  })

  it('emits close through the provided state callback', () => {
    const onOpenChange = vi.fn()
    const { getByRole } = renderSidecarLayout({ onOpenChange })

    fireEvent.click(getByRole('button', { name: 'Cerrar panel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders an accessible resize handle when inline sidecars are resizable', () => {
    const { getByRole, container } = renderSidecarLayout({ resizable: true })
    const handle = getByRole('separator', { name: 'Ajustar ancho del panel contextual' })

    expect(handle).toHaveAttribute('aria-valuemin', '360')
    expect(handle).toHaveAttribute('aria-valuemax', '560')
    expect(handle).toHaveAttribute('aria-valuenow', '420')

    fireEvent.keyDown(handle, { key: 'ArrowLeft' })

    expect(container.querySelector('[data-sidecar-width="436"]')).toBeInTheDocument()
  })

  it('marks viewport sidecars as shell-aware lanes when inline', () => {
    const { container } = renderSidecarLayout({
      resizable: true,
      sidecarExtent: 'viewport',
      viewportShellReflow: 'greenhouse-vertical-navbar'
    })

    expect(container.querySelector('[data-sidecar-extent="viewport"]')).toBeInTheDocument()
    expect(container.querySelector('[data-sidecar-shell-reflow="greenhouse-vertical-navbar"]')).toBeInTheDocument()
    expect(container.querySelector('[data-sidecar-mode="inline"]')).toBeInTheDocument()
  })

  it('calls the dirty close guard from the layout close path', () => {
    const onOpenChange = vi.fn()
    const onDirtyCloseAttempt = vi.fn()

    const { getByRole } = renderWithTheme(
      <AdaptiveSidecarLayout
        open
        onOpenChange={onOpenChange}
        dirty
        onDirtyCloseAttempt={onDirtyCloseAttempt}
        preferredMode='temporary'
        sidecar={<ContextualSidecar title='Formulario'>Pendiente</ContextualSidecar>}
      >
        <main>Contenido principal</main>
      </AdaptiveSidecarLayout>
    )

    fireEvent.keyDown(getByRole('presentation').firstChild as Element, { key: 'Escape' })

    expect(onDirtyCloseAttempt).toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
