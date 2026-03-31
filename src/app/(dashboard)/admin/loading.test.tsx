// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import Loading from './loading'

describe('/admin loading', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a rich skeleton shell for hero, KPIs, table rows and domain cards', () => {
    const { container } = renderWithTheme(<Loading />)

    expect(container.querySelectorAll('.MuiCard-root').length).toBeGreaterThanOrEqual(13)
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(40)
  })
})
