import 'server-only'

import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { computeRequestFingerprint } from '@/lib/api-platform/core/idempotency'
import { canSeeClientPortalView } from '@/lib/client-portal/visibility/client-portal-view-visibility'

import type { EnablementInventory, EnablementIssue, ServiceEnablementRequest, ServiceEnablementPreview } from './types'
import { serviceEnablementRequestSchema } from './validation'

export const enablementFingerprint = (value: unknown) => computeRequestFingerprint({
  method: 'POST', path: 'client-service-enablement/v1', body: value
})

export const buildServiceEnablementPreview = (
  raw: ServiceEnablementRequest, inventory: EnablementInventory
): ServiceEnablementPreview => {
  const request = serviceEnablementRequestSchema.parse(raw)
  const blockers: EnablementIssue[] = []
  const readiness: EnablementIssue[] = []
  const changes: ServiceEnablementPreview['changes'] = []
  const issue = (code: string, subject: string, owner: EnablementIssue['owner']) => blockers.push({ code, subject, owner })
  const asOf = inventory.observedAt
  const current = (start: string | null, end: string | null) => (!start || start <= asOf) && (!end || end > asOf)

  if (request.organizationId !== inventory.organization.id || !inventory.organization.active) {
    issue('organization_unavailable', request.organizationId, 'Identity')
  }

  for (const target of request.targets) {
    const service = inventory.services.find(item => item.id === target.serviceId)
    const moduleRecord = inventory.modules.find(item => item.key === target.moduleKey)
    const assignment = inventory.assignments.find(item => item.moduleKey === target.moduleKey && item.endsAt === null)
    const terms = inventory.terms.filter(item => item.serviceId === target.serviceId && current(item.startsAt, item.endsAt))
    const term = terms.find(item => item.moduleKeys.includes(target.moduleKey))

    if (!service || !service.active || service.status !== 'active' || !current(service.startsAt, service.endsAt)) {
      issue('service_not_current', target.serviceId ?? target.moduleKey, 'Commercial')
    }

    if (!term || terms.length !== 1) issue('commercial_mapping_unresolved', target.moduleKey, 'Commercial')

    if (!moduleRecord || moduleRecord.endsAt !== null || !current(moduleRecord.startsAt, moduleRecord.endsAt)) {
      issue('catalog_not_current', target.moduleKey, 'Client Portal')
    }

    if (moduleRecord && moduleRecord.scope !== 'cross' && !inventory.businessLines.includes(moduleRecord.scope)) {
      issue('business_line_unresolved', target.moduleKey, 'Commercial')
    }

    if (assignment && (assignment.status !== 'active' || !current(assignment.startsAt, assignment.expiresAt))) {
      issue('assignment_requires_separate_transition', assignment.id, 'Client Portal')
    }

    if (service && term && moduleRecord) changes.push({
      serviceId: service.id, termsId: term.id, moduleKey: moduleRecord.key,
      action: assignment ? 'preserve' : 'enable', assignmentId: assignment?.id ?? null
    })

    for (const source of moduleRecord?.dataSources ?? []) readiness.push({
      code: 'producer_coverage_unverified', subject: `${target.moduleKey}:${source}`, owner: 'Delivery/Growth'
    })
  }

  if (!request.personIds.length) issue('recipient_selection_required', request.organizationId, 'Identity')

  for (const id of request.personIds) {
    const person = inventory.people.find(item => item.id === id)

    if (!person || !person.active || person.status !== 'active') issue('person_not_authorized_in_organization', id, 'Identity')
    if (!person?.identityLinked) readiness.push({ code: 'identity_link_unverified', subject: id, owner: 'Identity' })
    if (!person?.lastLoginAt) readiness.push({ code: 'human_login_unverified', subject: id, owner: 'Identity' })
    if (!person?.preferences.length) readiness.push({ code: 'preferences_not_explicit', subject: id, owner: 'Notifications' })
  }

  if (!inventory.channels.some(channel => !channel.disabled && channel.provisioningStatus === 'ready')) {
    readiness.push({ code: 'teams_destination_unverified', subject: request.organizationId, owner: 'Notifications' })
  }

  const beforeViews = inventory.assignments.filter(item =>
    item.endsAt === null && ['active', 'pilot'].includes(item.status) && (!item.expiresAt || item.expiresAt > asOf)
  ).flatMap(item => inventory.modules.find(moduleRecord => moduleRecord.key === item.moduleKey && moduleRecord.endsAt === null)?.viewCodes ?? [])

  const proposedViews = request.targets.flatMap(target => inventory.modules.find(item => item.key === target.moduleKey)?.viewCodes ?? [])
  const viewCodes = [...new Set(proposedViews)].sort()

  const people = request.personIds.flatMap(id => {
    const person = inventory.people.find(item => item.id === id)

    return person ? [{ id, views: viewCodes.map(viewCode => ({
      viewCode,
      before: person.active && person.status === 'active' && canSeeClientPortalView(viewCode, { isInternalSession: false, moduleViewCodes: beforeViews, revokedViewCodes: person.revokedViewCodes }),
      after: person.active && person.status === 'active' && canSeeClientPortalView(viewCode, { isInternalSession: false, moduleViewCodes: [...beforeViews, ...proposedViews], revokedViewCodes: person.revokedViewCodes })
    })) }] : []
  })

  const routes = viewCodes.map(viewCode => ({
    viewCode, path: VIEW_REGISTRY.find(view => view.viewCode === viewCode)?.routePath ?? null,
    verification: 'unverified' as const
  }))

  for (const route of routes) readiness.push({ code: route.path ? 'authenticated_route_unverified' : 'route_missing', subject: route.viewCode, owner: 'Client Portal' })

  // Exclude the read timestamp, but include time-derived eligibility and every reviewed configuration field.
  const state = { ...inventory, observedAt: undefined }
  const fingerprint = enablementFingerprint({ request, state, changes, blockers, readiness, people, routes })

  return { version: 1, request, observedAt: asOf, fingerprint, inventory, changes, blockers, readiness, people, routes, canApply: blockers.length === 0 }
}
