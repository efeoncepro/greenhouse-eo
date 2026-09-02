/**
 * TASK-1784 — El gate de regresión del eval de selección. DETERMINISTA a propósito.
 *
 * ═══ Por qué este gate no llama a un modelo ═══
 *
 * El runner que mide precisión (`pnpm mcp:selection-eval`) llama a un LLM: cuesta dinero y no es
 * estrictamente reproducible entre modelos ni versiones. Un gate de merge construido sobre eso se
 * pone rojo sin que nada haya cambiado, y la respuesta humana a un gate así siempre es la misma
 * —reintentar hasta que pase—, que es exactamente cómo un gate deja de gatear.
 *
 * 🔴 **Y la regla NO es "el eval debe dar 100%".** Un umbral se satisface editando expectativas
 * hasta poner el build en verde, que es la forma en que un eval deja de medir. Si un cambio
 * legítimo obliga a editar una expectativa para pasar, está mal el gate, no el cambio.
 *
 * Lo que este gate SÍ cierra es el modo de falla determinista que la task nombra: **una tool SEO
 * nueva sin caso en el fixture**. Sin él, la superficie crece y el fixture mide un catálogo cada
 * vez más viejo — reportando una precisión alta sobre una muestra que dejó de ser representativa,
 * que es peor que no medir porque afirma haber medido.
 *
 * El censo sale del MANIFIESTO (`TASK-1780`), nunca de un grep sobre `server.ts`: contar tools con
 * un patrón de prefijos de verbo se come `declare_seo_competitors`, y una clase de caracteres sin
 * dígitos se come `get_seo_visibility_360` — las dos fallan en silencio y dan un total corto
 * (`MCP_TOOL_SURFACE_INVARIANTS.md` §4).
 */
import { describe, expect, it } from 'vitest'

import { PROSPECT_MARKETS } from '@/lib/growth/seo/prospect/contracts'
import { scoreMarket } from '../../../../scripts/mcp/tool-selection-eval'
import { EVAL_MARKETS, TOOL_SELECTION_CASES } from '../../../../scripts/mcp/tool-selection-fixture'
import { createGreenhouseMcpServer } from '../server'
import { GREENHOUSE_MCP_TOOL_MANIFEST } from '../tool-manifest'

/**
 * Tools SEO deliberadamente SIN caso en el fixture, con su razón.
 *
 * El silencio no es válido: una tool ausente sin entrada acá es un fallo del gate. Una exención
 * declarada que ya no aplica también, porque una excepción muerta se lee como cobertura y no
 * cubre nada.
 */
const FIXTURE_EXEMPTIONS: ReadonlyArray<{ tool: string; reason: string }> = []

const registeredTools = (): Record<string, { description?: string }> => {
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

  return (server as unknown as { _registeredTools: Record<string, { description?: string }> })
    ._registeredTools
}

const seoTools = GREENHOUSE_MCP_TOOL_MANIFEST.filter(entry => entry.domain === 'seo')

/**
 * El racimo que compite por la misma intención: las siete que contestan alguna versión de
 * "¿cómo va este cliente?". Congelado a propósito — una tool nueva que conteste esa pregunta
 * entra acá en el mismo PR que la crea, o el ruteo del racimo queda incompleto en silencio.
 */
const COMPETING_CLUSTER = [
  'get_seo_visibility_360',
  'get_seo_overview_kpis',
  'get_seo_domain_overview',
  'get_seo_performance',
  'get_seo_rank_evolution',
  'get_seo_url_visibility',
  'get_seo_dual_lens_visibility'
] as const

describe('fixture del eval de selección — cobertura de la superficie (TASK-1784)', () => {
  it('toda tool SEO del manifiesto tiene caso en el fixture, o exención declarada con razón', () => {
    const covered = new Set(TOOL_SELECTION_CASES.map(testCase => testCase.expectedTool))
    const exempted = new Set(FIXTURE_EXEMPTIONS.map(entry => entry.tool))

    const uncovered = seoTools
      .map(entry => entry.name)
      .filter(name => !covered.has(name) && !exempted.has(name))

    expect(
      uncovered,
      `Tools SEO sin caso en scripts/mcp/tool-selection-fixture.ts: ${uncovered.join(', ')}. ` +
        'Agrega una pregunta de operador con su tool esperada, su mercado esperado y su ' +
        'justificación, o declara la exención con razón en FIXTURE_EXEMPTIONS. Sin esto el eval ' +
        'reporta una precisión alta sobre una muestra que dejó de cubrir la superficie.'
    ).toEqual([])
  })

  it('ninguna exención sobrevive a la cobertura que dice justificar', () => {
    const covered = new Set(TOOL_SELECTION_CASES.map(testCase => testCase.expectedTool))
    const stale = FIXTURE_EXEMPTIONS.filter(entry => covered.has(entry.tool)).map(entry => entry.tool)

    expect(stale, 'Exención declarada para una tool que YA tiene caso: retírala.').toEqual([])
  })

  it('toda exención declara una razón sustantiva y apunta a una tool que existe', () => {
    const known = new Set(seoTools.map(entry => entry.name))

    for (const entry of FIXTURE_EXEMPTIONS) {
      expect(known.has(entry.tool), `${entry.tool}: exención sobre una tool ausente del manifiesto.`).toBe(true)
      expect(entry.reason.trim().length, `${entry.tool}: exención sin razón sustantiva.`).toBeGreaterThanOrEqual(10)
    }
  })

  it('toda expectedTool del fixture existe en el manifiesto vivo', () => {
    const known = new Set(GREENHOUSE_MCP_TOOL_MANIFEST.map(entry => entry.name))

    const unknown = TOOL_SELECTION_CASES.filter(testCase => !known.has(testCase.expectedTool)).map(
      testCase => `${testCase.id} → ${testCase.expectedTool}`
    )

    expect(unknown, 'Casos que esperan una tool inexistente (typo o tool renombrada).').toEqual([])
  })
})

