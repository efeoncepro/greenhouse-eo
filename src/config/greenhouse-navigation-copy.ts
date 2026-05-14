import {
  GH_AGENCY_NAV,
  GH_CLIENT_NAV,
  GH_COMMERCIAL_NAV,
  GH_FINANCE_NAV,
  GH_HR_NAV,
  GH_INTERNAL_NAV,
  GH_MY_NAV,
  GH_PEOPLE_NAV
} from '@/config/greenhouse-nomenclature'
import { DEFAULT_LOCALE } from '@/lib/copy'
import { normalizeLocale } from '@/i18n/locales'

import type { Locale } from '@/lib/copy'

type NavEntry = {
  label: string
  subtitle: string
}

type WidenNavigation<T extends Record<string, NavEntry>> = {
  readonly [Key in keyof T]: NavEntry
}

type NavigationCopy = {
  client: WidenNavigation<typeof GH_CLIENT_NAV>
  internal: WidenNavigation<typeof GH_INTERNAL_NAV>
  people: WidenNavigation<typeof GH_PEOPLE_NAV>
  agency: WidenNavigation<typeof GH_AGENCY_NAV>
  commercial: WidenNavigation<typeof GH_COMMERCIAL_NAV>
  finance: WidenNavigation<typeof GH_FINANCE_NAV>
  hr: WidenNavigation<typeof GH_HR_NAV>
  my: WidenNavigation<typeof GH_MY_NAV>
}

const esCL: NavigationCopy = {
  client: GH_CLIENT_NAV,
  internal: GH_INTERNAL_NAV,
  people: GH_PEOPLE_NAV,
  agency: GH_AGENCY_NAV,
  commercial: GH_COMMERCIAL_NAV,
  finance: GH_FINANCE_NAV,
  hr: GH_HR_NAV,
  my: GH_MY_NAV
}

