import 'server-only'

/**
 * TASK-1921 — autorización del render de piezas de marca. Tres planos, una puerta:
 *
 *   1. capability por acción (`can()` con literales: el test de cobertura capability ⇒ grant las ve); los grants viven
 *      en runtime.ts (DESIGNER ∪ EFEONCE_ADMIN);
 *   2. actor interno: un `client_*` nunca pide ni lee piezas de marca (hoy sólo existe la marca propia de Efeonce);
 *   3. organización: la de la marca, la organización canónica de Efeonce (`public_id` EO-ORG-0007), resuelta server-side.
 *      Un `organizationId` distinto se responde como inexistente (404 anti-oráculo). Cuando el dueño pase a Marketing
 *      Studio o Globe y haya marcas de clientes, este plano pasa a entitlement por organización (`module_assignments`).
 */

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { BrandRenderActor } from './contracts'
import { BrandRenderForbiddenError, BrandRenderNotFoundError } from './errors'

/** `public_id` de la organización canónica de Efeonce (la dueña de la marca propia). */
export const EFEONCE_BRAND_ORGANIZATION_PUBLIC_ID = 'EO-ORG-0007'

export type BrandRenderAccessNeed = 'create' | 'read'

export interface BrandRenderAccessGrant {
  organizationId: string
  actor: BrandRenderActor
}

export const resolveBrandOrganizationId = async (): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT organization_id FROM greenhouse_core.organizations WHERE public_id = $1 LIMIT 1`,
    [EFEONCE_BRAND_ORGANIZATION_PUBLIC_ID]
  )

  return rows[0]?.organization_id ?? null
}

const hasCapability = (subject: TenantEntitlementSubject, need: BrandRenderAccessNeed): boolean =>
  need === 'create'
    ? can(subject, 'brand_render.request.create', 'create', 'tenant')
    : can(subject, 'brand_render.request.read', 'read', 'tenant')

export const assertBrandRenderAccess = async (input: {
  subject: TenantEntitlementSubject
  need: BrandRenderAccessNeed
  /** El que pide el caller (opcional). Si viene, debe ser la organización de la marca. */
  organizationId?: string | null
  actorKind?: BrandRenderActor['kind']
}): Promise<BrandRenderAccessGrant> => {
  if (input.subject.tenantType === 'client') {
    throw new BrandRenderForbiddenError('Las piezas de marca sólo las pide el equipo de Efeonce')
  }

  if (!hasCapability(input.subject, input.need)) {
    throw new BrandRenderForbiddenError(
      input.need === 'create' ? 'El actor no tiene brand_render.request.create' : 'El actor no tiene brand_render.request.read'
    )
  }

  const organizationId = await resolveBrandOrganizationId()

  if (!organizationId || (input.organizationId && input.organizationId !== organizationId)) {
    throw new BrandRenderNotFoundError('organization', input.organizationId ?? EFEONCE_BRAND_ORGANIZATION_PUBLIC_ID)
  }

  return { organizationId, actor: { kind: input.actorKind ?? 'member', userId: input.subject.userId ?? null } }
}
