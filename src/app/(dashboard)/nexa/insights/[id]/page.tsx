// ─── TASK-947 — Nexa Insights detail page canonical (`/nexa/insights/[id]`) ─
//
// Server component que resuelve el detail de un Nexa Insight por ID + dispatch
// prefix canonical (EO-AIS-* / EO-AIE-* / EO-AIH-*) + capability gate +
// subject-aware filter + notFound() anti-oracle TASK-872 pattern.
//
// Cierra el bug class 404 sistemático del CTA "Ver causa raíz" del Home Nexa
// Insights bento (drift TASK-696).

import { notFound, redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { readNexaInsightDrill } from '@/lib/ico-engine/ai/nexa-insight-drill-reader'
import { captureWithDomain } from '@/lib/observability/capture'

import NexaInsightDetailView from '@/views/greenhouse/nexa/insights/NexaInsightDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nexa Insight · Greenhouse'
}

interface PageProps {
  params: Promise<{ id: string }>
}

const HOME_HREF = '/home'

const Page = async ({ params }: PageProps) => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // Capability gate canonical + anti-oracle: si subject sin acceso → notFound()
  // (NUNCA 403 leakeando existencia). TASK-872 pattern + TASK-873 invariant.
  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'nexa.insights.read', 'read', 'tenant')) {
    notFound()
  }

  const { id } = await params

  let result

  try {
    result = await readNexaInsightDrill(id, {
      userId: subject.userId,
      tenantType: subject.tenantType,
      roleCodes: subject.roleCodes,
      routeGroups: subject.routeGroups,
      memberId: tenant.memberId ?? null
    })
  } catch (error) {
    // Defense in depth: el reader ya tiene try/catch + captureWithDomain.
    // Aquí solo cubrimos un edge case no anticipado para preservar la UX.
    captureWithDomain(error, 'delivery', {
      tags: { source: 'nexa_insight_detail', stage: 'page_loader' },
      extra: { drillId: id }
    })

    throw error
  }

  // Anti-oracle: not_found state → mismo notFound() que "página no existe".
  // Indistinguible para el atacante; ataque oracle por existencia bloqueado.
  if (result.state === 'not_found') {
    notFound()
  }

  return <NexaInsightDetailView result={result} drillId={id} homeHref={HOME_HREF} />
}

export default Page
