import 'server-only'

import type { Session } from 'next-auth'

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

/**
 * Construye el `TenantEntitlementSubject` canónico que consume
 * `resolveOrganizationWorkspaceProjection` (TASK-611) a partir del `session.user`
 * de NextAuth.
 *
 * **Por qué este helper existe** (TASK-916 follow-up, 2026-05-21): las server
 * pages organization-first (`/agency/organizations/[id]`, `/finance/clients/[id]`,
 * y futuras) construían este subject inline, repitiendo el mapeo de 10 campos y
 * leyendo `session.user.businessLines` / `session.user.serviceModules`
 * directamente en archivos UI. Eso disparaba la lint rule
 * `greenhouse/no-untokenized-business-line-branching` (un FALSO POSITIVO: los
 * campos no se usaban para branching de visibilidad — son parte del shape del
 * subject que el resolver canónico SÍ consume internamente para autorización
 * fina, NO una decisión de UI).
 *
 * **Solución canónica (no parche)**: centralizar la construcción del subject en
 * este módulo `src/lib/organization-workspace/` (la capa canónica del resolver,
 * NO un archivo UI). Beneficios:
 *  - **SSOT**: una sola definición del mapeo session→subject. Si
 *    `TenantEntitlementSubject` gana un campo nuevo (p.ej. `memberId`), se agrega
 *    acá una vez, no en cada page.
 *  - **DRY**: ambas pages (agency + finance + futuras) reusan el helper.
 *  - **Boundary correcto**: la lectura de campos legacy de session
 *    (`businessLines`/`serviceModules`) vive donde el resolver los necesita
 *    (capa de entitlements), no en la capa de presentación. La lint rule deja de
 *    disparar legítimamente — no por suppression, sino porque el read ya no
 *    ocurre en un archivo UI.
 *
 * NO decide visibilidad ni branchea por business_line — solo proyecta el shape
 * del subject. La decisión de acceso vive 100% dentro de
 * `resolveOrganizationWorkspaceProjection`.
 */
export const buildOrganizationWorkspaceSubject = (
  user: Session['user']
): TenantEntitlementSubject => ({
  userId: user.userId,
  tenantType: user.tenantType,
  roleCodes: user.roleCodes,
  primaryRoleCode: user.primaryRoleCode,
  routeGroups: user.routeGroups,
  authorizedViews: user.authorizedViews,
  projectScopes: user.projectScopes,
  campaignScopes: user.campaignScopes,
  businessLines: user.businessLines,
  serviceModules: user.serviceModules
})
