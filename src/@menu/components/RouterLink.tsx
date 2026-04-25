'use client'

// React Imports
import { forwardRef } from 'react'

import type { LinkProps } from 'next/link'

// Component Imports
import GreenhouseRouteLink from '@/components/greenhouse/GreenhouseRouteLink'

// Type Imports
import type { ChildrenType } from '../types'

type RouterLinkProps = LinkProps &
  Partial<ChildrenType> & {
    className?: string
  }

export const RouterLink = forwardRef((props: RouterLinkProps, ref: any) => {
  // Props
  const { href, className, ...other } = props

  return (
    <GreenhouseRouteLink ref={ref} href={href} className={className} {...other}>
      {props.children}
    </GreenhouseRouteLink>
  )
})
