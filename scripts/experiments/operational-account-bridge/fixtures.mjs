// TASK-2073: all identities, values and URLs are synthetic. Never load runtime config.
export const ORG = 'org-fixture'
export const DESIGN = 'space-design'
export const SEO = 'space-seo'
export const OWNER = 'client-commercial'
export const DESIGN_SERVICE = 'service-design'
export const SEO_SERVICE = 'service-seo'
export const PERIOD = '2026-10'
export const BLOG = 'blog.airline.example'

export function fixture(variant) {
  if (!['A-prime', 'B'].includes(variant)) throw new Error('unknown_variant')
  const seoClient = variant === 'A-prime' ? 'client-operating-seo' : OWNER

  return {
    variant,
    organizations: [{ id: ORG, companyId: 'company-fixture' }],
    clients: [
      { id: OWNER, organizationId: ORG, commercialOwner: OWNER, kind: 'commercial' },
      ...(variant === 'A-prime'
        ? [{ id: seoClient, organizationId: ORG, commercialOwner: OWNER, kind: 'operating' }]
        : [])
    ],
    financeProfiles: [{ clientId: OWNER }],
    spaces: [
      { id: DESIGN, organizationId: ORG, clientId: OWNER, active: true },
      { id: SEO, organizationId: ORG, clientId: seoClient, active: true }
    ],
    services: [
      { id: DESIGN_SERVICE, spaceId: DESIGN, organizationId: ORG, active: true },
      { id: SEO_SERVICE, spaceId: SEO, organizationId: ORG, active: true }
    ],
    sources: [
      { id: 'source-design', spaceId: DESIGN, enabled: true },
      { id: 'source-seo', spaceId: SEO, enabled: true }
    ],
    routing: [
      { serviceId: DESIGN_SERVICE, spaceId: DESIGN },
      { serviceId: SEO_SERVICE, spaceId: SEO }
    ],
    memberships: [
      { subjectId: 'designer', spaceId: DESIGN, active: true, capabilities: ['read', 'report'] },
      { subjectId: 'seo', spaceId: SEO, active: true, capabilities: ['read', 'report'] },
      { subjectId: 'both', spaceId: DESIGN, active: true, capabilities: ['read', 'report'] },
      { subjectId: 'both', spaceId: SEO, active: true, capabilities: ['read', 'report'] }
    ],
    organizationCapabilities: ['read', 'report'],
    authorityVersion: 1,
    projects: [
      { id: 'project-design', spaceId: DESIGN, clientId: OWNER, sourceId: 'source-design' },
      { id: 'project-seo', spaceId: SEO, clientId: seoClient, sourceId: 'source-seo' }
    ],
    history: {
      projects: [{ id: 'historic-project', spaceId: DESIGN, clientId: OWNER, moduleId: null }],
      tasks: [{ id: 'historic-task', spaceId: DESIGN, clientId: OWNER, projectId: 'historic-project' }],
      snapshots: [{ id: 'snapshot-design-closed', spaceId: DESIGN, period: '2026-09', locked: true, value: 37 }],
      editions: [{ id: 'edition-design', spaceId: DESIGN, serviceId: DESIGN_SERVICE, period: '2026-09' }]
    },
    invoices: [{ id: 'invoice-fixture', organizationId: ORG, clientId: OWNER, period: PERIOD, amount: 100 }],
    receipts: [
      { source: 'ga4', host: BLOG, period: PERIOD, count: 0, status: 'observed' },
      { source: 'gsc', host: BLOG, period: PERIOD, count: 0, status: 'observed' },
      { source: 'aeo_run', host: BLOG, period: PERIOD, count: 0, status: 'observed' }
    ],
    ledger: [],
    cache: new Map()
  }
}
