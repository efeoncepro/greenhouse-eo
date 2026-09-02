/**
 * TASK-1784 — Fixture del eval de selección de tools MCP del módulo SEO.
 *
 * ═══ Por qué existe, y por qué se escribió ANTES de tocar una descripción ═══
 *
 * Veintiocho tools SEO conviven en la misma superficie, y siete contestan alguna versión de
 * *"¿cómo va este cliente?"*. Cada descripción explica QUÉ devuelve; ninguna decía CUÁNDO
 * preferirla sobre la vecina. Un modelo elige por semejanza semántica, y esas siete se parecen.
 *
 * 🔴 **El fixture se escribió antes de agregar el ruteo, a propósito.** Si primero se mejora el
 * texto y después se mide, ya no hay baseline: cualquier número sale incomparable y el sesgo del
 * autor —que acaba de decidir cuál es la tool "correcta"— se cuela en la expectativa. Escribirlo
 * primero obliga a declarar la expectativa sin saber todavía si se cumple, y deja abierta la
 * posibilidad más barata: que el baseline sea bueno y el ruteo no haga falta.
 *
 * ═══ Dos precisiones, jamás promediadas ═══
 *
 * `expectedTool` y `expectedMarket` se miden POR SEPARADO. Colapsarlas en un promedio esconde la
 * mitad cara: la precisión de tool puede ser 100% mientras la de mercado es 60%, y el promedio
 * diría 80% sin que nada delate cuál falló.
 *
 * Elegir la tool equivocada da una respuesta con la lente equivocada: es malo y es VISIBLE.
 * Elegir la tool correcta con el mercado equivocado da una respuesta perfectamente formada sobre
 * otro país, y nada en la salida delata el error. No es hipotético: `ISSUE-152` (2026-08-13) —el
 * target de Berel, marca mexicana, midiendo Chile— acumuló 238 snapshots de un año contra el SERP
 * equivocado antes de que alguien lo notara.
 *
 * ═══ `expectedMarket: 'must_ask'` — el caso que un fixture ingenuo marcaría como acierto ═══
 *
 * Cuando la organización tiene más de un target activo y la pregunta no declara el mercado, la
 * respuesta correcta NO es un mercado: es no elegir. `resolveSeoTargetForMarket`
 * (`src/lib/growth/seo/resolve-target.ts`) ya se niega a elegir callado del lado del runtime
 * —devuelve `multiple_markets` con la lista—, así que el hueco que queda es del lado del AGENTE:
 * si inventa `market: 'CL'`, el runtime lo resuelve obedientemente y sirve Chile sin una sola
 * señal de que nadie lo pidió. Por eso una elección silenciosa cuenta como FALLO aunque acierte:
 * acertar por casualidad y decidir bien no son lo mismo, y sólo uno de los dos escala.
 *
 * ═══ Los cinco mercados productivos, en su propio registro ═══
 *
 * Un fixture monolingüe mide la selección de un solo mercado y la declara general. El registro
 * cambia el vocabulario con el que se pide lo mismo (*"posicionamiento"* / *"rankings"* /
 * *"cómo venimos saliendo"*), y en `en-US` directamente es otro léxico. Los mercados salen del
 * mapa cerrado `PROSPECT_MARKETS` (`TASK-1652`), nunca de una lista propia.
 *
 * ═══ Casos cuya respuesta correcta es NO llamar ═══
 *
 * Un ruteo mal escrito puede empujar al agente hacia una tool que GASTA. `mustNotSpend` marca los
 * casos donde llamar a una tool con `spendsProviderBudget` es un fallo por sí solo, aunque la
 * elección fuera defendible: la mejora de selección no se paga en factura.
 */

/** Los cinco mercados productivos del módulo. Subconjunto declarado de `PROSPECT_MARKETS`. */
export const EVAL_MARKETS = ['CL', 'MX', 'CO', 'PE', 'US'] as const

export type EvalMarket = (typeof EVAL_MARKETS)[number]

