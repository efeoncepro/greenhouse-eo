'use client'

import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

import {
  GreenhouseBreadcrumbs,
  GreenhouseFigmaNodeButton,
  type GreenhouseBreadcrumbItem
} from '@/components/greenhouse/primitives'

import { resolveDesignSystemFigmaNode } from './design-system-figma-nodes'

const HOME_ROUTE = '/home'
const DESIGN_SYSTEM_ROUTE = '/design-system'

const DESIGN_SYSTEM_ROUTE_LABELS = {
  [DESIGN_SYSTEM_ROUTE]: 'Design System',
  [`${DESIGN_SYSTEM_ROUTE}/breadcrumbs`]: 'Breadcrumbs',
  [`${DESIGN_SYSTEM_ROUTE}/buttons`]: 'Buttons',
  [`${DESIGN_SYSTEM_ROUTE}/charts`]: 'Charts',
  [`${DESIGN_SYSTEM_ROUTE}/chips`]: 'Chips',
  [`${DESIGN_SYSTEM_ROUTE}/colors`]: 'AXIS Colors',
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

const DesignSystemBreadcrumbShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const breadcrumbItems = resolveDesignSystemBreadcrumbItems(pathname)
  const figmaNodeId = resolveDesignSystemFigmaNode(pathname)

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
          <GreenhouseFigmaNodeButton nodeId={figmaNodeId} dataCapture='design-system-figma-node' />
        </Stack>
      </Box>
      {children}
    </Box>
  )
}

export default DesignSystemBreadcrumbShell
