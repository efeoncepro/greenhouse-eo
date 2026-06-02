/**
 * TASK-991 Slice 1 — SSOT de derivación de `organization_type`.
 *
 * `organization_type` y `lifecycle_stage` son dos columnas ortogonales de
 * `greenhouse_core.organizations` que deben reconciliarse. El bug class fuente
 * (Grupo Berel): la puerta HubSpot escribía `lifecycle_stage='active_client'`
 * pero NUNCA `organization_type`, dejándolo en el default `'other'` → invisible
 * en la lista de clientes de Finanzas.
 *
 * Esta función es la ÚNICA fuente de verdad de "qué `organization_type` corresponde
 * dado el lifecycle + los roles". Reemplaza el `promoteToClientCapableType` inline
 * y se usa en TODA escritura de la fila (helper `upsertCanonicalOrganization` +
 * la puerta party). El CHECK constraint `organizations_type_lifecycle_consistent`
 * (TASK-991 Slice 3) es la garantía DB de defense-in-depth.
 *
 * NO incluye `efeonce_internal`: la entidad operativa (Efeonce) se marca con el
 * flag `is_operating_entity`, NO con `organization_type` (la CHECK existente
 * `organizations_type_check` solo admite client/supplier/both/other).
 *
 * Pure. Sin IO. Testeable.
 */

export const ORGANIZATION_TYPES = ['client', 'supplier', 'both', 'other'] as const

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]

/**
 * Origin del nacimiento de la organización (TASK-991). Atributo de atribución:
 * "por qué puerta nació este registro". Backfilleado best-effort en filas legacy
 * (heurística `hubspot_company_id NOT NULL → hubspot_sync`, resto `migration`) y
 * seteado explícito en escrituras nuevas.
 */
export const ORGANIZATION_ORIGINS = [
  'hubspot_sync',
  'nubox',
  'manual',
  'adopt',
  'quote_converted',
  'migration',
  'bootstrap'
] as const

export type OrganizationOrigin = (typeof ORGANIZATION_ORIGINS)[number]

export interface DeriveOrganizationTypeInput {
  /** Etapa comercial canónica (TASK-535). `active_client` ⇒ rol cliente. */
  lifecycleStage?: string | null
  /** El sujeto tiene rol cliente (factura/contrato). Default false. */
  hasClientRole?: boolean
  /** El sujeto tiene rol proveedor. Default false. */
  hasSupplierRole?: boolean
  /**
   * Tipo actual de la org (al mergear roles sobre una existente). Permite que
   * un `supplier` que adquiere rol cliente pase a `both`, etc. — reemplaza la
   * semántica de `promoteToClientCapableType`.
   */
  currentType?: string | null
}

const isClientCapable = (currentType?: string | null): boolean =>
  currentType === 'client' || currentType === 'both'

const isSupplierCapable = (currentType?: string | null): boolean =>
  currentType === 'supplier' || currentType === 'both'

/**
 * Deriva el `organization_type` canónico. Reglas:
 *  - `active_client` (o `hasClientRole`) ⇒ al menos `client`.
 *  - `provider_only` (o `hasSupplierRole`) ⇒ al menos `supplier`.
 *  - ambos roles ⇒ `both`.
 *  - sin rol (prospect/opportunity/etc) ⇒ `other`.
 * El `currentType` se considera para no degradar un rol ya adquirido (merge).
 */
export const deriveOrganizationType = (input: DeriveOrganizationTypeInput): OrganizationType => {
  const { lifecycleStage, hasClientRole, hasSupplierRole, currentType } = input

  const client =
    hasClientRole === true || lifecycleStage === 'active_client' || isClientCapable(currentType)

  const supplier =
    hasSupplierRole === true || lifecycleStage === 'provider_only' || isSupplierCapable(currentType)

  if (client && supplier) return 'both'
  if (client) return 'client'
  if (supplier) return 'supplier'

  return 'other'
}

/**
 * Kill-switch del write canónico de la puerta HubSpot (TASK-991). **Default ON.**
 *
 * Gatea el comportamiento corrector de `createPartyFromHubSpotCompany` (escribir
 * `organization_type` derivado + `public_id` + `country` + `origin`) y de
 * `promoteParty` (reconciliar `organization_type` al promover a active_client/
 * provider_only). Es una corrección pura, validada contra PG real (rollback) y
 * con TODOS los writers de `active_client` cubiertos → es seguro como default.
 *
 * **Patrón kill-switch (no shadow):** default ON significa que la escritura
 * correcta es el comportamiento por defecto en TODOS los runtimes (Vercel +
 * ops-worker) sin depender de setear un env var por runtime (evita el drift
 * dual-env que es justo la clase de bug que esta task combate). Solo
 * `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED='false'` lo apaga (emergencia) — y eso
 * NO debe hacerse con el CHECK `organizations_type_lifecycle_consistent` activo,
 * porque la puerta legacy volvería a producir `active_client+other` y el CHECK
 * lo rechazaría.
 *
 * El helper `upsertCanonicalOrganization` (puertas finance/supplier) deriva el
 * type SIEMPRE (no gated) — ya es canónico.
 */
export const isCanonicalOrganizationWriteEnabled = (): boolean =>
  process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED !== 'false'
