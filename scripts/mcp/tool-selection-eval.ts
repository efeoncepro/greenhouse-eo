/**
 * TASK-1784 — Runner del eval de selección de tools MCP del módulo SEO.
 *
 * ═══ Qué mide, y qué NO ═══
 *
 * Le presenta a un modelo el catálogo REAL de tools —introspectado del servidor MCP vivo, jamás
 * una copia— y una pregunta de operador, y le pide que elija UNA tool y el argumento `market`.
 * Reporta **dos precisiones por separado**:
 *
 *   - `toolAccuracy`    — eligió la tool esperada;
 *   - `marketAccuracy`  — eligió el mercado esperado, contando como FALLO elegir uno en silencio
 *                          cuando lo correcto era no elegir;
 *
 * más una tercera dimensión que no es precisión sino contención de daño:
 *
 *   - `spendDiscipline` — en los casos marcados `mustNotSpend`, no eligió una tool que gasta.
 *
 * 🔴 **Jamás se promedian.** Colapsarlas escondería la mitad cara: la precisión de tool puede ser
 * 100% mientras la de mercado es 60%, y el promedio diría 80%.
 *
 * ═══ Por qué NO es un gate de CI ═══
 *
 * Este runner llama a un modelo: cuesta dinero y no es determinista. Un gate de merge que dependa
 * de eso es un gate que a veces se pone rojo sin que nada haya cambiado, y la respuesta humana a
 * eso siempre es la misma —reintentar hasta que pase—, que es como se muere un gate.
 *
 * El gate determinista vive aparte, en `src/mcp/greenhouse/__tests__/tool-selection-eval.test.ts`,
 * y cierra el modo de falla que sí es determinista: **una tool SEO nueva sin caso en el fixture
 * rompe el build**. Este runner produce el NÚMERO que se reporta en el PR; aquel produce la
 * garantía de que el número sigue midiendo la superficie completa.
 *
 * ═══ Nunca un falso verde ═══
 *
 * Sin credenciales de Vertex, este runner FALLA con exit 1 y lo dice. No se salta, no reporta
 * "0 casos evaluados" como si fuera un pase: un eval que se salta en silencio es peor que no
 * tenerlo, porque afirma haber medido.
 *
 * Uso:
 *   pnpm mcp:selection-eval                    # los 55 casos
 *   pnpm mcp:selection-eval --limit 10         # muestra rápida
 *   pnpm mcp:selection-eval --json out.json    # persiste el detalle por caso
 *   pnpm mcp:selection-eval --model gemini-2.5-flash
 */
import { writeFileSync } from 'node:fs'

import { generateStructuredGemini } from '@/lib/ai/google-genai'
import { createGreenhouseMcpServer } from '@/mcp/greenhouse/server'
import { GREENHOUSE_MCP_TOOL_MANIFEST } from '@/mcp/greenhouse/tool-manifest'
import { TOOL_SELECTION_CASES, type ToolSelectionCase } from './tool-selection-fixture'

// ── Catálogo: derivado del servidor real, nunca transcrito ───────────────────

interface CatalogTool {
  name: string
  description: string
  inputKeys: string[]
  spendsProviderBudget: boolean
}

/**
 * Introspecta el registro vivo del SDK — la MISMA estructura que sirve `tools/list`, que es lo
 * que un cliente MCP realmente ve. Medir sobre una copia mediría la copia.
 */
export const buildToolCatalog = (): CatalogTool[] => {
  const server = createGreenhouseMcpServer(
    {
      apiBaseUrl: 'https://example.invalid',
      consumerToken: 'stub',
      externalScopeType: 'other',
      externalScopeId: 'stub',
      apiVersion: '2026-04-25',
      requestTimeoutMs: 1_000
    },
    { fetch: (async () => new Response('{}')) as unknown as typeof fetch }
  )

  const registered = (server as unknown as {
    _registeredTools: Record<
      string,
      { description?: string; inputSchema?: { shape?: Record<string, unknown> } }
    >
  })._registeredTools

  return GREENHOUSE_MCP_TOOL_MANIFEST.map(entry => ({
    name: entry.name,
    description: registered[entry.name]?.description ?? '',
    inputKeys: Object.keys(registered[entry.name]?.inputSchema?.shape ?? {}).sort(),
    spendsProviderBudget: entry.spendsProviderBudget
  }))
}

const renderCatalog = (catalog: readonly CatalogTool[]): string =>
  catalog
    .map(tool => `### ${tool.name}\nArguments: ${tool.inputKeys.join(', ') || '(none)'}\n${tool.description}`)
    .join('\n\n')

// ── El prompt: neutro a propósito ────────────────────────────────────────────

/**
 * 🔴 El system prompt NO enseña a elegir. Si dijera "prefiere la lente medida cuando pidan
 * números reales", el eval estaría midiendo el prompt del eval, no las descripciones — y el
 * baseline saldría alto por una razón que no se despliega a producción.
 *
 * Lo único que declara son las REGLAS DEL EJERCICIO: qué formato devolver y qué significa cada
 * valor de `market`. Eso no es una pista sobre cuál tool elegir.
 */
