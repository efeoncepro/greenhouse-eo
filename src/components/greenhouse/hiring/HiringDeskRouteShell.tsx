'use client'

import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import HiringDeskAppShell from './HiringDeskAppShell'

interface HiringDeskRouteShellProps {
  children: ReactNode
  dashboard: ReactNode
}

const HiringDeskRouteShell = ({ children, dashboard }: HiringDeskRouteShellProps) => {
  const pathname = usePathname()

  if (pathname?.startsWith('/agency/hiring')) return <HiringDeskAppShell>{children}</HiringDeskAppShell>

  return dashboard
}

export default HiringDeskRouteShell
