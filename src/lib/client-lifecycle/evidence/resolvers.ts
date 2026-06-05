import 'server-only'

import { resolvePrimarySpaceForOrganization } from '@/lib/account-360/organization-identity'
import { getClientLifecycleStage } from '@/lib/hubspot/company-lifecycle-store'
import { getNotionOnboardingReadiness } from '@/lib/integrations/notion-onboarding-preflight'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { AutoDerivableItemCode, ItemEvidence, ItemEvidenceStatus } from './evidence-types'

/**
 * TASK-1017 — Evidence resolvers (reuse-first, degradación honesta).
 *
 * Cada resolver lee el estado REAL de su ítem desde el reader/tabla canónica que
 * ya existe y lo clasifica en `detected | pending | unverifiable`. La clasificación
 * es una función PURA (testeable sin IO, mirror de `evaluateNotionOnboardingReadiness`);
 * el gather IO se envuelve en `settle` → cualquier excepción degrada a `unverifiable`
 * (la fuente está caída), NUNCA a un falso `pending`.
 *
 * Conservador por construcción (espejo de `readyToOnboard`): en duda, `pending`.
 */

/** Scope resuelto UNA vez por caso (no N+1): el caso → org + client + space. */
export interface EvidenceScope {
  caseId: string
  organizationId: string
  clientId: string | null
  spaceId: string | null
}

type Verdict = { status: ItemEvidenceStatus; detail: string }

const settle = async (producer: () => Promise<Verdict>): Promise<Verdict> => {
  try {
    return await producer()
  } catch {
    // Degradación honesta: la fuente respondió con error → no pudimos verificar.
    return { status: 'unverifiable', detail: 'No pudimos verificar el estado en este momento. Intenta de nuevo.' }
  }
}

// ── Pure classifiers (exported para unit tests) ─────────────────────────────

export interface HubspotFacts {
  /** null cuando el caso aún no tiene cliente instanciado. */
  hasClient: boolean
  hubspotCompanyId: string | null
}

export const classifyHubspot = (facts: HubspotFacts): Verdict => {
  if (!facts.hasClient) {
    return { status: 'pending', detail: 'El cliente todavía no está instanciado en el portal.' }
  }

  if (facts.hubspotCompanyId) {
    return { status: 'detected', detail: 'La empresa está sincronizada desde HubSpot.' }
  }

  return { status: 'pending', detail: 'El cliente no tiene empresa de HubSpot vinculada.' }
}

export interface TeamFacts {
  hasClient: boolean
  activeAssignments: number
  totalFte: number | null
}

export const classifyTeam = (facts: TeamFacts): Verdict => {
  if (!facts.hasClient) {
    return { status: 'pending', detail: 'El cliente todavía no está instanciado en el portal.' }
  }

  if (facts.activeAssignments > 0) {
    const fte = facts.totalFte != null && facts.totalFte > 0 ? ` · ${facts.totalFte.toFixed(2)} FTE` : ''

    return {
      status: 'detected',
      detail: `${facts.activeAssignments} ${facts.activeAssignments === 1 ? 'persona asignada' : 'personas asignadas'}${fte}.`
    }
  }

  return { status: 'pending', detail: 'No hay personas asignadas al cliente todavía.' }
}

export interface NotionFacts {
  hasSpace: boolean
  readyToOnboard: boolean
  summary: string
}

export const classifyNotion = (facts: NotionFacts): Verdict => {
  if (!facts.hasSpace) {
    return { status: 'pending', detail: 'Falta vincular el teamspace de Notion del cliente.' }
  }

  if (facts.readyToOnboard) {
    return { status: 'detected', detail: 'El cliente fluye al portal: el preflight de Notion está verde.' }
  }

  return { status: 'pending', detail: facts.summary || 'El preflight de Notion todavía no está verde.' }
}

export interface TeamsChannelFacts {
  hasSpace: boolean
  readyChannels: number
}

export const classifyTeamsChannel = (facts: TeamsChannelFacts): Verdict => {
  if (!facts.hasSpace) {
    return { status: 'pending', detail: 'Falta vincular el teamspace para asociar el canal de Teams.' }
  }

  if (facts.readyChannels > 0) {
    return { status: 'detected', detail: 'El canal de Teams está configurado y listo.' }
  }

  return { status: 'pending', detail: 'Todavía no hay un canal de Teams configurado.' }
}

export interface PortalUsersFacts {
  hasClient: boolean
  activeUsers: number
}

export const classifyPortalUsers = (facts: PortalUsersFacts): Verdict => {
  if (!facts.hasClient) {
    return { status: 'pending', detail: 'El cliente todavía no está instanciado en el portal.' }
  }

  if (facts.activeUsers > 0) {
    return {
      status: 'detected',
      detail: `${facts.activeUsers} ${facts.activeUsers === 1 ? 'persona del cliente invitada' : 'personas del cliente invitadas'} al portal.`
    }
  }

  return { status: 'pending', detail: 'Todavía no se invitó a personas del cliente al portal.' }
}

export interface BillingFacts {
  hasClient: boolean
  paymentCurrency: string | null
  requiresPo: boolean
  poNumber: string | null
}

export const classifyBilling = (facts: BillingFacts): Verdict => {
  if (!facts.hasClient) {
    return { status: 'pending', detail: 'El cliente todavía no está instanciado en el portal.' }
  }

  if (!facts.paymentCurrency) {
    return { status: 'pending', detail: 'Falta configurar la moneda de facturación del cliente.' }
  }

  if (facts.requiresPo && !facts.poNumber) {
    return { status: 'pending', detail: 'Falta registrar la orden de compra (OC) en Nubox.' }
  }

  const po = facts.poNumber ? ` · OC ${facts.poNumber}` : ''

  return { status: 'detected', detail: `Facturación configurada en ${facts.paymentCurrency}${po}.` }
}