const SYSTEM_PROMPT = [
  'You are the tool-selection layer of an MCP client. Given the tool catalog and a question from',
  'an operator, choose EXACTLY ONE tool to call, and decide the value of the `market` argument.',
  '',
  'For `market`, answer with one of:',
  '  - a two-letter ISO country code (CL, MX, CO, PE, US) when the call should pin that market;',
  '  - "omit" when the call should NOT pass a market argument at all;',
  '  - "ask" when you would stop and ask the operator which market they mean before calling.',
  '',
  'Answer only with the JSON object requested. Do not explain outside the `reason` field.'
].join('\n')

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    tool: { type: 'string' },
    market: { type: 'string' },
    reason: { type: 'string' }
  },
  required: ['tool', 'market', 'reason']
} as const

interface ModelChoice {
  tool: string
  market: string
  reason: string
}

// ── Scoring ──────────────────────────────────────────────────────────────────

export type MarketVerdict = 'correct' | 'silent_choice' | 'wrong_market' | 'over_asked'

/**
 * Evalúa el `market` elegido contra la expectativa.
 *
 * 🔴 `silent_choice` es el veredicto que hace útil a este eval: la organización tiene varios
 * targets, la pregunta no declaró el mercado, y el modelo pasó uno igual. El runtime
 * (`resolveSeoTargetForMarket`) lo resolvería obedientemente y serviría un país que nadie pidió —
 * una respuesta perfectamente formada sobre el mercado equivocado, que es el modo de falla de
 * `ISSUE-152`. Cuenta como fallo AUNQUE el país acertado sea el que el operador tenía en mente:
 * acertar por casualidad y decidir bien no son lo mismo.
 */
export const scoreMarket = (testCase: Pick<ToolSelectionCase, 'expectedMarket' | 'targetMarket'>, answered: string): MarketVerdict => {
  const expected = testCase.expectedMarket
  const value = answered.trim().toLowerCase()
  const isAsk = value === 'ask'
  const isOmit = value === 'omit' || value === '' || value === 'none' || value === 'null'

  if (expected === 'must_ask') {
    // No pasar mercado y preguntar son la misma decisión correcta: ninguna de las dos elige.
    return isAsk || isOmit ? 'correct' : 'silent_choice'
  }

  if (expected === 'single_target') {
    // Un solo target activo: omitirlo es correcto (el runtime resuelve el único). Preguntar es
    // exceso de cautela — no daña, pero se cuenta aparte para no leerlo como acierto.
    if (isOmit) return 'correct'
    if (isAsk) return 'over_asked'

    // Pasarlo explícito también es correcto, pero sólo si es EL mercado del target: fijar otro
    // país sobre una organización de un solo mercado es el error caro con otra cara.
    return testCase.targetMarket !== undefined && value.toUpperCase() === testCase.targetMarket
      ? 'correct'
      : 'wrong_market'
  }

  if (isAsk || isOmit) return 'wrong_market'

  return value.toUpperCase() === expected ? 'correct' : 'wrong_market'
}

export interface CaseResult {
  id: string
  locale: string
  expectedTool: string
  answeredTool: string
  toolCorrect: boolean
  expectedMarket: string
  answeredMarket: string
  marketVerdict: MarketVerdict
  mustNotSpend: boolean
  spentWhenForbidden: boolean
  reason: string
}

export interface EvalReport {
  model: string
  cases: number
  toolAccuracy: number
  marketAccuracy: number
  spendDiscipline: number
  marketBreakdown: Record<MarketVerdict, number>
  byLocale: Record<string, { cases: number; toolCorrect: number; marketCorrect: number }>
  failures: CaseResult[]
  results: CaseResult[]
}

const pct = (part: number, total: number): number =>
  total === 0 ? 0 : Math.round((part / total) * 1000) / 10

