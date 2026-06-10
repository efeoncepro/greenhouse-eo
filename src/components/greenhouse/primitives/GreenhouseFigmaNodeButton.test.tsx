// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'
import GreenhouseFigmaNodeButton, {
  AXIS_FILE_KEY,
  buildFigmaNodeUrl
} from '@/components/greenhouse/primitives/GreenhouseFigmaNodeButton'

describe('buildFigmaNodeUrl', () => {
  it('normalizes the API node form (:) to the URL form (-)', () => {
    const url = buildFigmaNodeUrl('205:234905')

    expect(url).toContain(`/design/${AXIS_FILE_KEY}/`)
    expect(url).toContain('node-id=205-234905')
    expect(url).toContain('m=dev')
    expect(url).not.toContain('205:234905')
  })

  it('accepts the URL form unchanged + honors a custom file key', () => {
    const url = buildFigmaNodeUrl('11205-5341', 'CUSTOMKEY', 'My-File')

    expect(url).toBe('https://www.figma.com/design/CUSTOMKEY/My-File?node-id=11205-5341&m=dev')
  })
})

describe('GreenhouseFigmaNodeButton (TASK Figma node primitive)', () => {
  it('renders an active link to the Figma node when a nodeId is given', () => {
    const { container } = renderWithTheme(<GreenhouseFigmaNodeButton nodeId='205:234905' />)

    const anchor = container.querySelector('a[href*="figma.com"]')

    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute('href')).toContain('node-id=205-234905')
    expect(anchor?.getAttribute('target')).toBe('_blank')
    expect(anchor?.getAttribute('rel')).toContain('noopener')
  })

  it('renders disabled (no link) when no node is associated — create-it signal', () => {
    const { container, getByText } = renderWithTheme(<GreenhouseFigmaNodeButton nodeId={null} />)

    expect(getByText('Nodo Figma')).toBeInTheDocument()
    expect(container.querySelector('a[href*="figma.com"]')).toBeNull()
    expect(container.querySelector('.Mui-disabled')).not.toBeNull()
  })

  it('treats an empty/whitespace node as unassociated', () => {
    const { container } = renderWithTheme(<GreenhouseFigmaNodeButton nodeId='   ' />)

    expect(container.querySelector('a[href*="figma.com"]')).toBeNull()
    expect(container.querySelector('.Mui-disabled')).not.toBeNull()
  })
})
