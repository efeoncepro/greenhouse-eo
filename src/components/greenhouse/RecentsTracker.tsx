'use client'

import { useEffect, useRef } from 'react'

import { usePathname } from 'next/navigation'

/**
 * TASK-696 Wave 5 — Recents tracker beacon.
 *
 * Mounted once at the dashboard layout level. On every route change,
 * inspects the new pathname against a small set of regex patterns and
 * fires a POST to /api/home/recents/track if it matches a tracked
 * entity kind. The endpoint upserts greenhouse_serving.user_recent_items
 * so the Smart Home v2 Recents Rail starts populating from real visits.
 *
 * Intentionally lightweight: no Redux, no Context, no global store —
 * just usePathname() + fetch with `keepalive: true` so the beacon
 * survives tab close.
 */

interface TrackedRoute {
  pattern: RegExp
  kind: string
  buildTitle?: (match: RegExpMatchArray, search: URLSearchParams) => string | null
}

const TRACKED: TrackedRoute[] = [
  { pattern: /^\/agency\/spaces\/([\w-]+)/, kind: 'space', buildTitle: m => `Space ${m[1].slice(0, 8)}` },
  { pattern: /^\/proyectos\/([\w-]+)/, kind: 'project', buildTitle: m => `Proyecto ${m[1].slice(0, 8)}` },
  { pattern: /^\/finance\/income\/([\w-]+)/, kind: 'invoice', buildTitle: m => `Factura ${m[1].slice(0, 8)}` },
  { pattern: /^\/commercial\/quotes\/([\w-]+)/, kind: 'quote', buildTitle: m => `Cotización ${m[1].slice(0, 8)}` },
  { pattern: /^\/hr\/payroll\/periods\/([\w-]+)/, kind: 'payroll_period', buildTitle: m => `Nómina ${m[1]}` },
  { pattern: /^\/people\/([\w-]+)/, kind: 'member', buildTitle: m => `Persona ${m[1].slice(0, 8)}` }
]

const fireBeacon = (kind: string, entityId: string, title: string | null, href: string) => {
  try {
    const body = JSON.stringify({ entityKind: kind, entityId, title, href })

    fetch('/api/home/recents/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {})
  } catch {
    // never block navigation
  }
}

export const RecentsTracker = () => {
  const pathname = usePathname()
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname === lastTracked.current) return

    for (const route of TRACKED) {
      const match = pathname.match(route.pattern)

      if (!match) continue
      const search = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      const title = route.buildTitle?.(match, search) ?? null

      fireBeacon(route.kind, match[1], title, pathname)
      lastTracked.current = pathname
      break
    }
  }, [pathname])

  return null
}

export default RecentsTracker