describe('fixture del eval de selección — integridad (TASK-1784)', () => {
  it('los ids son únicos', () => {
    const ids = TOOL_SELECTION_CASES.map(testCase => testCase.id)

    expect(ids).toEqual([...new Set(ids)])
  })

  it('el fixture tiene entre 40 y 60 casos, como declara la task', () => {
    expect(TOOL_SELECTION_CASES.length).toBeGreaterThanOrEqual(40)
    expect(TOOL_SELECTION_CASES.length).toBeLessThanOrEqual(60)
  })

  it('los cinco mercados productivos pertenecen al mapa cerrado de TASK-1652', () => {
    // El fixture NO inventa mercados: si uno deja de estar habilitado, este test lo dice antes
    // de que el eval mida un país que el carril ya no sirve.
    for (const market of EVAL_MARKETS) {
      expect(PROSPECT_MARKETS[market], `${market} no está en PROSPECT_MARKETS.`).toBeDefined()
    }
  })

  it('las cinco variantes lingüísticas están representadas', () => {
    // Un fixture monolingüe mide la selección de un solo mercado y la declara general.
    const locales = new Set(TOOL_SELECTION_CASES.map(testCase => testCase.locale))

    expect([...locales].sort()).toEqual(['en-US', 'es-CL', 'es-CO', 'es-MX', 'es-PE'])
  })

  it('todo caso declara una justificación sustantiva', () => {
    const thin = TOOL_SELECTION_CASES.filter(testCase => testCase.rationale.trim().length < 25).map(
      testCase => testCase.id
    )

    expect(thin, 'Casos sin justificación auditable: la expectativa no se puede revisar.').toEqual([])
  })

  it('todo caso single_target sobre una tool que acepta `market` declara su targetMarket', () => {
    // Sin `targetMarket` el scorer aceptaría CUALQUIER ISO-2 y la dimensión cara se volvería laxa:
    // pasar MX sobre una organización cuyo único target es Chile dejaría de ser un fallo.
    const registered = registeredTools()

    const acceptsMarket = new Set(
      Object.entries(
        registered as Record<string, { inputSchema?: { shape?: Record<string, unknown> } }>
      )
        .filter(([, tool]) => Object.keys(tool.inputSchema?.shape ?? {}).includes('market'))
        .map(([name]) => name)
    )

    const missing = TOOL_SELECTION_CASES.filter(
      testCase =>
        testCase.expectedMarket === 'single_target' &&
        acceptsMarket.has(testCase.expectedTool) &&
        testCase.targetMarket === undefined
    ).map(testCase => testCase.id)

    expect(missing, 'Casos single_target sin targetMarket sobre una tool que acepta market.').toEqual([])
  })

  it('el fixture conserva casos cuya respuesta correcta es NO llamar a una tool que gasta', () => {
    // Un ruteo mal escrito puede mejorar la selección y pagarse en factura. Si estos casos
    // desaparecen, la dimensión de gasto deja de medirse y nadie lo nota.
    expect(TOOL_SELECTION_CASES.filter(testCase => testCase.mustNotSpend === true).length).toBeGreaterThanOrEqual(20)
  })

  it('el fixture conserva casos de ambigüedad de mercado, incluido el de ISSUE-152', () => {
    const ambiguous = TOOL_SELECTION_CASES.filter(testCase => testCase.expectedMarket === 'must_ask')

    expect(ambiguous.length).toBeGreaterThanOrEqual(4)
    expect(
      ambiguous.some(testCase => /marca|brand/i.test(testCase.context)),
      'Falta el caso donde el nombre de la marca sugiere un país distinto al del operador — es ISSUE-152.'
    ).toBe(true)
  })
})

