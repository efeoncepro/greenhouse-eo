import { describe, expect, it } from 'vitest'

import { filterDesignSystemCatalogItems } from './DesignSystemCatalogView'

const findCatalogIds = (query: string) =>
  filterDesignSystemCatalogItems({
    category: 'Todos',
    kind: 'Todos',
    query
  }).map(item => item.id)

describe('DesignSystemCatalogView search', () => {
  it('finds the breadcrumbs lab by title and common aliases', () => {
    expect(findCatalogIds('Breadcrumbs')).toContain('breadcrumbs')
    expect(findCatalogIds('breadcrumb')).toContain('breadcrumbs')
    expect(findCatalogIds('breadcumbs')).toContain('breadcrumbs')
    expect(findCatalogIds('migas')).toContain('breadcrumbs')
  })

  it('indexes route and owner metadata for design-system entries', () => {
    expect(findCatalogIds('/design-system/breadcrumbs')).toEqual(['breadcrumbs'])
    expect(findCatalogIds('GreenhouseBreadcrumbs')).toContain('breadcrumbs')
  })
})
