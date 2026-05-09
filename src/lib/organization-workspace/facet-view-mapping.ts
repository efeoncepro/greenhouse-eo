import type { OrganizationFacet } from './facet-capability-mapping'

/**
 * TASK-611 — Mapping canónico facet → viewCode underlying.
 *
 * Es el contrato consumido por el reliability signal `identity.workspace_projection.facet_view_drift`.
 * Detecta cuando un subject tiene capability `organization.<facet>` pero NO tiene el viewCode
 * subyacente en su `authorizedViews` — drift entre la capa fina (capabilities, TASK-611) y la capa
 * broad (authorizedViews, legacy).
 *
 * Coexisten en V1 (decisión cerrada en spec §10). Colapso de `authorizedViews` queda como follow-up
 * post-soak ≥6 meses con drift sostenido en 0.
 *
 * Spec: docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md Apéndice B.
 *
 * Cualquier cambio en este mapping requiere actualizar el reader del reliability signal en
 * `src/lib/reliability/queries/workspace-projection-drift.ts`.
 */
export const FACET_TO_VIEW_CODE: Record<OrganizationFacet, string> = {
  identity: 'gestion.organizaciones',
  spaces: 'gestion.spaces',
  team: 'gestion.equipo',
  delivery: 'gestion.delivery',
  finance: 'finanzas.clientes',
  economics: 'gestion.economia',
  crm: 'comercial.pipeline',
  services: 'gestion.servicios',
  staffAug: 'gestion.staff_augmentation'
} as const
