import 'server-only'

/**
 * Format validators for known critical secrets.
 *
 * Why this exists (TASK-742 Capa 1):
 *   normalizeSecretValue() limpia comillas envolventes y `\n` literales, pero
 *   no detecta payloads con length anómala, charset inválido o whitespace
 *   embebido. Un secret malformado pasa el normalize, llega a NextAuth/Azure,
 *   y rompe runtime con un error opaco (`error=Callback`).
 *
 *   Estos validadores son la primera línea de defensa: rechazan payloads
 *   que estructuralmente no pueden ser válidos. Si un secret real cae aquí,
 *   significa que la rotación se hizo mal — el operador debe re-publicar
 *   con `printf %s "$VALOR" | gcloud secrets versions add` (canónico).
 *
 * Notes:
 *   - Las reglas son intencionalmente permisivas: validan shape, no
 *     correctness. Un AZURE_AD_CLIENT_SECRET de 40 chars con charset OK
 *     puede ser igualmente incorrecto si Azure rotó pero nadie subió la
 *     nueva versión a Secret Manager. Eso lo cubre Capa 2 (readiness).
 *   - Charsets son inclusivos: cualquier producto OAuth conocido cabe.
 *   - Length ranges son históricos observados, no contractuales: futuros
 *     proveedores podrían emitir tokens más largos. Si pasa, abrimos el
 *     range. Mejor falso positivo que falso negativo silencioso.
 */

export type SecretFormatViolation =
  | 'too_short'
  | 'too_long'
  | 'has_internal_whitespace'
  | 'has_quote_chars'
  | 'has_literal_newline_marker'
  | 'has_non_printable'
  | 'invalid_charset'
  | 'wrong_shape'

export interface SecretFormatValidationResult {
  ok: boolean
  byteLen: number
  violations: SecretFormatViolation[]
}

interface FormatRule {
  minLen: number
  maxLen: number
  charset?: RegExp
  shape?: RegExp
  description: string
}

const PRINTABLE_ASCII_RE = /^[\x20-\x7E]+$/u
const HAS_INTERNAL_WHITESPACE_RE = /\s/u
const HAS_QUOTE_RE = /['"`]/u
const HAS_LITERAL_NL_MARKER_RE = /\\(?:n|r)/u

/** Minimum entropy floors are based on observed real-world payloads. */
const FORMAT_RULES: Record<string, FormatRule> = {
  // NextAuth recomienda `openssl rand -base64 32` → 44 chars base64. También
  // aceptamos hex (64 chars) y otros encodings sanos ≥ 32 bytes.
  NEXTAUTH_SECRET: {
    minLen: 32,
    maxLen: 256,
    charset: /^[A-Za-z0-9+/=_-]+$/u,
    description: 'NextAuth shared secret (base64 / hex / urlsafe ≥32 bytes)'
  },
  // Azure AD client secret v2: 40-char alphanumeric con `~`, `_`, `.`, `-`.
  AZURE_AD_CLIENT_SECRET: {
    minLen: 30,
    maxLen: 80,
    charset: /^[A-Za-z0-9~_.\-]+$/u,
    description: 'Azure AD client secret (v2 alphanumeric + ~_.-)'
  },
  // Azure AD client_id es un GUID estándar.
  AZURE_AD_CLIENT_ID: {
    minLen: 36,
    maxLen: 36,
    shape: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u,
    description: 'Azure AD client_id (GUID lowercase)'
  },
  // Google OAuth client secret: típicamente 24 chars `GOCSPX-` prefix o 24 chars [A-Za-z0-9_-].
  GOOGLE_CLIENT_SECRET: {
    minLen: 20,
    maxLen: 120,
    charset: /^[A-Za-z0-9_\-]+$/u,
    description: 'Google OAuth client secret'
  },
  GOOGLE_CLIENT_ID: {
    minLen: 30,
    maxLen: 200,
    shape: /^[0-9]+-[A-Za-z0-9_]+\.apps\.googleusercontent\.com$/u,
    description: 'Google OAuth client_id (ends with .apps.googleusercontent.com)'
  },
  // NEXTAUTH_URL: HTTPS canonical URL con host válido y sin trailing slash.
  NEXTAUTH_URL: {
    minLen: 12,
    maxLen: 200,
    shape: /^https:\/\/[a-zA-Z0-9.-]+(:\d+)?(?:\/[A-Za-z0-9_\-./]*)?$/u,
    description: 'NextAuth canonical URL (https, no trailing slash, no embedded quotes)'
  },
  // CRON_SECRET: random opaque string, ≥ 16 bytes printable ASCII.
  CRON_SECRET: {
    minLen: 16,
    maxLen: 512,
    charset: /^[A-Za-z0-9+/=_\-.~]+$/u,
    description: 'Cron shared secret (≥16 bytes opaque)'
  },
  // AGENT_AUTH_SECRET: openssl rand -hex 32 → 64 hex chars (también acepta base64).
  AGENT_AUTH_SECRET: {
    minLen: 32,
    maxLen: 256,
    charset: /^[A-Za-z0-9+/=_\-]+$/u,
    description: 'Agent auth shared secret (≥32 bytes opaque)'
  }
}

export const isKnownSecretFormat = (envVarName: string): boolean =>
  Object.prototype.hasOwnProperty.call(FORMAT_RULES, envVarName)

export const getSecretFormatDescription = (envVarName: string): string | null =>
  FORMAT_RULES[envVarName]?.description ?? null

export const validateSecretFormat = (
  envVarName: string,
  value: string | null | undefined
): SecretFormatValidationResult => {
  const violations: SecretFormatViolation[] = []
  const raw = value ?? ''
  const byteLen = Buffer.byteLength(raw, 'utf8')

  const rule = FORMAT_RULES[envVarName]

  if (!rule) {
    // Unknown secret: we don't enforce shape, only basic hygiene.
    if (raw && HAS_INTERNAL_WHITESPACE_RE.test(raw)) violations.push('has_internal_whitespace')
    if (raw && HAS_QUOTE_RE.test(raw)) violations.push('has_quote_chars')
    if (raw && HAS_LITERAL_NL_MARKER_RE.test(raw)) violations.push('has_literal_newline_marker')
    if (raw && !PRINTABLE_ASCII_RE.test(raw)) violations.push('has_non_printable')

    return { ok: violations.length === 0, byteLen, violations }
  }

  if (byteLen < rule.minLen) violations.push('too_short')
  if (byteLen > rule.maxLen) violations.push('too_long')

  if (raw && HAS_INTERNAL_WHITESPACE_RE.test(raw)) violations.push('has_internal_whitespace')
  if (raw && HAS_QUOTE_RE.test(raw)) violations.push('has_quote_chars')
  if (raw && HAS_LITERAL_NL_MARKER_RE.test(raw)) violations.push('has_literal_newline_marker')
  if (raw && !PRINTABLE_ASCII_RE.test(raw)) violations.push('has_non_printable')

  if (rule.shape && raw && !rule.shape.test(raw)) {
    violations.push('wrong_shape')
  } else if (rule.charset && raw && !rule.charset.test(raw)) {
    violations.push('invalid_charset')
  }

  return { ok: violations.length === 0, byteLen, violations }
}

/**
 * Returns a redaction-safe summary suitable for logs / Sentry extras.
 * Never returns the raw payload.
 */
export const summarizeFormatViolation = (
  envVarName: string,
  result: SecretFormatValidationResult
) => ({
  envVarName,
  byteLen: result.byteLen,
  violations: result.violations,
  expectedShape: getSecretFormatDescription(envVarName)
})
