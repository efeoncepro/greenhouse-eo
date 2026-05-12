import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { getOrganizationExecutiveSnapshot } from '@/lib/client-portal/readers/curated/account-summary'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

/**
 * TASK-823 — Client Portal API Namespace V1.0 (EPIC-015 child 2/8).
 *
 * GET /api/client-portal/account-summary
 *   Read del executive snapshot del cliente autenticado actual. Consume el
 *   BFF curated re-export de TASK-822 (`@/lib/client-portal/readers/curated/account-summary`),
 *   que apunta canónicamente a `account-360/organization-executive`. Firma
 *   exacta del upstream — sin shape custom (re-classify a `native` cuando
 *   TASK-827 defina las necesidades visuales reales).
 *
 * Auth + scope:
 *   - 401 si no session (JSON, NO redirect — pattern API routes per CLAUDE.md
 *     "Auth en server components / layouts / pages — patrón canónico").
 *   - 403 si `session.user.tenantType !== 'client'` (internal users no pasan
 *     por este endpoint; usan /api/admin/* o /api/agency/*).
 *   - 500 + Sentry capture si session client carece de `organizationId`
 *     (drift del callback NextAuth — defensive, no asume invariant en hot path).
 *
 * Error handling:
 *   - Try/catch envuelve SOLO la llamada al reader (los return-401/403 no
 *     lanzan). Mantiene la señal Sentry limpia (cada incidente refleja
 *     un fallo real downstream).
 *   - `captureWithDomain(err, 'client_portal', { tags: { source, endpoint } })`
 *     emite a Sentry con domain tag para roll-up en el reliability subsystem
 *     (TASK-829 introducirá el rollup `Client Portal Health`).
 *   - Body de error sanitizado via `redactErrorForResponse` (TASK-742) — NUNCA
 *     expone `error.stack`, env vars, GCP secret URIs.
 *
 * Domain direction:
 *   - src/app/api/client-portal/** importa de @/lib/client-portal/* ✅ permitido.
 *   - La ESLint rule `greenhouse/no-cross-domain-import-from-client-portal`
 *     enforce solo la dirección inversa (producer-domain → client-portal).
 *
 * Spec: docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md §9.
 * Pattern source: TASK-553 `src/app/api/me/shortcuts/route.ts` (verbatim mirror).
 */

export const dynamic = 'force-dynamic'

export const GET = async () => {
  const session = await getServerAuthSession()

  if (!session?.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.tenantType !== 'client') {
    return NextResponse.json({ error: 'Not a client session' }, { status: 403 })
  }

  const organizationId = session.user.organizationId

  if (!organizationId) {
    // Defensive: tenant_type='client' DEBE tener organizationId resuelto en el
    // session callback de NextAuth. Si emerge en producción, hay drift en auth.ts.
    captureWithDomain(
      new Error('client session missing organizationId'),
      'client_portal',
      {
        tags: { source: 'api_endpoint', endpoint: 'account_summary', stage: 'session_validation' },
        extra: { userId: session.user.userId }
      }
    )

    return NextResponse.json({ error: 'Session incomplete' }, { status: 500 })
  }

  try {
    const snapshot = await getOrganizationExecutiveSnapshot(organizationId)

    return NextResponse.json(snapshot)
  } catch (err) {
    captureWithDomain(err, 'client_portal', {
      tags: { source: 'api_endpoint', endpoint: 'account_summary' },
      extra: { organizationId }
    })

    return NextResponse.json(
      { error: 'Unable to load account summary', detail: redactErrorForResponse(err) },
      { status: 500 }
    )
  }
}
