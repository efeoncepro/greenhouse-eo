import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import {
  provisionClientFromWizard,
  type WizardOrigin
} from '@/lib/client-lifecycle/commands/provision-client-from-wizard'
import { ClientLifecycleValidationError } from '@/lib/client-lifecycle/types'
import type { FinanceContactRecord } from '@/lib/commercial/party/commands/instantiate-client-for-party'
import { provisionNotionConnectIntent, type NotionConnectIntent } from '@/lib/client-onboarding/notion-connect-store'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

const VALID_ORIGINS: WizardOrigin[] = ['manual', 'hubspot_company', 'nubox_sale', 'adopt']

// POST /api/admin/clients/lifecycle/provision
// Single canonical front door (wizard commit): writes the org via the SSOT +
// instantiates the Cliente (+ MXN-capable billing) + opens the onboarding case,
// all in one atomic transaction. The org row is created here ONLY via
// upsertCanonicalOrganization (TASK-991), never inline.
export async function POST(request: Request) {
  const { tenant, userId, errorResponse } = await authorizeLifecycle('client.lifecycle.case.open')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  try {
    const origin = body.origin as WizardOrigin

    if (!VALID_ORIGINS.includes(origin)) {
      throw new ClientLifecycleValidationError('invalid_origin', 'origin inválido.', 400)
    }

    const identity = (body.identity ?? {}) as Record<string, unknown>
    const finance = (body.finance ?? {}) as Record<string, unknown>
    const financeContacts = parseFinanceContacts(body.contacts)
    const notionAnchors = parseNotionAnchors(body.notionAnchors)
    const teamsAnchor = parseTeamsAnchor(body.teamsConnect ?? body.teamsAnchor)
    const phases = parsePhases(body.phases)

    // TASK-998 — connect Notion por token scoped. Provisiona el secret (auto) +
    // valida/anti-tamper ANTES de la tx (fuera del PG). El intent (secretRef + db
    // ids) se ancla en la metadata del caso; el space_notion_sources se completa
    // cuando exista el Space. El token NUNCA viaja a PG ni se loggea.
    const notionConnect = parseNotionConnect(body.notionConnect)
    let notionConnectIntent: NotionConnectIntent | undefined
    // NON-BLOCKING (TASK-998): el vínculo de Notion es un ítem del checklist de
    // provisioning, NO una pieza del nacimiento. Si falla (token inválido, 502 de
    // Notion, secret), NUNCA bloquea crear el cliente: se deja pendiente en el
    // checklist (provision_notion_workspace) + warning honesto en la respuesta.
    let notionConnectWarning: string | null = null

    if (notionConnect) {
      const provisioned = await provisionNotionConnectIntent({
        clientSlug: String(identity.organizationName ?? ''),
        token: notionConnect.token,
        tareasDbId: notionConnect.tareasDbId,
        proyectosDbId: notionConnect.proyectosDbId,
        sprintsDbId: notionConnect.sprintsDbId
      })

      if (!provisioned.ok || !provisioned.intent) {
        notionConnectWarning =
          provisioned.reason ??
          'No pudimos vincular Notion ahora. El cliente se creó igual; completá el vínculo desde su checklist.'
        captureWithDomain(new Error(`notion_connect_deferred: ${provisioned.errorCode ?? 'unknown'}`), 'commercial', {
          level: 'warning',
          tags: { source: 'client_lifecycle:notion_connect_deferred' }
        })
      } else {
        notionConnectIntent = provisioned.intent
      }
    }

    const result = await provisionClientFromWizard({
      origin,
      existingOrganizationId: typeof body.existingOrganizationId === 'string' ? body.existingOrganizationId : undefined,
      identity: {
        organizationName: String(identity.organizationName ?? ''),
        legalName: typeof identity.legalName === 'string' ? identity.legalName : undefined,
        taxId: typeof identity.taxId === 'string' ? identity.taxId : undefined,
        taxIdType: typeof identity.taxIdType === 'string' ? identity.taxIdType : undefined,
        country: typeof identity.country === 'string' ? identity.country : undefined,
        industry: typeof identity.industry === 'string' ? identity.industry : undefined,
        hubspotCompanyId: typeof identity.hubspotCompanyId === 'string' ? identity.hubspotCompanyId : undefined
      },
      finance: {
        paymentCurrency: typeof finance.paymentCurrency === 'string' ? (finance.paymentCurrency as never) : undefined,
        paymentTermsDays: typeof finance.paymentTermsDays === 'number' ? finance.paymentTermsDays : undefined
      },
      financeContacts,
      notionAnchors,
      teamsAnchor,
      notionConnectIntent,
      space: {
        spaceName: typeof body.spaceName === 'string' ? body.spaceName : undefined,
        spaceType: typeof body.spaceType === 'string' ? body.spaceType : undefined
      },
      phases,
      effectiveDate: typeof body.effectiveDate === 'string' ? body.effectiveDate : undefined,
      targetCompletionDate: typeof body.targetCompletionDate === 'string' ? body.targetCompletionDate : undefined,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
      hubspotDealId: typeof body.hubspotDealId === 'string' ? body.hubspotDealId : undefined,
      clientKind: typeof body.clientKind === 'string' ? body.clientKind : undefined,
      triggeredByUserId: userId
    })

    return NextResponse.json({ ...result, notionConnectWarning }, { status: 201 })
  } catch (error) {
    return mapLifecycleError(error, 'provision_from_wizard')
  }
}

