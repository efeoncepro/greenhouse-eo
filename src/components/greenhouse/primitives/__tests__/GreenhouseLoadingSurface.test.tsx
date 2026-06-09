// @vitest-environment jsdom

import type { ComponentType } from 'react'

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseLoadingSurface, {
  GreenhouseCheckpointRailLoader,
  GreenhouseDocumentPipelineLoader,
  GreenhouseExternalHandoffLoader,
  GreenhouseInlineActionLoader,
  GreenhouseNexaReasoningLoader,
  GreenhousePageSkeletonLoader,
  GreenhousePanelSkeletonLoader,
  GreenhouseReconciliationMatchingLoader,
  GreenhouseSecureActionLoader,
  GreenhouseTableSkeletonLoader,
  GreenhouseUploadVerificationLoader,
  GreenhouseWorkspaceBootLoader
} from '../GreenhouseLoadingSurface'
import type { GreenhouseNamedLoadingSurfaceProps } from '../GreenhouseLoadingSurface'
import type { GreenhouseLoadingSurfaceVariant } from '../GreenhouseLoadingSurface'

const variants: GreenhouseLoadingSurfaceVariant[] = [
  'pageSkeleton',
  'panelSkeleton',
  'tableSkeleton',
  'inlineAction',
  'brandSplash',
  'aiThinking',
  'progressRail',
  'documentPipeline',
  'externalHandoff',
  'secureAction',
  'uploadVerification',
  'reconciliationMatching'
]

const customSteps = [
  { label: 'Context resolved', status: 'done' as const },
  { label: 'Evidence running', status: 'active' as const },
  { label: 'Result pending', status: 'pending' as const }
]

const namedComponents: Array<{
  name: string
  Component: ComponentType<GreenhouseNamedLoadingSurfaceProps>
}> = [
  { name: 'GreenhousePageSkeletonLoader', Component: GreenhousePageSkeletonLoader },
  { name: 'GreenhousePanelSkeletonLoader', Component: GreenhousePanelSkeletonLoader },
  { name: 'GreenhouseTableSkeletonLoader', Component: GreenhouseTableSkeletonLoader },
  { name: 'GreenhouseInlineActionLoader', Component: GreenhouseInlineActionLoader },
  { name: 'GreenhouseWorkspaceBootLoader', Component: GreenhouseWorkspaceBootLoader },
  { name: 'GreenhouseNexaReasoningLoader', Component: GreenhouseNexaReasoningLoader },
  { name: 'GreenhouseCheckpointRailLoader', Component: GreenhouseCheckpointRailLoader },
  { name: 'GreenhouseDocumentPipelineLoader', Component: GreenhouseDocumentPipelineLoader },
  { name: 'GreenhouseExternalHandoffLoader', Component: GreenhouseExternalHandoffLoader },
  { name: 'GreenhouseSecureActionLoader', Component: GreenhouseSecureActionLoader },
  { name: 'GreenhouseUploadVerificationLoader', Component: GreenhouseUploadVerificationLoader },
  { name: 'GreenhouseReconciliationMatchingLoader', Component: GreenhouseReconciliationMatchingLoader }
]

afterEach(cleanup)

describe('GreenhouseLoadingSurface', () => {
  it.each(variants)('renders %s as an accessible loading status', variant => {
    const { getByRole } = renderWithTheme(
      <GreenhouseLoadingSurface
        variant={variant}
        title={`Loading ${variant}`}
        description='Preparing the surface.'
        dataCapture={`test-${variant}`}
      />
    )

    const status = getByRole('status')

    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-label', `Loading ${variant}. Preparing the surface.`)
    expect(status).toHaveAttribute('data-capture', `test-${variant}`)
  })

  it('renders progress rail custom steps', () => {
    const { getByText } = renderWithTheme(
      <GreenhouseLoadingSurface
        variant='progressRail'
        title='Running checks'
        description='Moving through checkpoints.'
        steps={customSteps}
      />
    )

    expect(getByText('Context resolved')).toBeInTheDocument()
    expect(getByText('Evidence running')).toBeInTheDocument()
    expect(getByText('Result pending')).toBeInTheDocument()
  })

  it.each(namedComponents)('renders named primitive %s as an accessible loading status', ({ name, Component }) => {
    const { getByRole } = renderWithTheme(
      <Component title={name} description='Preparing the named primitive.' dataCapture={`test-${name}`} />
    )

    const status = getByRole('status')

    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveAttribute('aria-label', `${name}. Preparing the named primitive.`)
    expect(status).toHaveAttribute('data-capture', `test-${name}`)
  })

  it('renders when reduced motion is preferred', () => {
    const originalMatchMedia = window.matchMedia

    window.matchMedia = (query: string) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      }) as MediaQueryList

    const { getByRole } = renderWithTheme(
      <GreenhouseLoadingSurface
        variant='aiThinking'
        title='Nexa reasoning'
        description='Checking context.'
      />
    )

    expect(getByRole('status')).toBeInTheDocument()
    window.matchMedia = originalMatchMedia
  })
})
