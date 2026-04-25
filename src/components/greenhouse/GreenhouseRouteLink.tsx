'use client'

import { forwardRef } from 'react'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'

import Link from 'next/link'
import type { LinkProps } from 'next/link'

type GreenhouseRouteLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | 'href'> & {
    fallbackDelayMs?: number
  }

const isPlainLeftClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey

const getCurrentUrl = () => `${window.location.pathname}${window.location.search}${window.location.hash}`

const GreenhouseRouteLink = forwardRef<HTMLAnchorElement, GreenhouseRouteLinkProps>(
  ({ href, onClick, target, fallbackDelayMs = 1600, ...props }, ref) => {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)

      if (event.defaultPrevented || target || !isPlainLeftClick(event) || typeof href !== 'string') {
        return
      }

      const targetUrl = href

      if (!targetUrl.startsWith('/') || targetUrl === getCurrentUrl()) {
        return
      }

      const startingUrl = getCurrentUrl()

      window.setTimeout(() => {
        if (getCurrentUrl() === startingUrl) {
          window.location.assign(targetUrl)
        }
      }, fallbackDelayMs)
    }

    return <Link ref={ref} href={href} target={target} onClick={handleClick} {...props} />
  }
)

GreenhouseRouteLink.displayName = 'GreenhouseRouteLink'

export default GreenhouseRouteLink
