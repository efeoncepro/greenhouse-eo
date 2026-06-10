'use client'

import GreenhouseBreadcrumbs, { type GreenhouseBreadcrumbItem } from './GreenhouseBreadcrumbs'

/**
 * Legacy wrapper for the canonical GreenhouseBreadcrumbs primitive.
 *
 * New consumers should import `GreenhouseBreadcrumbs` directly so they can set
 * variant/kind/icon semantics. This wrapper preserves the older compact API.
 */
export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

const Breadcrumb = ({ items }: BreadcrumbProps) => {
  const mappedItems: GreenhouseBreadcrumbItem[] = items.map(item => ({
    label: item.label,
    href: item.href
  }))

  return (
    <GreenhouseBreadcrumbs
      items={mappedItems}
      kind='legacy'
      separator='chevron'
      showIcons={false}
    />
  )
}

export default Breadcrumb