export const summarise = (results: readonly CaseResult[], model: string): EvalReport => {
  const marketBreakdown: Record<MarketVerdict, number> = {
    correct: 0,
    silent_choice: 0,
    wrong_market: 0,
    over_asked: 0
  }

  const byLocale: EvalReport['byLocale'] = {}

  for (const result of results) {
    marketBreakdown[result.marketVerdict] += 1
    const bucket = (byLocale[result.locale] ??= { cases: 0, toolCorrect: 0, marketCorrect: 0 })

    bucket.cases += 1
    if (result.toolCorrect) bucket.toolCorrect += 1
    if (result.marketVerdict === 'correct') bucket.marketCorrect += 1
  }

  const spendCases = results.filter(result => result.mustNotSpend)

  return {
    model,
    cases: results.length,
    toolAccuracy: pct(results.filter(r => r.toolCorrect).length, results.length),
    marketAccuracy: pct(marketBreakdown.correct, results.length),
    spendDiscipline: pct(
      spendCases.filter(result => !result.spentWhenForbidden).length,
      spendCases.length
    ),
    marketBreakdown,
    byLocale,
    failures: results.filter(
      result => !result.toolCorrect || result.marketVerdict !== 'correct' || result.spentWhenForbidden
    ),
    results: [...results]
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

const arg = (flag: string): string | null => {
  const index = process.argv.indexOf(flag)

  return index === -1 ? null : (process.argv[index + 1] ?? null)
}

const main = async (): Promise<void> => {
  const catalog = buildToolCatalog()
  const spenders = new Set(catalog.filter(tool => tool.spendsProviderBudget).map(tool => tool.name))
  const model = arg('--model') ?? undefined
  const limitRaw = arg('--limit')
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : TOOL_SELECTION_CASES.length
  const cases = TOOL_SELECTION_CASES.slice(0, limit)
  const catalogText = renderCatalog(catalog)

  const missingDescriptions = catalog.filter(tool => tool.description.trim().length === 0)

  if (missingDescriptions.length > 0) {
    console.error(
      `mcp:selection-eval — ${missingDescriptions.length} tools sin description introspectada ` +
        `(${missingDescriptions.map(tool => tool.name).join(', ')}). El catálogo que se mediría no es el real.`
    )
    process.exit(1)
  }

  console.log(
    `mcp:selection-eval — ${cases.length} casos contra ${catalog.length} tools registradas ` +
      `(${spenders.size} comprometen gasto del proveedor).`
  )

  const results: CaseResult[] = []
  let resolvedModel = 'unknown'

  for (const [index, testCase] of cases.entries()) {
    const prompt = [
      '## Tool catalog',
      '',
      catalogText,
      '',
      '## Organization context',
      testCase.context,
      '',
      '## Operator question',
      testCase.question
    ].join('\n')

    let choice: ModelChoice

    try {
      const response = await generateStructuredGemini<ModelChoice>({
        model,
        system: SYSTEM_PROMPT,
        prompt,
        jsonSchema: RESPONSE_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0,
        maxOutputTokens: 512
      })

      resolvedModel = response.model
      choice = response.data
    } catch (error) {
      // 🔴 Nunca degradar a "caso saltado": un eval que se salta afirma haber medido.
      console.error(
        `mcp:selection-eval — el caso ${testCase.id} no pudo evaluarse: ` +
          `${error instanceof Error ? error.message : String(error)}`
      )
      process.exit(1)
    }

    const answeredTool = choice.tool.trim()
    const marketVerdict = scoreMarket(testCase, choice.market)

    const result: CaseResult = {
      id: testCase.id,
      locale: testCase.locale,
      expectedTool: testCase.expectedTool,
      answeredTool,
      toolCorrect: answeredTool === testCase.expectedTool,
      expectedMarket: testCase.expectedMarket,
      answeredMarket: choice.market.trim(),
      marketVerdict,
      mustNotSpend: testCase.mustNotSpend === true,
      spentWhenForbidden: testCase.mustNotSpend === true && spenders.has(answeredTool),
      reason: choice.reason
    }

    results.push(result)

    const mark = result.toolCorrect && marketVerdict === 'correct' ? '·' : '✗'

    console.log(
      `  ${mark} [${index + 1}/${cases.length}] ${testCase.id.padEnd(38)} ` +
        `tool=${answeredTool} market=${result.answeredMarket} (${marketVerdict})`
    )
  }

  const report = summarise(results, resolvedModel)

  console.log('')
  console.log('═══ Resultado ═══')
  console.log(`modelo:             ${report.model}`)
  console.log(`casos:              ${report.cases}`)
  console.log(`precisión de TOOL:    ${report.toolAccuracy}%`)
  console.log(`precisión de MERCADO: ${report.marketAccuracy}%   ← se reporta APARTE, nunca promediada`)
  console.log(`disciplina de gasto:  ${report.spendDiscipline}%`)
  console.log(
    `desglose de mercado: correctos=${report.marketBreakdown.correct} ` +
      `elección_silenciosa=${report.marketBreakdown.silent_choice} ` +
      `mercado_errado=${report.marketBreakdown.wrong_market} ` +
      `preguntó_de_más=${report.marketBreakdown.over_asked}`
  )
  console.log('')
  console.log('por variante:')

  for (const [locale, bucket] of Object.entries(report.byLocale).sort()) {
    console.log(
      `  ${locale}  tool ${bucket.toolCorrect}/${bucket.cases}   mercado ${bucket.marketCorrect}/${bucket.cases}`
    )
  }

  if (report.failures.length > 0) {
    console.log('')
    console.log(`fallos (${report.failures.length}):`)

    for (const failure of report.failures) {
      const parts = [
        !failure.toolCorrect ? `tool: esperada ${failure.expectedTool}, eligió ${failure.answeredTool}` : null,
        failure.marketVerdict !== 'correct'
          ? `mercado: esperado ${failure.expectedMarket}, respondió ${failure.answeredMarket} (${failure.marketVerdict})`
          : null,
        failure.spentWhenForbidden ? 'GASTÓ cuando no correspondía' : null
      ].filter(Boolean)

      console.log(`  ✗ ${failure.id} — ${parts.join(' · ')}`)
    }
  }

  const jsonPath = arg('--json')

  if (jsonPath) {
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`\ndetalle por caso escrito en ${jsonPath}`)
  }
}

// Sólo corre como CLI; importarlo para tests no dispara llamadas al modelo.
if (process.argv[1]?.includes('tool-selection-eval')) {
  void main()
}