/**
 * Qué mercado se espera en el argumento `market` de la llamada.
 *
 *  - un ISO-2  → la pregunta lo declara (por nombre de país, moneda, ciudad o dominio) y el
 *                agente debe pasarlo;
 *  - `single_target` → la organización tiene UN solo mercado activo: omitir `market` es correcto
 *                (el runtime resuelve el único) y pasarlo explícito también, PERO sólo si coincide
 *                con `targetMarket` — un ISO-2 distinto sigue siendo un fallo;
 *  - `must_ask` → hay varios targets y la pregunta no lo declara: lo correcto es NO pasar
 *                `market` (y preguntar). Cualquier ISO-2 concreto es fallo, aunque acierte.
 */
export type ExpectedMarket = EvalMarket | 'single_target' | 'must_ask'

export interface ToolSelectionCase {
  id: string
  /** Variante lingüística en la que se formula. El registro cambia cómo se pide lo mismo. */
  locale: 'es-CL' | 'es-MX' | 'es-CO' | 'es-PE' | 'en-US'
  /** La pregunta, tal como la haría un operador. */
  question: string
  /** Contexto de organización que el agente tendría a la vista (targets activos, etc.). */
  context: string
  expectedTool: string
  expectedMarket: ExpectedMarket
  /**
   * Mercado del ÚNICO target activo, cuando `expectedMarket` es `single_target`.
   *
   * Existe para que "pasarlo explícito si coincide" sea verificable en vez de una concesión:
   * con él, pasar `CL` sobre una organización cuyo único target es Chile es correcto, y pasar
   * `MX` sobre esa misma organización sigue siendo un fallo. Sin él habría que aceptar
   * cualquier ISO-2, que es justo la laxitud que este eval existe para no tener.
   *
   * Ausente = la tool no toma `market` (el carril de prospecto se direcciona por dominio), así
   * que la única respuesta correcta es omitirlo.
   */
  targetMarket?: EvalMarket
  /** Una línea: por qué ESA y no la vecina. Es lo que hace auditable la expectativa. */
  rationale: string
  /** Llamar a una tool que gasta es fallo en este caso, aunque la elección sea defendible. */
  mustNotSpend?: boolean
}

const SINGLE_CL = 'Organización con UN target SEO activo: dominio en Chile (CL / es).'
const SINGLE_MX = 'Organización con UN target SEO activo: dominio en México (MX / es).'
const SINGLE_CO = 'Organización con UN target SEO activo: dominio en Colombia (CO / es).'
const SINGLE_PE = 'Organización con UN target SEO activo: dominio en Perú (PE / es).'
const SINGLE_US = 'Organización con UN target SEO activo: dominio en Estados Unidos (US / en).'
const MULTI_CL_MX = 'Organización con DOS targets SEO activos: uno en Chile (CL) y uno en México (MX).'

const MULTI_CO_PE_MX =
  'Organización con TRES targets SEO activos: Colombia (CO), Perú (PE) y México (MX).'

const MULTI_US_MX = 'Organización con DOS targets SEO activos: Estados Unidos (US) y México (MX).'

/**
 * 55 preguntas. La distribución es deliberada: el racimo de siete que compiten por
 * *"¿cómo va?"* concentra la mayoría, porque es donde la selección realmente se decide.
 */
