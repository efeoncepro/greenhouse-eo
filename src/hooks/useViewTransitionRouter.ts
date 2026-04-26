'use client'

import { useCallback } from 'react'

import { useRouter } from 'next/navigation'

import { startViewTransition } from '@/lib/motion/view-transition'

/**
 * TASK-525 — Drop-in replacement for `useRouter()` that wraps `push`,
 * `replace` and `back` in `document.startViewTransition`.
 *
 * Use this hook in any client component that triggers programmatic
 * navigation on a click handler (lists with `onClick={() => router.push(...)}`,
 * "Edit" buttons, etc.). For declarative `<Link>` use cases reach for
 * `ViewTransitionLink` instead.
 *
 * The wrapper is safe in unsupported browsers (falls back to instant
 * navigation) and respects `prefers-reduced-motion`.
 */
const useViewTransitionRouter = () => {
  const router = useRouter()

  const push = useCallback(
    (href: string, options?: Parameters<typeof router.push>[1]) => {
      void startViewTransition(() => {
        router.push(href, options)
      })
    },
    [router]
  )

  const replace = useCallback(
    (href: string, options?: Parameters<typeof router.replace>[1]) => {
      void startViewTransition(() => {
        router.replace(href, options)
      })
    },
    [router]
  )

  const back = useCallback(() => {
    void startViewTransition(() => {
      router.back()
    })
  }, [router])

  return { push, replace, back, refresh: router.refresh, prefetch: router.prefetch }
}

export default useViewTransitionRouter
