'use client'

import { forwardRef, type ComponentProps, type MouseEvent } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { startViewTransition } from '@/lib/motion/view-transition'

type LinkProps = ComponentProps<typeof Link>

/**
 * TASK-525 — `next/link` drop-in that runs the route change inside
 * `document.startViewTransition`.
 *
 * Why a dedicated component instead of patching every `<Link>`:
 * - We need access to the click event to skip modifier clicks
 *   (cmd / ctrl / shift / middle-click open in new tab — never animate).
 * - We must call `router.push` ourselves inside the transition, so we
 *   `preventDefault()` on the native Link click and delegate.
 * - Falls back transparently when the browser does not support view
 *   transitions (the helper runs the update synchronously).
 *
 * The component preserves prefetching, hover behavior and ref forwarding —
 * everything an internal `<Link>` already gives us.
 */
const ViewTransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(function ViewTransitionLink(
  { onClick, href, replace = false, scroll, ...rest },
  ref
) {
  const router = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (event.defaultPrevented) return

    // Bail out for modifier-keyed clicks, target=_blank, non-left clicks, or
    // any href the consumer is not letting us own (only string hrefs work
    // with router.push without extra serialization).
    const isLeftClick = event.button === 0
    const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    const targetBlank = (event.currentTarget as HTMLAnchorElement).target === '_blank'

    if (!isLeftClick || hasModifier || targetBlank || typeof href !== 'string') return

    event.preventDefault()

    void startViewTransition(() => {
      if (replace) {
        router.replace(href, { scroll })
      } else {
        router.push(href, { scroll })
      }
    })
  }

  return <Link ref={ref} href={href} replace={replace} scroll={scroll} onClick={handleClick} {...rest} />
})

export default ViewTransitionLink