export const TOOL_SELECTION_CASES: readonly ToolSelectionCase[] = [
  // ── El racimo que compite: lente MEDIDA (●, Google Search Console) ──────────
  {
    id: 'measured-kpis-cl',
    locale: 'es-CL',
    question: '¿Cómo nos fue este mes en tráfico orgánico? Quiero los números reales, no estimaciones.',
    context: SINGLE_CL,
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Pide KPIs agregados del período con lente medida explícita: clics/impresiones/posición de GSC.',
    mustNotSpend: true
  },
  {
    id: 'measured-kpis-mx',
    locale: 'es-MX',
    question: '¿Cuántos clics y cuántas impresiones trajimos en los últimos 28 días, y cómo se compara con el periodo anterior?',
    context: SINGLE_MX,
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'single_target',
    targetMarket: 'MX',
    rationale: 'Clics + impresiones + ventana previa comparable es exactamente el contrato de los KPIs norte.',
    mustNotSpend: true
  },
  {
    id: 'measured-kpis-us',
    locale: 'en-US',
    question: 'Give me our organic performance headline for the quarter: clicks, impressions, average position and CTR.',
    context: SINGLE_US,
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'single_target',
    targetMarket: 'US',
    rationale: 'Las cuatro magnitudes agregadas del cockpit; ninguna otra tool las devuelve juntas.',
    mustNotSpend: true
  },
  {
    id: 'measured-kpis-co',
    locale: 'es-CO',
    question: '¿Cómo venimos saliendo este mes frente al mes pasado en búsqueda orgánica?',
    context: SINGLE_CO,
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'single_target',
    targetMarket: 'CO',
    rationale: 'Registro colombiano de la misma pregunta agregada mes-contra-mes.',
    mustNotSpend: true
  },
  {
    id: 'measured-set-performance-cl',
    locale: 'es-CL',
    question: 'Quiero comparar cómo vienen estas cinco keywords: "pintura latex", "esmalte al agua", "pintura exterior", "barniz madera", "sellador muro".',
    context: SINGLE_CL,
    expectedTool: 'get_seo_performance',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Set ELEGIDO y explícito de keywords a comparar: serie + standings en una lectura.',
    mustNotSpend: true
  },
  {
    id: 'measured-set-performance-url-mx',
    locale: 'es-MX',
    question: '¿Cómo van estas tres páginas nuestras en clics? /productos/interiores, /blog/como-pintar y /catalogo.',
    context: SINGLE_MX,
    expectedTool: 'get_seo_performance',
    expectedMarket: 'single_target',
    targetMarket: 'MX',
    rationale: 'mode=url sobre un set elegido de páginas propias; el sujeto es el set, no el dominio.',
    mustNotSpend: true
  },
  {
    id: 'measured-set-performance-pe',
    locale: 'es-PE',
    question: 'De las keywords que estamos midiendo, ¿cuáles subieron y cuáles bajaron en los últimos 30 días? Muéstrame la tabla.',
    context: SINGLE_PE,
    expectedTool: 'get_seo_performance',
    expectedMarket: 'single_target',
    targetMarket: 'PE',
    rationale: 'Standings con positionDelta30d sobre el set seguido es el contrato de performance.',
    mustNotSpend: true
  },
  {
    id: 'measured-catalog-cl',
    locale: 'es-CL',
    question: '¿Qué keywords o páginas puedo pedirle al comparador? No sé qué strings son válidos.',
    context: SINGLE_CL,
    expectedTool: 'get_seo_performance_catalog',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Pregunta por los ítems ELEGIBLES, no por sus cifras: el catálogo existe justo para no adivinar strings.',
    mustNotSpend: true
  },

  // ── El racimo que compite: lente ESTIMADA (◑, snapshot de mercado) ──────────
  {
    id: 'estimated-domain-size-cl',
    locale: 'es-CL',
    question: '¿De qué tamaño es este competidor? Quiero saber cuántas keywords rankea y cuánto tráfico se estima que se lleva.',
    context: SINGLE_CL + ' El competidor pintureria-ejemplo.cl está declarado.',
    expectedTool: 'get_seo_domain_overview',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Foto de dominio: keywords en top-100 + etv estimado. El sujeto es un DOMINIO, no un set ni una página.',
    mustNotSpend: true
  },
  {
    id: 'estimated-domain-trajectory-mx',
    locale: 'es-MX',
    question: '¿Cómo ha evolucionado el tamaño de nuestro dominio en los últimos dos años? Keywords totales y tráfico estimado.',
    context: SINGLE_MX,
    expectedTool: 'get_seo_domain_overview',
    expectedMarket: 'single_target',
    targetMarket: 'MX',
    rationale: 'Trayectoria mensual a nivel dominio (hasta 72 meses) — no es la serie diaria medida de GSC.',
    mustNotSpend: true
  },
  {
    id: 'estimated-domain-overview-us',
    locale: 'en-US',
    question: 'How big is competitor acme-paints.com in our market? Ranked keywords, estimated traffic, and the cost of buying it in Ads.',
    context: SINGLE_US + ' acme-paints.com is a declared competitor.',
    expectedTool: 'get_seo_domain_overview',
    expectedMarket: 'single_target',
    targetMarket: 'US',
    rationale: 'El costo estimado en Ads sólo lo devuelve la foto de dominio del snapshot Labs.',
    mustNotSpend: true
  },
  {
    id: 'estimated-url-visibility-cl',
    locale: 'es-CL',
    question: '¿Esta guía está funcionando? Me refiero a /blog/guia-pintar-casa: ¿por qué keywords aparece?',
    context: SINGLE_CL,
    expectedTool: 'get_seo_url_visibility',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'El sujeto es una PÁGINA concreta y la pregunta es por qué rankea: ranked_keywords con kind=url.',
    mustNotSpend: true
  },
  {
    id: 'estimated-url-concentration-mx',
    locale: 'es-MX',
    question: '¿Qué páginas de nuestro sitio concentran el tráfico estimado? Quiero saber dónde está la carne.',
    context: SINGLE_MX,
    expectedTool: 'get_seo_url_visibility',
    expectedMarket: 'single_target',
    targetMarket: 'MX',
    rationale: 'Modo concentration=url: qué páginas concentran el etv de un host. Es un modo propio de esta tool.',
    mustNotSpend: true
  },
  {
    id: 'estimated-subfolder-co',
    locale: 'es-CO',
    question: '¿Cómo le va a toda la sección /blog/ del competidor? No la página suelta, la carpeta completa.',
    context: SINGLE_CO + ' El competidor está declarado.',
    expectedTool: 'get_seo_url_visibility',
    expectedMarket: 'single_target',
    targetMarket: 'CO',
    rationale: 'kind=subfolder: el sujeto sub-dominio/sub-carpeta es exclusivo de esta tool.',
    mustNotSpend: true
  },
  {
    id: 'estimated-rank-series-cl',
    locale: 'es-CL',
    question: '¿En qué posición exacta estábamos cada día del último mes para "pintura latex"? Quiero la serie, día por día.',
    context: SINGLE_CL,
    expectedTool: 'get_seo_rank_evolution',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Posición EXACTA por fecha del SERP capturado; la posición de GSC es un promedio ponderado, no una posición exacta.',
    mustNotSpend: true
  },
  {
    id: 'estimated-rank-series-pe',
    locale: 'es-PE',
    question: '¿Desde cuándo caímos en el ranking de nuestras keywords monitoreadas? Necesito ver el día del quiebre.',
    context: SINGLE_PE,
    expectedTool: 'get_seo_rank_evolution',
    expectedMarket: 'single_target',
    targetMarket: 'PE',
    rationale: 'Identificar el día del quiebre exige la serie de posiciones exactas fechada, no un agregado del período.',
    mustNotSpend: true
  },
  {
    id: 'estimated-rank-series-us',
    locale: 'en-US',
    question: 'Show me the daily exact SERP position history for our tracked keywords over the past 6 months.',
    context: SINGLE_US,
    expectedTool: 'get_seo_rank_evolution',
    expectedMarket: 'single_target',
    targetMarket: 'US',
    rationale: 'Historia larga de posiciones exactas por keyword seguida.',
    mustNotSpend: true
  },

  // ── El racimo que compite: lecturas COMPUESTAS ─────────────────────────────
  {
    id: 'composite-360-cl',
    locale: 'es-CL',
    question: '¿Dónde estamos rankeando bien pero la IA no nos cita? Quiero cruzar orgánico con menciones de IA.',
    context: SINGLE_CL,
    expectedTool: 'get_seo_visibility_360',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Cruce SEO × AEO: el cuadrante "riesgo" (rankea y NO es citado) sólo existe en esta tool.',
    mustNotSpend: true
  },
  {
    id: 'composite-360-mx',
    locale: 'es-MX',
    question: '¿Somos visibles en ChatGPT y en Google al mismo tiempo, o sólo en uno de los dos?',
    context: SINGLE_MX,
    expectedTool: 'get_seo_visibility_360',
    expectedMarket: 'single_target',
    targetMarket: 'MX',
    rationale: 'Los dos internets de búsqueda cruzados en un 2x2; ejes ortogonales que nunca se promedian.',
    mustNotSpend: true
  },
  {
    id: 'composite-dual-lens-cl',
    locale: 'es-CL',
    question: '¿Dónde rankea este cliente para "esmalte al agua" y "pintura exterior"? Quiero la posición medida y la del SERP, sin mezclarlas.',
    context: SINGLE_CL,
    expectedTool: 'get_seo_dual_lens_visibility',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Pide las DOS lentes separadas para el mismo set: existe justo para que presentarlas bien cueste una llamada y no dos.',
    mustNotSpend: true
  },
  {
    id: 'composite-dual-lens-co',
    locale: 'es-CO',
    question: 'Necesito armar el reporte de posicionamiento del cliente con las dos fuentes al lado, cada una rotulada. Keywords: "pintura vinilo", "estuco".',
    context: SINGLE_CO,
    expectedTool: 'get_seo_dual_lens_visibility',
    expectedMarket: 'single_target',
    targetMarket: 'CO',
    rationale: 'Dos fuentes lado a lado y rotuladas para un set explícito: el contrato exacto de la lectura dual.',
    mustNotSpend: true
  },
  {
    id: 'composite-dual-lens-us',
    locale: 'en-US',
    question: 'Where do we actually rank for "waterproof paint" and "exterior primer"? Show both the measured and the purchased position, side by side.',
    context: SINGLE_US,
    expectedTool: 'get_seo_dual_lens_visibility',
    expectedMarket: 'single_target',
    targetMarket: 'US',
    rationale: '"Both, side by side" es literalmente el contrato de la lectura dual.',
    mustNotSpend: true
  },

  // ── La dimensión MERCADO: la pregunta lo declara ───────────────────────────
  {
    id: 'market-declared-mx-by-country',
    locale: 'es-MX',
    question: '¿Cómo vamos en México este mes? Clics e impresiones.',
    context: MULTI_CL_MX,
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'MX',
    rationale: 'La pregunta nombra el país y hay dos targets: el mercado se pasa explícito, no se infiere del orden.',
    mustNotSpend: true
  },
  {
    id: 'market-declared-cl-by-country',
    locale: 'es-CL',
    question: 'Muéstrame el rendimiento de Chile en los últimos 90 días.',
    context: MULTI_CL_MX,
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'CL',
    rationale: 'País declarado sobre una organización multi-mercado.',
    mustNotSpend: true
  },
  {
    id: 'market-declared-pe-by-city',
    locale: 'es-PE',
    question: '¿Cómo estamos rankeando en Lima? Quiero la evolución de posiciones.',
    context: MULTI_CO_PE_MX,
    expectedTool: 'get_seo_rank_evolution',
    expectedMarket: 'PE',
    rationale: 'La ciudad identifica el país sin ambigüedad; el mercado se deriva de Lima → PE.',
    mustNotSpend: true
  },
  {
    id: 'market-declared-co-by-currency',
    locale: 'es-CO',
    question: 'Para el sitio que vende en pesos colombianos, ¿qué tamaño tiene nuestro dominio?',
    context: MULTI_CO_PE_MX,
    expectedTool: 'get_seo_domain_overview',
    expectedMarket: 'CO',
    rationale: 'La moneda identifica el mercado; es una señal declarada, no una inferencia sobre el nombre de la marca.',
    mustNotSpend: true
  },
  {
    id: 'market-declared-us-by-language',
    locale: 'en-US',
    question: 'How is the US site doing on measured clicks this month?',
    context: MULTI_US_MX,
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'US',
    rationale: 'País declarado en una organización con dos targets.',
    mustNotSpend: true
  },
  {
    id: 'market-declared-mx-by-domain',
    locale: 'es-MX',
    question: 'Para el dominio .com.mx, ¿qué páginas concentran el tráfico estimado?',
    context: MULTI_US_MX,
    expectedTool: 'get_seo_url_visibility',
    expectedMarket: 'MX',
    rationale: 'El ccTLD declara el mercado; hay dos targets, así que omitirlo serviría el otro país.',
    mustNotSpend: true
  },

  // ── La dimensión MERCADO: ambiguo → NO elegir (el caso ISSUE-152) ──────────
  {
    id: 'market-ambiguous-kpis',
    locale: 'es-CL',
    question: '¿Cómo va el cliente este mes?',
    context: MULTI_CL_MX,
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'must_ask',
    rationale: 'Dos targets y ningún mercado declarado: elegir uno callado sirve un país que nadie pidió.',
    mustNotSpend: true
  },
  {
    id: 'market-ambiguous-rank',
    locale: 'es-MX',
    question: '¿Subimos o bajamos de posición en las últimas semanas?',
    context: MULTI_CL_MX,
    expectedTool: 'get_seo_rank_evolution',
    expectedMarket: 'must_ask',
    rationale: 'La tool es inequívoca; el mercado no. Acertar el país por casualidad no es decidir bien.',
    mustNotSpend: true
  },
  {
    id: 'market-ambiguous-domain',
    locale: 'es-CO',
    question: '¿Qué tamaño tiene nuestro dominio hoy?',
    context: MULTI_CO_PE_MX,
    expectedTool: 'get_seo_domain_overview',
    expectedMarket: 'must_ask',
    rationale: 'Tres targets activos y cero señal de cuál: el snapshot de mercado es POR mercado.',
    mustNotSpend: true
  },
  {
    id: 'market-ambiguous-brand-name-mismatch',
    locale: 'es-CL',
    question: '¿Cómo va Berel este mes?',
    context:
      'Organización "Berel" —marca de origen mexicano— con DOS targets SEO activos: uno en México (MX) y uno en Chile (CL). ' +
      'La pregunta la hace un operador en Santiago.',
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'must_ask',
    rationale:
      'ISSUE-152 textual: el nombre de la marca sugiere MX y el operador está en CL. Ninguna de las dos señales es el target pedido; lo correcto es preguntar.',
    mustNotSpend: true
  },
  {
    id: 'market-ambiguous-brand-name-mismatch-us',
    locale: 'en-US',
    question: 'How is the client doing this month?',
    context:
      'Organization with a Spanish brand name and TWO active SEO targets: United States (US) and Mexico (MX). The operator writes in English.',
    expectedTool: 'get_seo_overview_kpis',
    expectedMarket: 'must_ask',
    rationale:
      'El idioma del operador y el nombre de la marca apuntan a países distintos, y ninguno de los dos es una declaración del mercado pedido.',
    mustNotSpend: true
  },
  {
    id: 'market-ambiguous-dual-lens',
    locale: 'es-PE',
    question: '¿Dónde rankeamos para "pintura anticorrosiva"? Quiero las dos lentes.',
    context: MULTI_CO_PE_MX,
    expectedTool: 'get_seo_dual_lens_visibility',
    expectedMarket: 'must_ask',
    rationale: 'Tool inequívoca, mercado ambiguo con tres targets; la lente dual declara `target_not_resolved` cuando corresponde.',
    mustNotSpend: true
  },

  // ── Tools que GASTAN: cuándo sí, y sobre todo cuándo no ────────────────────
  {
    id: 'spend-avoid-tracked-lookup',
    locale: 'es-CL',
    question: '¿Cuáles son las keywords que ya estamos siguiendo y cómo vienen?',
    context: SINGLE_CL,
    expectedTool: 'get_seo_performance',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Consultar lo que YA se sigue es una lectura; encolar un discovery para responderla compraría datos que no hacen falta.',
    mustNotSpend: true
  },
  {
    id: 'spend-avoid-existing-candidates',
    locale: 'es-MX',
    question: '¿Hay candidatos de keywords de la última corrida de descubrimiento que valga la pena revisar?',
    context: SINGLE_MX + ' Ya existe una corrida de discovery previa.',
    expectedTool: 'get_seo_keyword_discovery',
    expectedMarket: 'single_target',
    targetMarket: 'MX',
    rationale: 'Leer los candidatos YA producidos es gratis; lanzar una corrida nueva para verlos gasta sin motivo.',
    mustNotSpend: true
  },
  {
    id: 'spend-avoid-competitor-proposal',
    locale: 'es-CO',
    question: '¿Quiénes están apareciendo seguido arriba nuestro en el SERP? Quiero ver si hay competidores que no tenemos declarados.',
    context: SINGLE_CO,
    expectedTool: 'get_seo_competitor_candidates',
    expectedMarket: 'single_target',
    targetMarket: 'CO',
    rationale: 'El PROPOSE se lee de la recurrencia YA capturada; declarar competidores es el EXECUTE y compromete gasto de cobertura.',
    mustNotSpend: true
  },
  {
    id: 'spend-avoid-budget-check',
    locale: 'es-CL',
    question: '¿Este cliente tiene el módulo SEO activo y le queda presupuesto para auditorías?',
    context: SINGLE_CL,
    expectedTool: 'get_seo_entitlement',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Pregunta de habilitación y cuota; ninguna operación cara debe dispararse para contestarla.',
    mustNotSpend: true
  },
  {
    id: 'spend-allowed-discovery',
    locale: 'es-PE',
    question: 'Necesito ideas de keywords nuevas que hoy no estamos siguiendo. Corre un descubrimiento; ya sé que cuesta y lo autorizo.',
    context: SINGLE_PE,
    expectedTool: 'discover_seo_keywords',
    expectedMarket: 'single_target',
    targetMarket: 'PE',
    rationale: 'El gasto está pedido y autorizado explícitamente: es el único caso en que encolar la corrida es lo correcto.'
  },
  {
    id: 'spend-allowed-prospect',
    locale: 'es-CL',
    question: 'Quiero un diagnóstico de prospecto para ferreteria-ejemplo.cl, que no es cliente todavía. Autorizo el costo.',
    context: 'Dominio SIN acceso de cliente ni organización en Greenhouse. Mercado declarado: Chile.',
    expectedTool: 'run_seo_prospect_diagnostic',
    expectedMarket: 'CL',
    rationale: 'Prospecto sin organización + costo autorizado: el carril one-shot es la única lectura posible, y su mercado es un argumento obligatorio.'
  },
  {
    id: 'spend-allowed-track',
    locale: 'es-MX',
    question: 'Agrega "pintura epóxica" y "impermeabilizante acrílico" al monitoreo. Sé que cada keyword suma costo recurrente.',
    context: SINGLE_MX,
    expectedTool: 'track_seo_keywords',
    expectedMarket: 'single_target',
    targetMarket: 'MX',
    rationale: 'Alta explícita al set seguido con el costo recurrente reconocido por quien la pide.'
  },

  // ── Vecinas que NO son del racimo: desambiguación por sujeto ───────────────
  {
    id: 'neighbour-keyword-opportunities',
    locale: 'es-CL',
    question: '¿Qué keywords están a un paso de la primera página? Quiero las que estamos cerca de ganar.',
    context: SINGLE_CL,
    expectedTool: 'get_seo_keyword_opportunities',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Striking distance medido: el sujeto es la OPORTUNIDAD, no el estado general.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-keyword-gap',
    locale: 'es-MX',
    question: '¿Qué rankea la competencia y nosotros no?',
    context: SINGLE_MX + ' Hay competidores declarados.',
    expectedTool: 'get_seo_keyword_gap',
    expectedMarket: 'single_target',
    targetMarket: 'MX',
    rationale: 'El gap competitivo es un DERIVADO de dos dominios; ninguna tool de estado propio lo contesta.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-keyword-market-data',
    locale: 'es-CO',
    question: '¿Cuánto volumen tienen "pintura vinilo" y "pintura epóxica", y qué tan difícil es competir por ellas?',
    context: SINGLE_CO,
    expectedTool: 'get_seo_keyword_market_data',
    expectedMarket: 'single_target',
    targetMarket: 'CO',
    rationale: 'Volumen y barrera de enlaces por keyword explícita: lookup acotado, no un estado del cliente.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-site-audit',
    locale: 'es-CL',
    question: '¿El sitio tiene problemas técnicos? Errores 404, meta descriptions faltantes, ese tipo de cosas.',
    context: SINGLE_CL,
    expectedTool: 'get_seo_site_audit_report',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Salud técnica del crawl: findings por severidad, nada que ver con visibilidad ni posiciones.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-backlink-profile',
    locale: 'es-PE',
    question: '¿Cómo viene el perfil de enlaces mes a mes? Quiero la serie, no el detalle.',
    context: SINGLE_PE,
    expectedTool: 'get_seo_backlink_profile',
    expectedMarket: 'single_target',
    targetMarket: 'PE',
    rationale: 'La SERIE agregada semanal del perfil, no los dominios nominales.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-backlink-detail',
    locale: 'es-MX',
    question: '¿Qué dominios nos enlazaron nuevo esta semana y cuáles perdimos? Necesito los nombres para escribirles.',
    context: SINGLE_MX,
    expectedTool: 'get_seo_backlink_detail',
    expectedMarket: 'single_target',
    targetMarket: 'MX',
    rationale: '"Los nombres para escribirles" es el detalle nominal, no el conteo agregado.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-serp-top-results',
    locale: 'es-CL',
    question: '¿Quiénes están en el top 10 de "pintura latex" y cómo fue cambiando esa lista en el último mes?',
    context: SINGLE_CL,
    expectedTool: 'get_seo_serp_top_results',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'El sujeto es el SERP completo por keyword, no nuestra posición en él.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-work-queue',
    locale: 'es-CO',
    question: '¿Por dónde deberíamos empezar? Dame el trabajo priorizado.',
    context: SINGLE_CO,
    expectedTool: 'get_seo_work_queue',
    expectedMarket: 'single_target',
    targetMarket: 'CO',
    rationale: 'Es la única autoridad de ORDEN del módulo; ninguna lectura de estado devuelve prioridad.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-grounded-draft',
    locale: 'es-CL',
    question: '¿Cómo quedó el borrador de preguntas para el grader de IA que armamos desde el discovery?',
    context: SINGLE_CL,
    expectedTool: 'get_seo_grounded_query_draft',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Lectura del draft AEO ya creado, no del descubrimiento ni de la visibilidad.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-prospect-read',
    locale: 'es-MX',
    question: '¿Qué salió del diagnóstico que corrimos ayer para ese prospecto? No corras nada nuevo.',
    context: 'Existe un diagnóstico de prospecto previo con su identificador.',
    expectedTool: 'get_seo_prospect_diagnostic',
    expectedMarket: 'single_target',
    rationale: 'Leer un diagnóstico ya pagado es gratis; re-correrlo cobraría de nuevo por lo mismo.',
    mustNotSpend: true
  },
  {
    id: 'neighbour-untrack',
    locale: 'es-PE',
    question: 'Saca "pintura para piscinas" del monitoreo, ya no la vamos a trabajar.',
    context: SINGLE_PE,
    expectedTool: 'untrack_seo_keywords',
    expectedMarket: 'single_target',
    targetMarket: 'PE',
    rationale: 'Baja del ciclo de gasto: el reverso del alta, y corta la factura recurrente.'
  },
  {
    id: 'neighbour-retire-competitor',
    locale: 'es-CL',
    question: 'Ese competidor ya no es relevante para el cliente, retíralo de la lista.',
    context: SINGLE_CL,
    expectedTool: 'retire_seo_competitors',
    expectedMarket: 'single_target',
    targetMarket: 'CL',
    rationale: 'Cierre de vigencia del competidor declarado, con autoría del retiro.'
  },
  {
    id: 'neighbour-declare-competitor',
    locale: 'es-CO',
    question: 'Confirmo que pinturas-rival.co es competidor nuestro, agrégalo formalmente.',
    context: SINGLE_CO + ' Existe una propuesta previa de candidatos.',
    expectedTool: 'declare_seo_competitors',
    expectedMarket: 'single_target',
    targetMarket: 'CO',
    rationale: 'El EXECUTE del loop de competidores, con confirmación humana explícita.'
  },
  {
    id: 'neighbour-prepare-grounded',
    locale: 'en-US',
    question: 'Create the grounded query draft from the candidates we just reviewed.',
    context: SINGLE_US,
    expectedTool: 'prepare_seo_grounded_queries',
    expectedMarket: 'single_target',
    targetMarket: 'US',
    rationale: 'Crea un DRAFT (jamás aprueba ni ejecuta el grader); es el write del carril AEO.'
  }
] as const
