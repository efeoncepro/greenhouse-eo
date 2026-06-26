/**
 * TASK-1254 — Dataset canónico de dominios de email (CORE PURO / ISOMÓRFICO).
 *
 * Source of truth ÚNICO de la clasificación de dominio de email para Greenhouse:
 * proveedores free/personales, dominios desechables/temporales, local-parts
 * role-based, y typos comunes. Consumido por:
 *  - `tier1.ts` (clasificador Tier 1, browser-safe) → renderer + `submitForm`.
 *  - `validators/core.ts` (validador `corporate_email`, registry isomórfico).
 *  - `ai-visibility/hubspot/email-domain.ts` (handoff HubSpot, server-only) — consume
 *    este dataset para no mantener una segunda lista divergente (SSOT).
 *
 * REGLA DE PUREZA: este módulo es browser-safe. NUNCA importar `server-only`,
 * `node:*`, Zod ni nada del runtime servidor. Es data + Sets, nada más. Si necesita
 * crecer dinámicamente (refresh por cron desde una tabla), eso vive en una capa
 * server-only aparte que MERGEA sobre este baseline; este baseline siempre compila.
 *
 * Heurística, no verdad absoluta: la lista es acotada y mantenible. Un dominio
 * corporativo raro mal clasificado solo pierde precisión del gate (degradación segura);
 * preferimos no marcar como corporativo un dominio que claramente es free/desechable.
 */

/**
 * Proveedores de email personal/gratuito (NO corporativo). Un lead con uno de estos
 * dominios representa a una persona, no a una empresa.
 */
export const FREE_EMAIL_PROVIDERS: ReadonlySet<string> = new Set<string>([
  // Globales mainstream
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'outlook.es',
  'outlook.cl',
  'hotmail.com',
  'hotmail.es',
  'hotmail.cl',
  'live.com',
  'live.cl',
  'msn.com',
  'yahoo.com',
  'yahoo.es',
  'yahoo.com.mx',
  'yahoo.com.ar',
  'ymail.com',
  'rocketmail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'pm.me',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'gmx.es',
  'mail.com',
  'email.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'tutanota.com',
  'tuta.io',
  'fastmail.com',
  'hey.com',
  // Locales LATAM frecuentes
  'terra.cl',
  'terra.com.br',
  'vtr.net',
  'gmail.cl',
])

/**
 * Dominios desechables / temporales / throwaway. Un lead con uno de estos NO es
 * confiable: el buzón típicamente expira. Subconjunto distinto de free (un lead
 * desechable es siempre peor que uno meramente personal).
 */
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set<string>([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'sharklasers.com',
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'temp-mail.org',
  'trashmail.com',
  'trash-mail.com',
  'yopmail.com',
  'getnada.com',
  'maildrop.cc',
  'dispostable.com',
  'fakeinbox.com',
  'throwawaymail.com',
  'mailnesia.com',
  'mintemail.com',
  'mohmal.com',
  'emailondeck.com',
  'spamgourmet.com',
  'mailcatch.com',
  'inboxbear.com',
  'tempinbox.com',
])

/**
 * Local-parts genéricas/role-based (`info@`, `noreply@`). Un email role-based NO
 * pertenece a una persona identificable; para un lead magnet es señal de baja calidad.
 */
export const ROLE_BASED_LOCAL_PARTS: ReadonlySet<string> = new Set<string>([
  'info',
  'admin',
  'administrator',
  'contact',
  'contacto',
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'support',
  'soporte',
  'help',
  'ayuda',
  'sales',
  'ventas',
  'marketing',
  'hello',
  'hola',
  'office',
  'team',
  'webmaster',
  'postmaster',
  'hostmaster',
  'abuse',
  'billing',
  'facturacion',
  'finance',
  'finanzas',
  'hr',
  'rrhh',
  'jobs',
  'careers',
  'mail',
  'email',
  'enquiries',
  'inquiries',
])

/**
 * Mapa de typo → dominio canónico para typo-suggest ("gmial.com" → "gmail.com").
 * Solo typos inequívocos de proveedores muy frecuentes; NUNCA sugerir sobre un
 * dominio corporativo desconocido (no podemos saber su forma correcta).
 */
export const COMMON_DOMAIN_TYPOS: Readonly<Record<string, string>> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotnail.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'icloud.co': 'icloud.com',
  'iclould.com': 'icloud.com',
  'hotmail.cm': 'hotmail.com',
}

/**
 * Unión free ∪ desechable = todo dominio que NO representa una empresa. Es el conjunto
 * que el clasificador binario `corporate | personal` usa (corporativo = no está acá).
 */
export const PERSONAL_OR_DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set<string>([
  ...FREE_EMAIL_PROVIDERS,
  ...DISPOSABLE_EMAIL_DOMAINS,
])