// TASK-997 Slice 2 — normaliza los contactos de finanzas del wizard a la forma
// canónica persistida (External Reference con provenance). Ignora entradas sin
// nombre. `hubspotContactId` presente ⇒ source 'hubspot'; si no, 'manual'.
const parseFinanceContacts = (raw: unknown): FinanceContactRecord[] => {
  if (!Array.isArray(raw)) return []

  const contacts: FinanceContactRecord[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const name = typeof item.name === 'string' ? item.name.trim() : ''

    if (!name) continue

    const hubspotContactId =
      typeof item.hubspotContactId === 'string' && item.hubspotContactId.trim()
        ? item.hubspotContactId.trim()
        : null

    contacts.push({
      name,
      email: typeof item.email === 'string' && item.email.trim() ? item.email.trim() : null,
      role: typeof item.role === 'string' && item.role.trim() ? item.role.trim() : null,
      hubspotContactId,
      source: hubspotContactId ? 'hubspot' : 'manual'
    })
  }

  return contacts
}

// TASK-997 Slice 3 — normaliza las bases Notion ancladas del wizard. Ignora
// entradas sin id.
const parseNotionAnchors = (raw: unknown): { notionDatabaseId: string; title: string }[] => {
  if (!Array.isArray(raw)) return []

  const anchors: { notionDatabaseId: string; title: string }[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const id = typeof item.notionDatabaseId === 'string' ? item.notionDatabaseId.trim() : ''

    if (!id) continue

    anchors.push({
      notionDatabaseId: id,
      title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : id
    })
  }

  return anchors
}

// TASK-992 — normaliza las fases comerciales del wizard (paso Comercial). Solo
// entran fases con nombre; las fechas son opcionales (start/end ISO o null).
const parsePhases = (raw: unknown): { name: string; start: string | null; end: string | null }[] => {
  if (!Array.isArray(raw)) return []

  const phases: { name: string; start: string | null; end: string | null }[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const name = typeof item.name === 'string' ? item.name.trim() : ''

    if (!name) continue

    phases.push({
      name,
      start: typeof item.start === 'string' && item.start.trim() ? item.start.trim() : null,
      end: typeof item.end === 'string' && item.end.trim() ? item.end.trim() : null
    })
  }

  return phases
}

// TASK-998 — normaliza el connect Notion del wizard (token + las 3 db ids). Devuelve
// null salvo que estén las 4 piezas. El token solo se usa server-side para provisionar
// el secret; nunca se persiste crudo ni se loggea.
const parseNotionConnect = (
  raw: unknown
): { token: string; tareasDbId: string; proyectosDbId: string; sprintsDbId: string } | null => {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const token = typeof item.token === 'string' ? item.token.trim() : ''
  const tareasDbId = typeof item.tareasDbId === 'string' ? item.tareasDbId.trim() : ''
  const proyectosDbId = typeof item.proyectosDbId === 'string' ? item.proyectosDbId.trim() : ''
  const sprintsDbId = typeof item.sprintsDbId === 'string' ? item.sprintsDbId.trim() : ''

  if (!token || !tareasDbId || !proyectosDbId || !sprintsDbId) return null

  return { token, tareasDbId, proyectosDbId, sprintsDbId }
}

// TASK-997 Slice 4 / TASK-998 — normaliza el equipo + canal de Teams anclado del wizard.
const parseTeamsAnchor = (
  raw: unknown
): { teamId: string; teamName: string; channelId?: string; channelName?: string } | null => {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const teamId = typeof item.teamId === 'string' ? item.teamId.trim() : ''

  if (!teamId) return null

  const channelId = typeof item.channelId === 'string' && item.channelId.trim() ? item.channelId.trim() : undefined

  return {
    teamId,
    teamName: typeof item.teamName === 'string' && item.teamName.trim() ? item.teamName.trim() : teamId,
    channelId,
    channelName: typeof item.channelName === 'string' && item.channelName.trim() ? item.channelName.trim() : channelId
  }
}
