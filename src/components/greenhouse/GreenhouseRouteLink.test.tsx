// @vitest-environment jsdom

import { forwardRef } from 'react'
import type { AnchorHTMLAttributes } from 'react'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GreenhouseRouteLink from './GreenhouseRouteLink'

const originalLocation = window.location

vi.mock('next/link', () => ({
  default: forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
    ({ href, onClick, children, ...props }, ref) => (
      <a
        ref={ref}
        href={String(href)}
        onClick={event => {
          onClick?.(event)
          event.preventDefault()
        }}
        {...props}
      >
        {children}
      </a>
    )
  )
}))

const mockLocation = (pathname = '/admin') => {
  const assign = vi.fn()

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      pathname,
      search: '',
      hash: '',
      assign
    }
  })

  return assign
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation
  })
})

describe('GreenhouseRouteLink', () => {
  it('falls back to document navigation when soft navigation leaves the URL unchanged', () => {
    const assign = mockLocation('/admin')

    render(
      <GreenhouseRouteLink href='/admin/integrations' fallbackDelayMs={50}>
        Cloud & Integrations
      </GreenhouseRouteLink>
    )

    fireEvent.click(screen.getByRole('link', { name: 'Cloud & Integrations' }))
    vi.advanceTimersByTime(50)

    expect(assign).toHaveBeenCalledWith('/admin/integrations')
  })

  it('does not fallback when the URL changed before the watchdog fires', () => {
    const assign = mockLocation('/admin')

    render(
      <GreenhouseRouteLink href='/admin/integrations' fallbackDelayMs={50}>
        Cloud & Integrations
      </GreenhouseRouteLink>
    )

    fireEvent.click(screen.getByRole('link', { name: 'Cloud & Integrations' }))
    window.location.pathname = '/admin/integrations'
    vi.advanceTimersByTime(50)

    expect(assign).not.toHaveBeenCalled()
  })
})
