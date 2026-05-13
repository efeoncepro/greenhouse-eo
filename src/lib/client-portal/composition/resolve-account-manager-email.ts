import 'server-only'

/**
 * TASK-827 Slice 4 — D4 helper canonical: resuelve email del account manager
 * para el CTA `mailto:` de `<ModuleNotAssignedEmpty>` + `<ClientPortalZeroStateEmpty>`.
 *
 * **Decisión revisada V1.0** (Discovery FASE 1 detectó):
 *
 * El schema `greenhouse_core.organizations` NO tiene columna
 * `account_manager_user_id` (verificado via grep migrations/* 2026-05-13).
 * `tenant_capabilities` tampoco tiene `account_manager_email`. La cadena
 * canónica D4 (Option B → A → fallback) requiere schema que aún no existe.
 *
 * **Plan V1.0**: helper retorna constante `support@efeoncepro.com` como
 * fallback honesto. CTA mailto: SIEMPRE funciona (nunca queda vacío).
 *
 * **Follow-up V1.1**: cuando emerja la columna `account_manager_user_id` en
 * `organizations` (TASK-derivada en backlog), extender este helper con:
 *
 *   1. SELECT u.email FROM organizations o
 *      LEFT JOIN users u ON u.user_id = o.account_manager_user_id
 *      WHERE o.organization_id = $1
 *   2. Fallback a `support@efeoncepro.com` cuando NULL
 *
 * Pattern preserva interfase async (Promise<string>) para que el call site
 * del page guard (Slice 4) y del component (Slice 5) NO requiera cambio
 * cuando V1.1 ship.
 *
 * NUNCA inventar emails. NUNCA leave the mailto blank. Hard fallback canonical.
 */

const HARD_FALLBACK_EMAIL = 'support@efeoncepro.com'

/**
 * Resuelve email del account manager con fallback chain canonical.
 *
 * V1.0: retorna `support@efeoncepro.com` directo (schema canónica pending).
 * V1.1: extender con canonical 360 lookup.
 *
 * Acepta `organizationId` opcional para preservar interfase forward-compat;
 * V1.0 ignora el param. V1.1 lo consume.
 */
export const resolveAccountManagerEmail = async (organizationId: string): Promise<string> => {
  // V1.0: hard fallback. organizationId reservado para V1.1 PG lookup.
  void organizationId

  return Promise.resolve(HARD_FALLBACK_EMAIL)
}
