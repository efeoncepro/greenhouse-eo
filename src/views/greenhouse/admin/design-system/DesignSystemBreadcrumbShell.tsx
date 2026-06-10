'use client'

import { useCallback, type ReactNode } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

import {
  GreenhouseBreadcrumbs,
  type GreenhouseBreadcrumbItem
} from '@/components/greenhouse/primitives'
import type { DesignSystemFigmaNodeMap } from '@/lib/design-system/figma-nodes/store'

import FigmaNodeLinkAffordance, {
  type FigmaNodeLinkResult
} from './figma-link/FigmaNodeLinkAffordance'

const HOME_ROUTE = '/home'
const DESIGN_SYSTEM_ROUTE = '/design-system'

const DESIGN_SYSTEM_ROUTE_LABELS = {
  [DESIGN_SYSTEM_ROUTE]: 'Design System',
  [`${DESIGN_SYSTEM_ROUTE}/breadcrumbs`]: 'Breadcrumbs',
  [`${DESIGN_SYSTEM_ROUTE}/buttons`]: 'Buttons',
  [`${DESIGN_SYSTEM_ROUTE}/charts`]: 'Charts',
  [`${DESIGN_SYSTEM_ROUTE}/chips`]: 'Chips',
  [`${DESIGN_SYSTEM_ROUTE}/colors`]: 'AXIS Colors',
  [`${DESIGN_SYSTEM_ROUTE}/disclosure`]: 'Disclosure',
  [`${DESIGN_SYSTEM_ROUTE}/efeonce-brand`]: 'Efeonce Brand',
  [`${DESIGN_SYSTEM_ROUTE}/elevation`]: 'Elevation',
  [`${DESIGN_SYSTEM_ROUTE}/floating-surfaces`]: 'Floating Surfaces',
  [`${DESIGN_SYSTEM_ROUTE}/geometry`]: 'Geometry',
  [`${DESIGN_SYSTEM_ROUTE}/loaders`]: 'Loaders',
  [`${DESIGN_SYSTEM_ROUTE}/microinteractions`]: 'Microinteractions',
  [`${DESIGN_SYSTEM_ROUTE}/mockup/brand-color-comparison`]: 'Brand Color Comparison',
  [`${DESIGN_SYSTEM_ROUTE}/mockup/brand-color-proposal`]: 'Brand Color Proposal',
  [`${DESIGN_SYSTEM_ROUTE}/mockup/brand-color-system`]: 'Brand Color System',
  [`${DESIGN_SYSTEM_ROUTE}/motion`]: 'Motion',
  [`${DESIGN_SYSTEM_ROUTE}/nexa-brand`]: 'Nexa Brand',
  [`${DESIGN_SYSTEM_ROUTE}/talent-profile`]: 'Talent Profile',
  [`${DESIGN_SYSTEM_ROUTE}/typography`]: 'Typography',
  [`${DESIGN_SYSTEM_ROUTE}/typography/mockup`]: 'Typography Mockup',
  [`${DESIGN_SYSTEM_ROUTE}/utilities`]: 'Utilities'
} as const satisfies Record<string, string>

const DESIGN_SYSTEM_ROUTE_PARENTS = {
  [`${DESIGN_SYSTEM_ROUTE}/typography/mockup`]: `${DESIGN_SYSTEM_ROUTE}/typography`
} as const satisfies Record<string, keyof typeof DESIGN_SYSTEM_ROUTE_LABELS>

const normalizePathname = (pathname: string) => (pathname === '/' ? pathname : pathname.replace(/\/+$/, ''))

const fallbackLabel = (pathname: string) => {
  const segment = pathname.split('/').filter(Boolean).at(-1)

  if (!segment) return 'Design System'

  return segment
    .split('-')
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

const resolveDesignSystemBreadcrumbItems = (pathname: string): GreenhouseBreadcrumbItem[] => {
  const currentRoute = normalizePathname(pathname)

  const items: GreenhouseBreadcrumbItem[] = [
    {
      label: 'Greenhouse',
      href: HOME_ROUTE
    },
    {
      label: 'Design System',
      href: currentRoute === DESIGN_SYSTEM_ROUTE ? undefined : DESIGN_SYSTEM_ROUTE
    }
  ]

  const parentRoute = DESIGN_SYSTEM_ROUTE_PARENTS[currentRoute as keyof typeof DESIGN_SYSTEM_ROUTE_PARENTS]

  if (parentRoute) {
    items.push({
      label: DESIGN_SYSTEM_ROUTE_LABELS[parentRoute],
      href: parentRoute
    })
  }

  if (currentRoute !== DESIGN_SYSTEM_ROUTE) {
    items.push({
      label: DESIGN_SYSTEM_ROUTE_LABELS[currentRoute as keyof typeof DESIGN_SYSTEM_ROUTE_LABELS] ?? fallbackLabel(currentRoute)
    })
  }

  return items
}

export interface DesignSystemBreadcrumbShellProps {
  children: ReactNode
  /** Surface→AXIS-node map, resolved server-side from the SSOT (TASK-1072). */
  figmaNodeMap?: DesignSystemFigmaNodeMap
  /** Whether the subject holds `design_system.figma_node.link` (designer ∪ admin). */
  canLinkFigmaNode?: boolean
}

const DesignSystemBreadcrumbShell = ({
  children,
  figmaNodeMap = {},
  canLinkFigmaNode = false
}: DesignSystemBreadcrumbShellProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const currentRoute = normalizePathname(pathname)
  const breadcrumbItems = resolveDesignSystemBreadcrumbItems(pathname)
  // SSOT runtime: the node comes from the DB-fed map (TASK-1072), not the TS seed.
  const figmaNodeId = figmaNodeMap[currentRoute]?.nodeId ?? null

  const handleLink = useCallback(
    async (url: string): Promise<FigmaNodeLinkResult> => {
      try {
        const res = await fetch('/api/design-system/figma-nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surfaceKey: currentRoute, url })
        })

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null

          return { ok: false, error: payload?.error ?? 'No se pudo vincular el nodo. Reintenta.' }
        }

        // Re-fetch the server layout → the shell receives the refreshed SSOT map.
        router.refresh()

        return { ok: true }
      } catch {
        return { ok: false, error: 'No se pudo vincular el nodo. Reintenta.' }
      }
    },
    [currentRoute, router]
  )

  return (
    <Box data-capture='design-system-page-shell' sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        data-capture='design-system-page-breadcrumbs'
        sx={{
          inlineSize: '100%',
          maxInlineSize: 1360,
          mx: 'auto'
        }}
      >
        <Stack
          direction='row'
          alignItems='center'
          justifyContent='space-between'
          spacing={2}
          flexWrap='wrap'
          useFlexGap
        >
          <GreenhouseBreadcrumbs
            ariaLabel='Design system navigation'
            items={breadcrumbItems}
            kind='pageHierarchy'
            showIcons={false}
          />
          <FigmaNodeLinkAffordance nodeId={figmaNodeId} canLink={canLinkFigmaNode} onLink={handleLink} />
        </Stack>
      </Box>
      {children}
    </Box>
  )
}

export default DesignSystemBreadcrumbShell