const enUS: NavigationCopy = {
  client: {
    dashboard: { label: 'Pulse', subtitle: 'Overview of your operation' },
    projects: { label: 'Projects', subtitle: 'Active projects' },
    sprints: { label: 'Cycles', subtitle: 'Production sprints' },
    settings: { label: 'My Greenhouse', subtitle: 'Profile and preferences' },
    updates: { label: 'Updates', subtitle: 'Ecosystem updates' },
    team: { label: 'My Team', subtitle: 'Team assigned to your operation' },
    reviews: { label: 'Reviews', subtitle: 'Active feedback queue' },
    analytics: { label: 'Analytics', subtitle: 'Service performance and metrics' },
    campaigns: { label: 'Campaigns', subtitle: 'Active initiatives and campaigns' },
    notifications: { label: 'Notifications', subtitle: 'Alerts and preferences' }
  },
  internal: {
    home: { label: 'Home', subtitle: 'Nexa and today operation' },
    internalDashboard: { label: 'Control tower', subtitle: 'Internal Spaces operation' },
    adminCenter: { label: 'Admin Center', subtitle: 'Institutional portal governance' },
    adminTenants: { label: 'Spaces', subtitle: 'Spaces, access and portal governance' },
    adminTeam: { label: 'Team', subtitle: 'Collaborators, activation and assignments' },
    adminUsers: { label: 'Users', subtitle: 'Access, roles and visible scopes' },
    adminRoles: { label: 'Roles and permissions', subtitle: 'Operational portal governance' },
    adminViews: { label: 'Views and access', subtitle: 'View governance and effective portal access' },
    adminOperationalCalendar: { label: 'Operational calendar', subtitle: 'Holidays, close and monthly milestones' },
    adminAiTools: { label: 'AI tools', subtitle: 'Catalog, licenses and AI credits' },
    adminCorreos: { label: 'Email', subtitle: 'Delivery history and subscriptions' },
    adminEmailPreview: { label: 'Email preview', subtitle: 'Preview and test email templates' },
    adminCloudIntegrations: { label: 'Cloud & Integrations', subtitle: 'Syncs, webhooks, auth and runtime operations' },
    adminNotifications: { label: 'Notifications', subtitle: 'In-app and email notification system' },
    adminOpsHealth: { label: 'Ops Health', subtitle: 'Outbox, projections and serving freshness' },
    adminUntitledNotionPages: { label: 'Untitled Notion pages', subtitle: 'Tasks, projects and sprints without titles — fix in Notion' },
    adminBusinessLines: { label: 'Business Lines', subtitle: 'Canonical business line metadata' },
    adminServiceSlas: { label: 'Service SLAs', subtitle: 'Contractual governance by service and compliance' },
    adminIntegrationGovernance: { label: 'Integration Governance', subtitle: 'Registry, taxonomy, readiness and native integration ownership' },
    adminAccounts: { label: 'Accounts', subtitle: 'Organizations, Spaces and identity governance' },
    adminCommercialParties: { label: 'Commercial Parties', subtitle: 'Pipeline, HubSpot adoption and party lifecycle conflicts' },
    adminProductSyncConflicts: { label: 'Product Sync Conflicts', subtitle: 'Commercial catalog drift, auto-heal and HubSpot Products resolution' },
    adminPaymentInstruments: { label: 'Payment instruments', subtitle: 'Bank accounts, cards, fintech and platforms' },
    adminPricingCatalog: { label: 'Pricing catalog', subtitle: 'Roles, tools, overheads and commercial governance' },
    adminTalentReview: { label: 'Talent verification', subtitle: 'Skills, tools and certifications pending review' },
    adminTalentOps: { label: 'Talent health', subtitle: 'System metrics and maintenance' },
    adminIdentityAccess: { label: 'Identity and access', subtitle: 'Users, roles, views and accounts' },
    adminTeamOps: { label: 'Team and operations', subtitle: 'Talent, business lines and instruments' }
  },
  people: {
    people: { label: 'People', subtitle: 'Operational view of the Efeonce team' }
  },
  agency: {
    workspace: { label: 'Agency', subtitle: 'Pulse, Spaces and team capacity' },
    pulseGlobal: { label: 'Global Pulse', subtitle: 'Aggregated KPIs across all Spaces' },
    spaces: { label: 'Spaces', subtitle: 'Active client list' },
    capacity: { label: 'Capacity', subtitle: 'Global team workload' },
    organizations: { label: 'Organizations', subtitle: 'Accounts, relationships and structure' },
    services: { label: 'Services', subtitle: 'Services contracted by Space' },
    sampleSprints: { label: 'Sample Sprints', subtitle: 'Commercial pilots, trials and discovery' },
    staffAugmentation: { label: 'Staff Augmentation', subtitle: 'Placements, onboarding and assignment economics' },
    economics: { label: 'Economics', subtitle: 'P&L and profitability' },
    team: { label: 'Capacity', subtitle: 'Team workload and allocation' },
    talentDiscovery: { label: 'Talent', subtitle: 'Discovery and ranking' },
    delivery: { label: 'Delivery', subtitle: 'ICO, sprints and production' },
    campaigns: { label: 'Campaigns', subtitle: 'Cross-space initiatives' },
    operations: { label: 'Operations', subtitle: 'Platform health' },
    structure: { label: 'Structure', subtitle: 'Organizations, services and operations' },
    teamAndTalent: { label: 'Team and talent', subtitle: 'Capacity, discovery and staffing' },
    operationsGroup: { label: 'Operations', subtitle: 'Delivery, campaigns and structure' }
  },
  commercial: {
    root: { label: 'Commercial', subtitle: 'Pipeline, agreements and sellable catalog' },
    pipeline: { label: 'Pipeline', subtitle: 'Commercial forecast and active opportunities' },
    quotes: { label: 'Quotes', subtitle: 'Commercial proposals and approval' },
    contracts: { label: 'Contracts', subtitle: 'Contracts, SOWs and active renewals' },
    masterAgreements: { label: 'Master agreements', subtitle: 'MSAs and master clauses' },
    sampleSprints: { label: 'Sample Sprints', subtitle: 'Commercial pilots, trials and discovery' },
    products: { label: 'Products', subtitle: 'Sellable catalog synced with HubSpot' }
  },
  finance: {
    dashboard: { label: 'Summary', subtitle: 'Consolidated view' },
    income: { label: 'Sales', subtitle: 'Sales documents, accrual and collections' },
    expenses: { label: 'Purchases', subtitle: 'Purchase documents, obligations and payments' },
    suppliers: { label: 'Suppliers', subtitle: 'Supplier directory' },
    reconciliation: { label: 'Reconciliation', subtitle: 'Bank reconciliation' },
    paymentOrders: { label: 'Payment orders', subtitle: 'Obligations, orders and payment calendar' },
    paymentProfiles: { label: 'Payment profiles', subtitle: 'Approval queue and cross-entity drift' },
    intelligence: { label: 'Economics', subtitle: 'Period close and operational P&L' },
    purchaseOrders: { label: 'Purchase orders', subtitle: 'Client POs, balances and consumption' },
    hes: { label: 'HES', subtitle: 'Service entry sheets' },
    clients: { label: 'Clients', subtitle: 'Client master data and coverage' },
    costAllocations: { label: 'Allocations', subtitle: 'Cost distribution and attribution' },
    flow: { label: 'Operational flow', subtitle: 'Sales, purchases and master data' },
    cashIn: { label: 'Collections', subtitle: 'Payments received against sales invoices' },
    cashOut: { label: 'Payments', subtitle: 'Payments executed against commitments' },
    bank: { label: 'Banking', subtitle: 'Treasury by account, fintech and instruments' },
    shareholderAccount: { label: 'Shareholder account', subtitle: 'Company-shareholder balance' },
    cashPosition: { label: 'Cash position', subtitle: 'Real balance, receivables and payables' },
    documents: { label: 'Documents', subtitle: 'POs, HES and reconciliation' },
    analytics: { label: 'Intelligence', subtitle: 'Economics and cost allocations' },
    treasury: { label: 'Treasury', subtitle: 'Collections, payments, banking and cash position' }
  },
  hr: {
    payroll: { label: 'Monthly payroll', subtitle: 'Compensation and payroll close' },
    payrollProjected: { label: 'Projected payroll', subtitle: 'Simulation and forecast' },
    team: { label: 'My team', subtitle: 'Operational workspace for your visible subtree' },
    approvals: { label: 'Approvals', subtitle: 'Operational queue for the visible team' },
    hierarchy: { label: 'Hierarchy', subtitle: 'Supervision, delegations and changes' },
    orgChart: { label: 'Org chart', subtitle: 'Visual hierarchy explorer' },
    departments: { label: 'Departments', subtitle: 'Organizational structure' },
    workforceActivation: { label: 'Workforce Activation', subtitle: 'Labor activation and readiness blockers' },
    offboarding: { label: 'Offboarding', subtitle: 'Labor and contractual exit cases' },
    leave: { label: 'Leave', subtitle: 'Requests and leave balances' },
    attendance: { label: 'Attendance', subtitle: 'Team attendance records' },
    goals: { label: 'Goals', subtitle: 'OKRs, cycles and progress tracking' },
    evaluations: { label: 'Evaluations', subtitle: '360 cycles, assignments and calibration' }
  },
  my: {
    dashboard: { label: 'My Greenhouse', subtitle: 'Your personal operation' },
    assignments: { label: 'My Assignments', subtitle: 'Clients, FTE and capacity' },
    performance: { label: 'My Performance', subtitle: 'ICO, OTD and metrics' },
    delivery: { label: 'My Delivery', subtitle: 'Tasks, projects and CRM' },
    profile: { label: 'My Profile', subtitle: 'Identity and personal data' },
    payroll: { label: 'My Payroll', subtitle: 'Payslips and compensation' },
    paymentProfile: { label: 'My Payment Account', subtitle: 'Where you receive payments' },
    leave: { label: 'My Leave', subtitle: 'Balances and requests' },
    goals: { label: 'My Goals', subtitle: 'OKRs and cycle key results' },
    evaluations: { label: 'My Evaluations', subtitle: '360 feedback and results' },
    organization: { label: 'My Organization', subtitle: 'Directory and colleagues' },
    settings: { label: 'Settings', subtitle: 'Notifications and preferences' }
  }
}

const navigationByLocale: Record<Locale, NavigationCopy> = {
  'es-CL': esCL,
  'en-US': enUS
}

export const getGreenhouseNavigationCopy = (locale?: string | null): NavigationCopy => {
  const normalized = normalizeLocale(locale) ?? DEFAULT_LOCALE

  return navigationByLocale[normalized] ?? navigationByLocale[DEFAULT_LOCALE]
}