// ── IO gatherers + resolvers (settle-wrapped) ───────────────────────────────

const resolveHubspot = (scope: EvidenceScope): Promise<Verdict> =>
  settle(async () => {
    if (!scope.clientId) return classifyHubspot({ hasClient: false, hubspotCompanyId: null })

    const stage = await getClientLifecycleStage(scope.clientId)

    return classifyHubspot({ hasClient: true, hubspotCompanyId: stage?.hubspotCompanyId ?? null })
  })

const resolveTeam = (scope: EvidenceScope): Promise<Verdict> =>
  settle(async () => {
    if (!scope.clientId) return classifyTeam({ hasClient: false, activeAssignments: 0, totalFte: null })

    const rows = await runGreenhousePostgresQuery<{ assignments: number | string; total_fte: number | string | null }>(
      `SELECT COUNT(*)::int AS assignments, COALESCE(SUM(fte_allocation), 0)::numeric AS total_fte
       FROM greenhouse_core.client_team_assignments
       WHERE client_id = $1
         AND active = TRUE
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
      [scope.clientId]
    )

    const row = rows[0]

    return classifyTeam({
      hasClient: true,
      activeAssignments: Number(row?.assignments ?? 0),
      totalFte: row?.total_fte != null ? Number(row.total_fte) : null
    })
  })

const resolveNotion = (scope: EvidenceScope): Promise<Verdict> =>
  settle(async () => {
    if (!scope.spaceId) return classifyNotion({ hasSpace: false, readyToOnboard: false, summary: '' })

    const readiness = await getNotionOnboardingReadiness(scope.spaceId)

    return classifyNotion({ hasSpace: true, readyToOnboard: readiness.readyToOnboard, summary: readiness.summary })
  })

const resolveTeamsChannel = (scope: EvidenceScope): Promise<Verdict> =>
  settle(async () => {
    if (!scope.spaceId) return classifyTeamsChannel({ hasSpace: false, readyChannels: 0 })

    const rows = await runGreenhousePostgresQuery<{ ready_channels: number | string }>(
      `SELECT COUNT(*)::int AS ready_channels
       FROM greenhouse_core.teams_notification_channels
       WHERE space_id = $1
         AND provisioning_status = 'ready'
         AND channel_id IS NOT NULL`,
      [scope.spaceId]
    )

    return classifyTeamsChannel({ hasSpace: true, readyChannels: Number(rows[0]?.ready_channels ?? 0) })
  })

const resolvePortalUsers = (scope: EvidenceScope): Promise<Verdict> =>
  settle(async () => {
    if (!scope.clientId) return classifyPortalUsers({ hasClient: false, activeUsers: 0 })

    const rows = await runGreenhousePostgresQuery<{ active_users: number | string }>(
      `SELECT COUNT(*)::int AS active_users
       FROM greenhouse_core.client_users
       WHERE client_id = $1
         AND active = TRUE
         AND status IN ('active', 'invited')`,
      [scope.clientId]
    )

    return classifyPortalUsers({ hasClient: true, activeUsers: Number(rows[0]?.active_users ?? 0) })
  })

const resolveBilling = (scope: EvidenceScope): Promise<Verdict> =>
  settle(async () => {
    if (!scope.clientId) return classifyBilling({ hasClient: false, paymentCurrency: null, requiresPo: false, poNumber: null })

    const rows = await runGreenhousePostgresQuery<{
      payment_currency: string | null
      requires_po: boolean | null
      current_po_number: string | null
    }>(
      `SELECT payment_currency, requires_po, current_po_number
       FROM greenhouse_finance.client_profiles
       WHERE client_id = $1 OR organization_id = $2
       ORDER BY (client_id = $1) DESC, updated_at DESC NULLS LAST
       LIMIT 1`,
      [scope.clientId, scope.organizationId]
    )

    const row = rows[0]

    return classifyBilling({
      hasClient: true,
      paymentCurrency: row?.payment_currency ?? null,
      requiresPo: Boolean(row?.requires_po),
      poNumber: row?.current_po_number ?? null
    })
  })

/** Registry canónico item_code → resolver. Solo los 6 auto-derivables. */
const RESOLVERS: Record<AutoDerivableItemCode, (scope: EvidenceScope) => Promise<Verdict>> = {
  verify_hubspot_company_synced: resolveHubspot,
  assign_team_members: resolveTeam,
  provision_notion_workspace: resolveNotion,
  provision_communication_channels: resolveTeamsChannel,
  provision_client_users_access: resolvePortalUsers,
  confirm_billing_setup: resolveBilling
}

/** Resuelve la evidencia de UN ítem auto-derivable. */
export const resolveItemEvidence = async (
  itemCode: AutoDerivableItemCode,
  scope: EvidenceScope
): Promise<ItemEvidence> => {
  const verdict = await RESOLVERS[itemCode](scope)

  return { itemCode, status: verdict.status, detail: verdict.detail }
}

/** Resuelve el scope (org + client + space) de un caso, settle-wrapped. */
export const resolveEvidenceScope = async (
  caseId: string,
  organizationId: string,
  caseClientId: string | null
): Promise<EvidenceScope> => {
  try {
    const primary = await resolvePrimarySpaceForOrganization(organizationId)

    return {
      caseId,
      organizationId,
      clientId: caseClientId ?? primary.clientId,
      spaceId: primary.spaceId
    }
  } catch {
    // El bridge spaces falló: degradamos a lo que el caso ya tiene (client) sin space.
    return { caseId, organizationId, clientId: caseClientId, spaceId: null }
  }
}

export const AUTO_DERIVABLE_RESOLVER_CODES = Object.keys(RESOLVERS) as AutoDerivableItemCode[]
