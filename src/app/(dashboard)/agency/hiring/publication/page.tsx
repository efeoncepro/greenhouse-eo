import { redirect } from 'next/navigation'

import { getLocale } from 'next-intl/server'

import type { Metadata } from 'next'

import PublicationDeskView from '@/views/greenhouse/hiring/PublicationDeskView'
import type { VacancyAiSurfaceProps } from '@/views/greenhouse/hiring/VacancyAiDraftDrawer'
import { can } from '@/lib/entitlements/runtime'
import { getHiringDeskSnapshot } from '@/lib/hiring'
import { listAiProposals } from '@/lib/hiring/assessment/ai'
import { isHiringVacancyAiEnabled } from '@/lib/hiring/vacancy-ai'
import { getMicrocopy } from '@/lib/copy'
import { normalizeLocale } from '@/i18n/locales'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = { title: 'Publicación | Hiring Desk | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function HiringPublicationPage() {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const hasAccess = hasAuthorizedViewCode({ tenant, viewCode: 'gestion.hiring_publication', fallback: false })

  if (
    !hasAccess ||
    !can(tenant, 'hiring.opening.read', 'read', 'tenant') ||
    !can(tenant, 'hiring.application.read', 'read', 'tenant')
  ) redirect('/401')

  // TASK-1422 — affordances de la redacción asistida IA (TASK-1385). Solo cruzan booleans y la
  // proposal pendiente serializable; el config server-only nunca llega al cliente. El backend
  // re-enforza capability + flag en cada endpoint.
  const canPropose = can(tenant, 'hiring.opening.ai_assist', 'execute', 'tenant')
  const canConfirm = can(tenant, 'hiring.opening.write', 'update', 'tenant')

  const [locale, snapshot, pendingProposals] = await Promise.all([
    getLocale(),
    getHiringDeskSnapshot({ openingLimit: 80, applicationLimit: 1 }),
    canPropose || canConfirm
      ? listAiProposals({ kind: 'opening_public_copy', status: 'proposed', limit: 200 }).catch(() => [])
      : Promise.resolve([]),
  ])

  const vacancyAi: VacancyAiSurfaceProps = {
    enabled: isHiringVacancyAiEnabled(),
    canPropose,
    canConfirm,
    pendingByOpening: Object.fromEntries(
      pendingProposals.map((proposal) => [
        proposal.targetRef,
        { proposalId: proposal.proposalId, model: proposal.model, proposed: proposal.proposed },
      ]),
    ),
  }

  return (
    <PublicationDeskView
      copy={getMicrocopy(normalizeLocale(locale) ?? undefined).hiringDesk}
      initialSnapshot={snapshot}
      vacancyAi={vacancyAi}
    />
  )
}
