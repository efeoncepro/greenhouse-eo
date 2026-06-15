#!/usr/bin/env node

/**
 * TASK-1092 + TASK-1124 — Nexa Knowledge production-readiness QA matrix.
 *
 * Runs the governed 12-case matrix against /api/home/nexa with agent-session
 * auth. It validates routing (Knowledge vs operational tools), citation
 * visibility, honest no-answer behavior and the known maintenance-mode coverage
 * gap without tuning retrieval.
 *
 * TASK-1124 extiende cada caso con asserts de CALIDAD DE RESPUESTA sobre el texto
 * crudo del modelo (no la capa de render): síntesis (no copia de fragmento), sin
 * volcado "Fuentes:" anexado, sin encabezados Markdown crudos (regresión "##") y
 * contrato de voz Efeonce (sin 🍏, sin voseo). El eval de retrieval (golden
 * questions) vive aparte en `golden-questions.live.test.ts` (offline, complementario).
 *
 * Usage:
 *   pnpm qa:nexa-knowledge -- --env=staging
 *   pnpm qa:nexa-knowledge -- --env=local --case=K1,K2,G1
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const DEFAULT_LOCAL_URL = 'http://localhost:3000'
const DEFAULT_AGENT_EMAIL = 'agent@greenhouse.efeonce.org'

const QA_CASES = [
  {
    id: 'K1',
    intent: 'ICO personal metrics',
    prompt: '¿Cómo reviso mis métricas ICO personales y qué significan?',
    expected: { knowledge: true, groundedCitation: true }
  },
  {
    id: 'K2',
    intent: 'ICO glossary RpA/OTD/FTR',
    prompt: 'Explícame qué significan RpA, OTD y FTR en el glosario ICO.',
    expected: { knowledge: true, groundedCitation: true }
  },
  {
    id: 'K3',
    intent: 'MCP Greenhouse read-only',
    prompt: '¿Cómo se usa el MCP Greenhouse read-only?',
    expected: { knowledge: true, groundedCitation: true }
  },
  {
    id: 'K4',
    intent: 'Efeonce / Greenhouse / Nexa',
    prompt: '¿Cuál es la diferencia entre Efeonce, Greenhouse y Nexa?',
    expected: { knowledge: true, groundedCitation: true }
  },
  {
    id: 'K5',
    intent: 'Maintenance mode',
    prompt: '¿Qué debo hacer si Greenhouse está en modo mantenimiento?',
    expected: { knowledge: true, groundedCitation: true }
  },
  {
    id: 'K6',
    intent: 'Payroll guide',
    prompt: '¿Cómo funcionan los períodos de nómina y qué debo validar antes de actuar?',
    expected: { knowledge: true, sensitiveValidation: true }
  },
  {
    id: 'O1',
    intent: 'Live payroll amount',
    prompt: '¿Cuánto se va a pagar en la nómina actual?',
    expected: { operational: true, noKnowledge: true }
  },
  {
    id: 'O2',
    intent: 'Live receivables',
    prompt: '¿Qué cuentas por cobrar están pendientes ahora?',
    expected: { operational: true, noKnowledge: true }
  },
  {
    id: 'G1',
    intent: 'Exact nonsense query',
    prompt: 'zxqv-778 procedimiento azul inexistente',
    expected: { knowledge: true, noAnswer: true }
  },
  {
    id: 'G2',
    intent: 'Semantic nonsense query',
    prompt: '¿Cómo apruebo una brújula fiscal de saturno en Greenhouse?',
    expected: { knowledge: true, noAnswer: true }
  },
  {
    id: 'P1',
    intent: 'Agentic policy / filtering',
    prompt: 'Muéstrame la política interna de secretos y accesos sensibles.',
    expected: { knowledge: true, policyFiltering: true }
  },
  {
    id: 'K7',
    intent: 'Current-period ICO caveat',
    prompt: '¿Puedo usar Knowledge para saber mi ICO real del período actual?',
    expected: { knowledge: true, groundedCitation: true }
  }
]

const parseEnvFile = async () => {
  try {
    const raw = await readFile(resolve(process.cwd(), '.env.local'), 'utf8')

    return Object.fromEntries(
      raw
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && line.includes('='))
        .map(line => {
          const [key, ...rest] = line.split('=')
          const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '')

          return [key.trim(), value]
        })
    )
  } catch {
    return {}
  }
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { env: 'staging', caseIds: null, json: false }

  for (const arg of args) {
    if (arg.startsWith('--env=')) {
      options.env = arg.slice('--env='.length)
    } else if (arg.startsWith('--case=')) {
      options.caseIds = new Set(
        arg
          .slice('--case='.length)
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      )
    } else if (arg === '--json') {
      options.json = true
    }
  }

  if (!['local', 'staging'].includes(options.env)) {
    throw new Error('--env must be local or staging')
  }

  return options
}

const resolveAccess = async env => {
  if (env === 'staging') {
    const { resolveStagingAccess } = await import('./lib/vercel-staging-access.mjs')

    const { stagingUrl, bypassSecret, agentSecret, email } = await resolveStagingAccess({
      log: () => {},
      persistBypass: true
    })

    return {
      baseUrl: stagingUrl,
      agentSecret,
      email,
      authHeaders: { 'x-vercel-protection-bypass': bypassSecret },
      requestHeaders: { 'x-vercel-protection-bypass': bypassSecret }
    }
  }

  const envFile = await parseEnvFile()
  const agentSecret = process.env.AGENT_AUTH_SECRET || envFile.AGENT_AUTH_SECRET

  if (!agentSecret) {
    throw new Error('AGENT_AUTH_SECRET not found in env or .env.local')
  }

  return {
    baseUrl: process.env.AGENT_AUTH_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || envFile.AGENT_AUTH_BASE_URL || DEFAULT_LOCAL_URL,
    agentSecret,
    email: process.env.AGENT_AUTH_EMAIL || envFile.AGENT_AUTH_EMAIL || DEFAULT_AGENT_EMAIL,
    authHeaders: {},
    requestHeaders: {}
  }
}

const authenticate = async access => {
  const res = await fetch(new URL('/api/auth/agent-session', access.baseUrl), {
    method: 'POST',
    headers: {
      ...access.authHeaders,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ secret: access.agentSecret, email: access.email })
  })

  if (!res.ok) {
    throw new Error(`agent-session failed (${res.status}): ${await res.text()}`)
  }

  const data = await res.json()

  return `${data.cookieName}=${data.cookieValue}`
}

const askNexa = async ({ access, cookie, prompt }) => {
  const res = await fetch(new URL('/api/home/nexa', access.baseUrl), {
    method: 'POST',
    headers: {
      ...access.requestHeaders,
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ prompt, history: [] })
  })

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`/api/home/nexa failed (${res.status}): ${text.slice(0, 500)}`)
  }

  return JSON.parse(text)
}

// TASK-1124 — patrones de calidad/voz sobre el texto crudo del modelo (no la capa UI).
const RAW_MARKDOWN_HEADING = /^[ \t]{0,3}#{1,6}[ \t]+\S/mu
const APPENDED_FUENTES_DUMP = /\n[ \t]*[*_]{0,2}Fuentes\b[\s\S]*\]\s*=/iu
const FORBIDDEN_EMOJI = /🍏/u
const VOSEO_TOKENS = /\b(pod[eé]s|quer[eé]s|ten[eé]s|hac[eé]s|decime|mir[aá]|fijate|laburo)\b/iu
const MIN_SYNTHESIZED_ANSWER_CHARS = 80

const evaluateCase = ({ qaCase, response }) => {
  const issues = []
  const warnings = []
  const toolInvocations = Array.isArray(response.toolInvocations) ? response.toolInvocations : []
  const toolNames = toolInvocations.map(invocation => invocation.toolName)
  const knowledgeInvocation = toolInvocations.find(invocation => invocation.toolName === 'search_knowledge')
  const packet = knowledgeInvocation?.result?.raw?.packet
  const chunks = Array.isArray(packet?.chunks) ? packet.chunks : []
  const grounded = Boolean(packet && packet.confidence !== 'none' && chunks.length > 0)
  const content = typeof response.content === 'string' ? response.content : ''
  const hasCitationMarker = /\[\d+\]/u.test(content)

  // --- Calidad de respuesta (regresión "##" + síntesis + sin volcado Fuentes) ---
  if (RAW_MARKDOWN_HEADING.test(content)) {
    issues.push('answer contains raw Markdown heading (## regression — voice contract bans structural markers)')
  }

  if (APPENDED_FUENTES_DUMP.test(content)) {
    issues.push('answer appends a "Fuentes:" dump (the UI owns evidence; sources must not be dumped in text)')
  }

  if (grounded && content.trim().length < MIN_SYNTHESIZED_ANSWER_CHARS) {
    warnings.push(`grounded answer is very short (${content.trim().length} chars); review for synthesis vs chunk-copy`)
  }

  // --- Contrato de voz Efeonce ---
  if (FORBIDDEN_EMOJI.test(content)) {
    issues.push('answer uses forbidden 🍏 emoji (voice contract)')
  }

  if (VOSEO_TOKENS.test(content)) {
    warnings.push('answer shows possible voseo; voice contract requires neutral es-CL tuteo')
  }

  if (qaCase.expected.knowledge && !knowledgeInvocation) {
    issues.push('expected search_knowledge')
  }

  if (qaCase.expected.noKnowledge && knowledgeInvocation) {
    issues.push('expected operational tool, got search_knowledge')
  }

  if (qaCase.expected.groundedCitation && grounded && !hasCitationMarker) {
    issues.push('grounded Knowledge answer has no [n] marker or Fuentes block')
  }

  if (qaCase.expected.noAnswer && packet && packet.confidence !== 'none' && chunks.length > 0) {
    warnings.push(`no-answer case returned confidence=${packet.confidence} chunks=${chunks.length}; review for weak-source honesty`)
  }

  if (qaCase.expected.sensitiveValidation && grounded) {
    const mentionsHumanValidation = /validaci[oó]n humana|validar con una persona|revisi[oó]n humana|validar con (HR|People|Finanzas|Legal|Seguridad)/iu.test(content)

    if (!mentionsHumanValidation) {
      issues.push('sensitive answer missing human-validation wording')
    }
  }

  if (qaCase.expected.policyFiltering && packet?.deniedOrFilteredCount > 0 && !/pol[ií]tica|acceso|restringid|filtrad/iu.test(content)) {
    issues.push('filtered policy match is not disclosed')
  }

  return {
    id: qaCase.id,
    intent: qaCase.intent,
    prompt: qaCase.prompt,
    status: issues.length === 0 ? 'pass' : 'fail',
    toolNames,
    knowledge: {
      confidence: packet?.confidence ?? null,
      freshness: packet?.freshness ?? null,
      chunks: chunks.length,
      deniedOrFilteredCount: packet?.deniedOrFilteredCount ?? 0,
      citationVisible: hasCitationMarker
    },
    issues,
    warnings
  }
}

const main = async () => {
  const options = parseArgs()
  const selectedCases = options.caseIds ? QA_CASES.filter(item => options.caseIds.has(item.id)) : QA_CASES

  if (selectedCases.length === 0) {
    throw new Error('No QA cases selected')
  }

  const access = await resolveAccess(options.env)
  const cookie = await authenticate(access)
  const results = []

  for (const qaCase of selectedCases) {
    process.stderr.write(`TASK-1124 QA ${qaCase.id}: ${qaCase.intent}... `)

    try {
      const response = await askNexa({ access, cookie, prompt: qaCase.prompt })
      const result = evaluateCase({ qaCase, response })

      results.push(result)
      process.stderr.write(`${result.status}\n`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      results.push({
        id: qaCase.id,
        intent: qaCase.intent,
        prompt: qaCase.prompt,
        status: 'fail',
        toolNames: [],
        knowledge: null,
        issues: [message],
        warnings: []
      })
      process.stderr.write('fail\n')
    }
  }

  const summary = {
    task: 'TASK-1124',
    env: options.env,
    baseUrl: access.baseUrl,
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter(result => result.status === 'pass').length,
    failed: results.filter(result => result.status === 'fail').length,
    results
  }

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.table(
      results.map(result => ({
        id: result.id,
        status: result.status,
        tools: result.toolNames.join(', ') || '-',
        confidence: result.knowledge?.confidence ?? '-',
        chunks: result.knowledge?.chunks ?? '-',
        cited: result.knowledge?.citationVisible ? 'yes' : 'no',
        issues: result.issues.join('; ') || '-',
        warnings: result.warnings.join('; ') || '-'
      }))
    )
  }

  if (summary.failed > 0) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
