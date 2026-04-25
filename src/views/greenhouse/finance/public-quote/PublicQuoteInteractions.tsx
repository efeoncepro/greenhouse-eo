'use client'

import { useEffect, useRef } from 'react'

/**
 * TASK-631 — Client island that wires the interactive behaviors of the
 * public quote page WITHOUT pulling MUI or any heavy framework. Pure DOM
 * APIs to keep the bundle tiny.
 *
 * Behaviors:
 * - Sticky header progressive shadow (data-scrolled toggled by scroll-y > 20)
 * - Bundle accordions (toggle via [data-bundle-toggle])
 * - Term accordions (toggle via [data-term-toggle])
 * - Deep-link expand + 1.5s pulse highlight on the targeted term
 *
 * All behaviors degrade to no-op without JS (the page still renders all
 * sections fully expanded as fallback, see styles.module.css).
 */
export const PublicQuoteInteractions = () => {
  const lastScrolledState = useRef<boolean>(false)

  useEffect(() => {
    const headers = document.querySelectorAll<HTMLElement>('[data-quote-header]')

    const onScroll = () => {
      const isScrolled = window.scrollY > 20

      if (isScrolled === lastScrolledState.current) return
      lastScrolledState.current = isScrolled
      headers.forEach(h => h.setAttribute('data-scrolled', String(isScrolled)))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    // Bundle / term accordion toggles
    const onClick = (event: Event) => {
      const target = event.target as HTMLElement
      const bundleToggle = target.closest<HTMLElement>('[data-bundle-toggle]')

      if (bundleToggle) {
        const bundle = bundleToggle.closest<HTMLElement>('[data-bundle]')

        if (bundle) {
          const isOpen = bundle.getAttribute('data-open') === 'true'

          bundle.setAttribute('data-open', String(!isOpen))
          bundleToggle.setAttribute('aria-expanded', String(!isOpen))
        }

        
return
      }

      const termToggle = target.closest<HTMLElement>('[data-term-toggle]')

      if (termToggle) {
        const term = termToggle.closest<HTMLElement>('[data-term]')

        if (term) {
          const isOpen = term.getAttribute('data-open') === 'true'

          term.setAttribute('data-open', String(!isOpen))
          termToggle.setAttribute('aria-expanded', String(!isOpen))
        }
      }
    }

    document.addEventListener('click', onClick)

    // Deep-link term expand + pulse
    const hash = window.location.hash.replace('#', '')

    if (hash) {
      const target = document.getElementById(hash)

      if (target?.hasAttribute('data-term')) {
        target.setAttribute('data-open', 'true')
        const toggle = target.querySelector<HTMLElement>('[data-term-toggle]')

        toggle?.setAttribute('aria-expanded', 'true')

        // Pulse highlight
        target.setAttribute('data-highlight', 'true')

        const pulseTimeout = setTimeout(() => {
          target.removeAttribute('data-highlight')
        }, 1600)

        return () => {
          clearTimeout(pulseTimeout)
          window.removeEventListener('scroll', onScroll)
          document.removeEventListener('click', onClick)
        }
      }
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return null
}
