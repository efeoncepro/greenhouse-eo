// ─── TASK-950 — Nexa Insights list page canonical `/nexa/insights` ──────────
//
// Server component que rendea la lista de Nexa Insights del período actual
// para el subject autenticado. Cierra bug class 404 sistemático recurrente
// del CTA "Ver todos los insights del mes" del HomeAiInsightsBento V2 (mirror
// del bug class TASK-696 que TASK-947 cerró para el detail page).
//
// Reusa 100% TASK-947 infrastructure:
//   - Capability `nexa.insights.read` (seedeada migration `20260529004012583`).
//   - Subject-aware filter + helper canonical.
//   - notFound() anti-oracle TASK-872 pattern.
//   - Page chrome (loading + error) sibling pattern del detail page.

import { notFound, redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { getCurrentPeriodSantiago } from '@/lib/home/period'
import { listNexaInsightsForPeriod } from '@/lib/ico-engine/ai/nexa-insight-list-reader'
import { captureWithDomain } from '@/lib/observability/capture'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import NexaInsightListView from '@/views/greenhouse/nexa/insights/NexaInsightListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nexa Insights · Greenhouse'
}

const HOME_HREF = '/home'
const LIST_LIMIT = 24

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // Capability gate canonical + anti-oracle: si subject sin acceso → notFound()
  // (NUNCA 403 leakeando existencia). TASK-872 pattern + TASK-873 invariant.
  // Reusa capability `nexa.insights.read` ya seedeada por TASK-947 Slice 1.
  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'nexa.insights.read', 'read', 'tenant')) {
    notFound()
  }

  const { year, month } = getCurrentPeriodSantiago()

  let result

  try {
    result = await listNexaInsightsForPeriod(
      {
        userId: subject.userId,
        tenantType: subject.tenantType,
        roleCodes: subject.roleCodes,
        routeGroups: subject.routeGroups,
        memberId: tenant.memberId ?? null
      },
      { periodYear: year, periodMonth: month, limit: LIST_LIMIT }
    )
  } catch (error) {
    // Defense in depth: el reader ya tiene try/catch + captureWithDomain.
    // Aquí solo cubrimos un edge case no anticipado para preservar la UX.
    captureWithDomain(error, 'delivery', {
      tags: { source: 'nexa_insight_list_page', stage: 'page_loader' },
      extra: { periodYear: year, periodMonth: month }
    })

    throw error
  }

  return <NexaInsightListView result={result} homeHref={HOME_HREF} />
}

export default Page
