/**
 * TASK-1229 — Growth Forms engine · feature flags (default OFF).
 *
 * `GROWTH_FORMS_PUBLIC_API_ENABLED` gatea el render/submit público. Sin flag → el
 * endpoint público resuelve `disabled` (404), aun si hubiera forms publicados.
 * Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md (gate docs:closure-check).
 */
export const GROWTH_FORMS_PUBLIC_API_FLAG = 'GROWTH_FORMS_PUBLIC_API_ENABLED'
export const GROWTH_FORMS_CATALOG_API_FLAG = 'GROWTH_FORMS_CATALOG_API_ENABLED'
export const GROWTH_FORMS_DISPATCH_FLAG = 'GROWTH_FORMS_DISPATCH_ENABLED'
export const GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_FLAG = 'GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED'
export const GROWTH_FORMS_SERVER_VALIDATION_FLAG = 'GROWTH_FORMS_SERVER_VALIDATION_ENABLED'
export const GROWTH_FORMS_EMAIL_VERIFICATION_FLAG = 'GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED'
export const GROWTH_FORMS_PII_ENCRYPTION_FLAG = 'GROWTH_FORMS_PII_ENCRYPTION_ENABLED'
/** TASK-1375 — email de respaldo del ebook (consumer reactivo `growth_ebook_delivery`). ops-worker. */
export const GROWTH_EBOOK_EMAIL_DELIVERY_FLAG = 'GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED'

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

/** Kill switch del API público de forms. Default OFF. */
export const isFormsPublicApiEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_FORMS_PUBLIC_API_FLAG])

/** Kill switch del email de respaldo del ebook. Default OFF → sólo descarga on-screen. */
export const isEbookEmailDeliveryEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_EBOOK_EMAIL_DELIVERY_FLAG])

/**
 * Gate del endpoint de catálogo externo de forms insertables (TASK-1258), consumido
 * server-side por el plugin WordPress / Nexa / futuros hosts vía credencial per-site.
 * Default OFF → `GET /api/public/growth/forms/catalog` resuelve 404 `disabled`.
 *
 * Flag SEPARADO de `GROWTH_FORMS_PUBLIC_API_ENABLED` a propósito: el editor necesita
 * listar forms insertables ANTES de abrir el render/submit público (se elige el form
 * para embeber durante la preparación del launch). Se puede prender en staging/prod de
 * forma independiente. Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.
 */
export const isFormsCatalogApiEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_FORMS_CATALOG_API_FLAG])

/**
 * Gate del dispatcher productivo (ops-worker drain). Default OFF → el handler del
 * worker hace no-op prod-safe (cero queries; el schema greenhouse_growth puede no
 * estar migrado en prod). ON → drena submissions aceptadas y las entrega.
 */
export const isFormsDispatchEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_FORMS_DISPATCH_FLAG])

/**
 * Gate del adapter HubSpot Forms secure-submit (TASK-1230). Default OFF → el adapter
 * resuelve skip controlado (no llama a HubSpot). Prod-safe: sin el flag, cero writes
 * a HubSpot aunque exista un destino `hubspot_forms_secure_submit` configurado.
 */
export const isFormsHubSpotSecureSubmitEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_FLAG])

/**
 * Gate de la autoridad de validación server-side (TASK-1253). Default OFF →
 * comportamiento legacy (`submitForm` NO re-valida por tipo; el cliente valida por UX).
 * ON → `submitForm` re-valida con el MISMO registry canónico que el renderer, normaliza
 * (email lowercased / E.164 / RUT / número) y rechaza payloads con formato inválido
 * (cierra el "POST directo mete basura"). Patrón canónico flag default-OFF + shadow +
 * flip tras staging. Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.
 */
export const isFormsServerValidationEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_FORMS_SERVER_VALIDATION_FLAG])

/**
 * Gate de la verificación de email + gate corporativo por form (TASK-1254). Default OFF →
 * `submitForm` NO aplica política de email (comportamiento legacy) y el endpoint público
 * `verify-email` resuelve 404 `disabled`. ON → Tier 1 (gratis) + Tier 2 (provider, hoy
 * noop) corren y la política del form (`block_field|warn|tag_only`) se aplica. Patrón
 * flag default-OFF + shadow + flip. Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.
 */
export const isFormsEmailVerificationEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_FORMS_EMAIL_VERIFICATION_FLAG])

/**
 * Gate del cifrado at-rest de national_id (TASK-1255). Default OFF → comportamiento
 * legacy (la cédula queda en claro en `normalized_fields_json`). ON → `submitForm`
 * separa los campos national_id del blob, los cifra (AES-256-GCM, key en Secret
 * Manager) y los persiste en `encrypted_fields_json` (boundary: el dispatcher ya no
 * los ve). Patrón flag default-OFF + shadow + flip tras staging. Requiere la key
 * provisionada. Registrar en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.
 */
export const isFormsPiiEncryptionEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_FORMS_PII_ENCRYPTION_FLAG])

/**
 * Límites de abuse-guard del motor (rate-limit per-email/per-IP). Forms no tiene costo
 * LLM, así que el presupuesto global queda en Infinity (el circuit-breaker de costo se
 * desactiva; sólo opera el rate-limit). Consumido por el abuse-guard core compartido.
 */
export const resolveFormsAbuseLimits = (env: NodeJS.ProcessEnv = process.env) => ({
  perEmailPerDay: Number(env.GROWTH_FORMS_PER_EMAIL_PER_DAY) || 10,
  perIpPerDay: Number(env.GROWTH_FORMS_PER_IP_PER_DAY) || 30,
  globalDailyBudgetUsd: Number.POSITIVE_INFINITY,
})
