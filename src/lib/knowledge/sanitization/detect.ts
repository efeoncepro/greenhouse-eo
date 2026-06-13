/**
 * TASK-1082 — Knowledge ingestion content safety detector (pure).
 *
 * Trata el contenido ingerido como input NO confiable. Detecta (no redacta):
 *  - valores de secretos/credenciales (no menciones de "secret" en prosa),
 *  - PII fuerte (RUT chileno),
 *  - instrucciones tipo prompt-injection que intenten controlar al agente.
 *
 * Un documento flagged se pone en `quarantined` ANTES de chunkear (no se vuelve
 * recuperable). Apunta a SHAPES de valor, no a que el doc hable de seguridad.
 */

export interface SanitizationFinding {
  code: string
  detail: string
}

export interface SanitizationResult {
  flagged: boolean
  findings: SanitizationFinding[]
}

// Valores de credenciales (no la palabra "secret"). Shapes concretos.
const SECRET_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/, 'jwt'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, 'private_key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'aws_access_key'],
  [/\b(?:sk|pk)-[A-Za-z0-9]{20,}\b/, 'stripe_openai_key'],
  [/\bgh[posu]_[A-Za-z0-9]{30,}\b/, 'github_token'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, 'slack_token'],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{24,}=*/, 'bearer_token'],
  // password/token = "<valor concreto>" (con comillas, valor sin espacios)
  [/\b(?:password|passwd|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"'\s]{8,}["']/i, 'inline_credential']
]

const PII_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/, 'cl_rut']
]

const INJECTION_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/ignore\s+(?:all\s+)?(?:the\s+)?(?:previous|above|prior)\s+(?:instructions|prompts?|rules)/i, 'ignore_previous'],
  [/disregard\s+(?:the\s+)?(?:system|previous|above)\s+(?:prompt|instructions)/i, 'disregard_system'],
  [/\byou\s+are\s+now\s+(?:a|an|the)\s+/i, 'role_override'],
  [/\bpretend\s+(?:you\s+are|to\s+be)\b/i, 'roleplay'],
  [/(?:reveal|print|show|repeat)\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions)/i, 'reveal_prompt'],
  [/\boverride\s+(?:the\s+)?(?:system|safety|access|policy)\b/i, 'override_policy']
]

const scan = (
  text: string,
  patterns: ReadonlyArray<readonly [RegExp, string]>,
  detailPrefix: string
): SanitizationFinding[] => {
  const findings: SanitizationFinding[] = []

  for (const [pattern, code] of patterns) {
    if (pattern.test(text)) {
      findings.push({ code, detail: `${detailPrefix}: ${code}` })
    }
  }

  return findings
}

export const detectSensitiveContent = (text: string): SanitizationResult => {
  const findings = [
    ...scan(text, SECRET_PATTERNS, 'secret'),
    ...scan(text, PII_PATTERNS, 'pii')
  ]

  return { flagged: findings.length > 0, findings }
}

export const detectPromptInjection = (text: string): SanitizationResult => {
  const findings = scan(text, INJECTION_PATTERNS, 'injection')

  return { flagged: findings.length > 0, findings }
}

/** Combinado: secretos + PII + prompt-injection. */
export const sanitizeKnowledgeContent = (text: string): SanitizationResult => {
  const findings = [
    ...detectSensitiveContent(text).findings,
    ...detectPromptInjection(text).findings
  ]

  return { flagged: findings.length > 0, findings }
}
