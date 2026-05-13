import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { resolveClientPortalModulesForOrganization } from '@/lib/client-portal/readers/native/module-resolver'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

/**
 * TASK-825 Slice 3 — GET /api/client-portal/modules
 *
 * Devuelve los módulos visibles del cliente autenticado actual. Consume el
 * resolver canónico (TASK-825 Slice 2) — primer reader **native** del BFF
 * (TASK-822 V1.1 §3.1).
 *
 * Pattern source: TASK-823 `src/app/api/client-portal/account-summary/route.ts`
 * mirror verbatim (mismo shape de auth + redact + Sentry capture).
 *
 * Auth + scope:
 *   - 401 si no session (JSON, NO redirect — pattern API routes per CLAUDE.md
 *     "Auth en server components / layouts / pages — patrón canónico").
 *   - 403 si `session.user.tenantType !== 'client'` (internal users no pasan
 *     por este endpoint; usan /api/admin/client-portal/* en TASK-826).
 *   - 500 + Sentry capture si session client carece de `organizationId`
 *     (drift del callback NextAuth — defensive, no asume invariant).
 *
 * Error handling:
 *   - Try/catch envuelve SOLO la llamada al resolver (los return-401/403 no
 *     lanzan). Mantiene la señal Sentry limpia.
 *   - captureWithDomain(err, 'client_portal', { tags: { source, endpoint } })
 *     emite a Sentry con domain tag para roll-up en TASK-829 reliability
 *     subsystem.
 *   - Body de error sanitizado via redactErrorForResponse (TASK-742).
 *
 * Cache: el resolver tiene cache in-process TTL 60s — este endpoint NO
 * añade cache adicional. Cardinality V1.0 estimada ~5-10 DB queries/min
 * steady con cache hit rate >90% post-warm.
 *
 * Spec: docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md V1.4 §6 + §9.
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
        tags: { source: 'api_endpoint', endpoint: 'modules', stage: 'session_validation' },
        extra: { userId: session.user.userId }
      }
    )

    return NextResponse.json({ error: 'Session incomplete' }, { status: 500 })
  }

  try {
    const modules = await resolveClientPortalModulesForOrganization(organizationId)

    return NextResponse.json(modules)
  } catch (err) {
    captureWithDomain(err, 'client_portal', {
      tags: { source: 'api_endpoint', endpoint: 'modules' },
      extra: { organizationId }
    })

    return NextResponse.json(
      { error: 'Unable to load client portal modules', detail: redactErrorForResponse(err) },
      { status: 500 }
    )
  }
}
