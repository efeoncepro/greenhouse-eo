// TASK-1742 — Sanitización determinística del texto candidato ANTES de egress.
// Módulo puro: no IO, no logs y ningún dato de identidad estructurado.

export const ASSESSMENT_AI_INPUT_SAFETY_REASONS = [
  'prompt_injection_detected',
  'embedded_pii_redacted',
  'protected_data_redacted',
  'multilingual_or_ood',
  'off_topic_or_ood',
] as const

export type AssessmentAiInputSafetyReason = (typeof ASSESSMENT_AI_INPUT_SAFETY_REASONS)[number]

export interface AssessmentAiSafeInput {
  text: string
  blocked: boolean
  reasons: AssessmentAiInputSafetyReason[]
  redactionCount: number
}

const MAX_ANSWER_CHARS = 6000

const INJECTION_PATTERNS = [
  /\bignore (?:all |any )?(?:previous|prior|system|developer) instructions?\b/iu,
  /\b(?:ignora|omite) (?:todas? las )?(?:instrucciones|reglas|indicaciones) (?:anteriores|previas|del sistema)\b/iu,
  /\b(?:system|developer) (?:prompt|message)\b/iu,
  /\b(?:jailbreak|prompt injection)\b/iu,
  /\b(?:score|punt[uú]a(?:me)?) (?:this|me|esta respuesta) (?:as |con |a )?100\b/iu,
] as const

const REDACTION_PATTERNS: Array<{ reason: AssessmentAiInputSafetyReason; token: string; pattern: RegExp }> = [
  {
    reason: 'embedded_pii_redacted',
    token: '[EMAIL_REDACTADO]',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
  },
  {
    reason: 'embedded_pii_redacted',
    token: '[TELEFONO_REDACTADO]',
    pattern: /(?<!\w)(?:\+?\d[\d .()-]{7,}\d)(?!\w)/gu,
  },
  {
    reason: 'embedded_pii_redacted',
    token: '[IDENTIFICADOR_REDACTADO]',
    pattern: /\b(?:rut|dni|nif|nie|passport|pasaporte|c[eé]dula)\s*[:#-]?\s*[A-Z0-9.-]{5,}\b/giu,
  },
  {
    reason: 'embedded_pii_redacted',
    token: '[URL_REDACTADA]',
    pattern: /https?:\/\/\S+/giu,
  },
  {
    reason: 'protected_data_redacted',
    token: '[DATO_PROTEGIDO_REDACTADO]',
    pattern: /\b(?:tengo|soy|mi)\s+(?:\d{1,2}\s+a[nñ]os|embarazad[ao]|discapacidad|religion|religi[oó]n|etnia|orientaci[oó]n sexual|identidad de g[eé]nero)\b/giu,
  },
]

const meaningfulTokens = (value: string): Set<string> =>
  new Set(
    value
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .match(/[a-z]{4,}/g)
      ?.filter(token => !['para', 'como', 'esta', 'este', 'desde', 'sobre', 'cuando', 'donde', 'porque'].includes(token)) ?? [],
  )

const looksOffTopic = (answer: string, question: string, rubric: Record<string, unknown>): boolean => {
  if (answer.trim().length < 80) return false

  const expected = meaningfulTokens(`${question} ${JSON.stringify(rubric)}`)

  if (expected.size === 0) return false

  const actual = meaningfulTokens(answer)

  return ![...expected].some(token => actual.has(token))
}

const hasMaterialNonLatinScript = (value: string): boolean => {
  const letters = value.match(/\p{L}/gu) ?? []

  if (letters.length < 20) return false

  const nonLatin = letters.filter(letter => !/\p{Script=Latin}/u.test(letter)).length

  return nonLatin / letters.length >= 0.2
}

export const sanitizeAssessmentAiCandidateInput = (input: {
  answerText: string
  questionPrompt: string
  rubric: Record<string, unknown>
}): AssessmentAiSafeInput => {
  const source = input.answerText.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').slice(0, MAX_ANSWER_CHARS)
  const reasons: AssessmentAiInputSafetyReason[] = []

  if (INJECTION_PATTERNS.some(pattern => pattern.test(source))) {
    reasons.push('prompt_injection_detected')
  }

  if (hasMaterialNonLatinScript(source)) reasons.push('multilingual_or_ood')
  if (looksOffTopic(source, input.questionPrompt, input.rubric)) reasons.push('off_topic_or_ood')

  let text = source
  let redactionCount = 0

  for (const rule of REDACTION_PATTERNS) {
    text = text.replace(rule.pattern, () => {
      redactionCount += 1
      if (!reasons.includes(rule.reason)) reasons.push(rule.reason)

      return rule.token
    })
  }

  return {
    text,
    blocked: reasons.includes('prompt_injection_detected'),
    reasons,
    redactionCount,
  }
}