describe('ruteo en las descripciones del racimo que compite (TASK-1784)', () => {
  it('las siete que compiten declaran la regla de mercado donde se toma la decisión', () => {
    const registered = registeredTools()

    for (const tool of COMPETING_CLUSTER) {
      const description = registered[tool]?.description ?? ''

      expect(description, `${tool}: no está registrada.`).not.toEqual('')
      expect(
        description.includes('MARKET —'),
        `${tool}: sin la cláusula de mercado. La advertencia va donde se toma la decisión: sin ella ` +
          'la descripción vuelve a invitar a elegir un país en silencio (ISSUE-152).'
      ).toBe(true)
      expect(
        /ASK which one/i.test(description),
        `${tool}: la cláusula de mercado no dice que hay que PREGUNTAR ante ambigüedad.`
      ).toBe(true)
    }
  })

  it('la cláusula de mercado nombra las señales que NO son una declaración', () => {
    // El modelo justificó su elección callada con «the operator is in Santiago». Nombrar la CLASE
    // de señal proxy es lo que cerró la dimensión de mercado; si esa enumeración se pierde, el
    // fallo vuelve y el eval no corre en CI para avisarlo.
    const description = registeredTools()['get_seo_overview_kpis']?.description ?? ''

    for (const signal of ['operator is based', 'brand comes from', 'language they write in']) {
      expect(description.includes(signal), `La cláusula de mercado dejó de nombrar: ${signal}`).toBe(true)
    }
  })

  it('toda tool nombrada en un ruteo existe realmente en el manifiesto', () => {
    // Un ruteo que apunta a una tool inexistente manda al agente a una puerta que no está.
    const registered = registeredTools()
    const known = new Set(GREENHOUSE_MCP_TOOL_MANIFEST.map(entry => entry.name))
    const dangling: string[] = []

    for (const tool of COMPETING_CLUSTER) {
      const description = registered[tool]?.description ?? ''

      for (const match of description.matchAll(/\bget_seo_[a-z0-9_]+/g)) {
        if (!known.has(match[0])) dangling.push(`${tool} → ${match[0]}`)
      }
    }

    expect(dangling, 'Ruteos que apuntan a tools inexistentes.').toEqual([])
  })

  it('el racimo declarado sigue siendo un subconjunto real de las tools SEO', () => {
    const seoNames = new Set(seoTools.map(entry => entry.name))
    const orphans = COMPETING_CLUSTER.filter(tool => !seoNames.has(tool))

    expect(orphans, 'El racimo nombra tools que ya no existen o dejaron de ser SEO.').toEqual([])
  })
})

describe('poder de detección del scorer de mercado (TASK-1784)', () => {
  // Un guard cuyo poder de detección nunca se ejercita tampoco prueba nada
  // (`MCP_TOOL_SURFACE_INVARIANTS.md` §3).

  it('ante ambigüedad, preguntar y omitir son ambos correctos', () => {
    expect(scoreMarket({ expectedMarket: 'must_ask' }, 'ask')).toBe('correct')
    expect(scoreMarket({ expectedMarket: 'must_ask' }, 'omit')).toBe('correct')
  })

  it('🔴 elegir un mercado en silencio ante ambigüedad es FALLO aunque acierte el país', () => {
    // Es el corazón del eval: acertar por casualidad y decidir bien no son lo mismo.
    expect(scoreMarket({ expectedMarket: 'must_ask' }, 'CL')).toBe('silent_choice')
    expect(scoreMarket({ expectedMarket: 'must_ask' }, 'MX')).toBe('silent_choice')
  })

  it('con un solo target, omitir es correcto y pasar el mercado propio también', () => {
    expect(scoreMarket({ expectedMarket: 'single_target', targetMarket: 'CL' }, 'omit')).toBe('correct')
    expect(scoreMarket({ expectedMarket: 'single_target', targetMarket: 'CL' }, 'CL')).toBe('correct')
    expect(scoreMarket({ expectedMarket: 'single_target', targetMarket: 'US' }, 'us')).toBe('correct')
  })

  it('con un solo target, fijar OTRO país sigue siendo un fallo', () => {
    expect(scoreMarket({ expectedMarket: 'single_target', targetMarket: 'CL' }, 'MX')).toBe('wrong_market')
  })

  it('sin targetMarket declarado, la única respuesta correcta es omitir', () => {
    expect(scoreMarket({ expectedMarket: 'single_target' }, 'omit')).toBe('correct')
    expect(scoreMarket({ expectedMarket: 'single_target' }, 'CL')).toBe('wrong_market')
  })

  it('preguntar de más se cuenta aparte y NO se lee como acierto', () => {
    expect(scoreMarket({ expectedMarket: 'single_target', targetMarket: 'CL' }, 'ask')).toBe('over_asked')
  })

  it('con mercado declarado, omitir o preguntar es fallo', () => {
    expect(scoreMarket({ expectedMarket: 'MX' }, 'MX')).toBe('correct')
    expect(scoreMarket({ expectedMarket: 'MX' }, 'mx')).toBe('correct')
    expect(scoreMarket({ expectedMarket: 'MX' }, 'CL')).toBe('wrong_market')
    expect(scoreMarket({ expectedMarket: 'MX' }, 'omit')).toBe('wrong_market')
    expect(scoreMarket({ expectedMarket: 'MX' }, 'ask')).toBe('wrong_market')
  })
})
