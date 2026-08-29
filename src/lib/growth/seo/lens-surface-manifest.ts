/**
 * TASK-1785 — El censo de superficies del contrato agéntico y la lente de cada una.
 *
 * ═══ Para qué existe ═══
 *
 * El riesgo `high` de la matriz de la task era: *"se implementa el campo pero no el guard, y
 * el próximo reader nace sin lente"*. `tsc` cubre al reader que devuelve un DTO tipado; NO
 * cubre a la **superficie**: alguien puede agregar una ruta al lane ecosystem o registrar una
 * tool MCP nueva y nadie se entera de que su contrato no declara de qué naturaleza es lo que
 * devuelve. Este manifiesto es lo que un test recorre para exigir que cada superficie viva
 * esté censada — y por eso el censo se compara contra el FILESYSTEM y contra `server.ts`, no
 * contra una lista escrita a mano en un doc.
 *
 * ⚠️ Se mide en tiempo de CI, no cuando alguien escribe la spec. Es deliberado: el árbol es
 * un checkout compartido y una medición de hace cinco minutos puede estar vencida. Un guard
 * que se mide a sí mismo cuando corre no tiene esa ventana.
 *
 * ═══ Lo que el manifiesto NO es ═══
 *
 * No es la autoridad de la lente: esa es `resolveSeoLens`, y la lente viaja como dato en el
 * DTO. Acá sólo se declara qué superficies EXISTEN y cuáles emiten cifras, para que ninguna
 * pueda nacer en silencio.
 */

/** Una superficie emite cifras (y debe declarar lente) o es un comando/estado que no. */
export type SeoSurfaceKind =
  /** Devuelve cifras de mercado o de medición: su DTO lleva `provenance`. */
  | 'figures'
  /** Escribe o encola. No emite cifras propias; su outcome es un estado, no una magnitud. */
  | 'command'
  /** Devuelve estado/configuración (entitlement, catálogos, salud): no son mediciones. */
  | 'state'

/**
 * Para una superficie `figures`: si su DTO YA emite `provenance`, o por qué todavía no.
 *
 * 🔴 Existe porque el censo tenía un hueco que sólo se vio al medirlo: declaraba 18 superficies
 * como `figures` y el guard verificaba únicamente que estuvieran LISTADAS — no que las que emiten
 * cifras declararan su lente. Ocho quedaron censadas como `figures` sin `provenance`, y nada falló.
 * Era el defecto que esta task existe para impedir, cometido dentro de su propio mecanismo.
 *
 * `{ pending }` NO es una excepción cómoda: es una deuda con razón escrita que el test exige, igual
 * que `GREENHOUSE_SEO_TOOL_EXCLUSIONS` exige razón para no federar. Lo que el guard prohíbe es el
 * SILENCIO — una superficie que emite cifras y ni las declara ni explica por qué no.
 */
export type SeoSurfaceProvenanceState = 'emitted' | { readonly pending: string }

export interface SeoLensSurface {
  /** Segmento de la ruta bajo `api/platform/ecosystem/growth/seo/`. `null` = sin ruta propia. */
  route: string | null
  /** Nombre de la tool MCP. `null` = la ruta existe pero no está expuesta como tool. */
  tool: string | null
  kind: SeoSurfaceKind
  /** Por qué esta superficie es de esa clase. Obligatorio para `command`/`state`: sin razón
   *  escrita, "no emite cifras" es una afirmación que nadie revisó. */
  reason: string
  /** Sólo para `figures`: `'emitted'` o la deuda declarada con su razón. */
  provenance?: SeoSurfaceProvenanceState
}

export const SEO_LENS_SURFACES: readonly SeoLensSurface[] = [
  // ── Cifras: su DTO declara procedencia ────────────────────────────────────
  {
    route: 'keyword-opportunities',
    tool: 'get_seo_keyword_opportunities',
    kind: 'figures',
    provenance: 'emitted',
    reason: 'Striking distance medido (●) con enriquecimiento de mercado estimado (◑) en el mismo DTO.'
  },
  {
    route: 'keyword-market-data',
    tool: 'get_seo_keyword_market_data',
    kind: 'figures',
    provenance: 'emitted',
    reason: 'Hecho de mercado por keyword: ◑ entero.'
  },
  {
    route: 'domain-overview',
    tool: 'get_seo_domain_overview',
    kind: 'figures',
    provenance: 'emitted',
    reason: 'Foto de dominio del proveedor: ◑ entero.'
  },
  {
    route: 'url-visibility',
    tool: 'get_seo_url_visibility',
    kind: 'figures',
    provenance: 'emitted',
    reason: 'Visibilidad por sujeto-página del proveedor: ◑ entero.'
  },
  {
    route: 'backlink-profile',
    tool: 'get_seo_backlink_profile',
    kind: 'figures',
    provenance: 'emitted',
    reason: 'Serie del perfil de enlaces: ◑ entero.'
  },
  {
    route: 'backlink-detail',
    tool: 'get_seo_backlink_detail',
    kind: 'figures',
    provenance: { pending: 'TASK-1785 cubrió el perfil de enlaces pero no su detalle nominal; misma lente (◑ dataforseo_backlinks) y mismo mapeo trivial. Deuda de alcance, no de diseño.' },
    reason: 'Detalle nominal de enlaces: ◑ entero.'
  },
  {
    route: 'rank-evolution',
    tool: 'get_seo_rank_evolution',
    kind: 'figures',
    provenance: 'emitted',
    reason: 'Serie de posición del SERP comprado: ◑ (el `source` del DTO dice el store, no la lente).'
  },
  {
    route: 'performance',
    tool: 'get_seo_performance',
    kind: 'figures',
    provenance: 'emitted',
    reason: 'MIXTO por construcción: chart ● o ◑ según (modo × métrica), summary siempre ●.'
  },
  {
    route: 'overview-kpis',
    tool: 'get_seo_overview_kpis',
    kind: 'figures',
    provenance: 'emitted',
    reason: 'Agregado de Search Console: ● entero.'
  },
  {
    route: 'keyword-gap',
    tool: 'get_seo_keyword_gap',
    kind: 'figures',
    provenance: 'emitted',
    reason: 'Gap competitivo del proveedor: ◑; lo medido EXCLUYE en vez de promediarse.'
  },
  {
    route: 'serp-top-results',
    tool: 'get_seo_serp_top_results',
    kind: 'figures',
    provenance: { pending: 'Su reader vive en el lane, no en un reader de dominio con DTO tipado; agregar provenance exige mover la forma primero.' },
    reason:
      'Top-N del SERP comprado: ◑. Exacto NO es medido — ese query lo hicimos nosotros, y ' +
      'rotularlo `measured` lo volvería promediable con GSC.'
  },
  {
    route: 'competitor-candidates',
    tool: 'get_seo_competitor_candidates',
    kind: 'figures',
    provenance: { pending: 'Deriva de la serie del SERP comprado (◑ dataforseo_serp); pendiente de que su DTO pase por un reader tipado.' },
    reason: 'Recurrencia derivada de la serie del SERP comprado: ◑.'
  },
  {
    route: 'work-queue',
    tool: 'get_seo_work_queue',
    kind: 'figures',
    provenance: {
      pending:
        'Deuda de SECUENCIA, no de diseño. CONDICIÓN DE SALIDA EXPLÍCITA: se cierra cuando aterrice el fix ' +
        'del orden servido de la cola — el reader ordena por `priority_score DESC NULLS LAST` y en banda 2 ' +
        'ese campo es NULL para TODOS, así que colapsa a orden alfabético y contradice el `rank_in_snapshot` ' +
        '(medido en producción: 54 de 55 items de banda 2). Ese fix reescribe el ORDER BY y el DTO del ' +
        'reader, que son los dos archivos exactos que esta deuda necesita tocar; hacerlo antes es colisión ' +
        'garantizada. NO volver a redactar esta razón como un ESTADO ("está bajo edición activa"): esa forma ' +
        'ya caducó en silencio una vez y dejó la exención viva sin dueño. Las lentes ' +
        'YA están determinadas y quedan escritas acá para que quien la tome no las redescubra: el breakdown ' +
        'es append-only, `mainPageShare` es ● medida (sale de `seo_gsc_daily`) y `snippetCeilingClicks` es ' +
        '◑ estimada (deriva de la curva de CTR propia — insumos medidos, resultado estimado). Es el caso ' +
        '◑ junto a ● en la misma fila, así que su `provenance` nace en LISTA, nunca con una lente única.'
    },
    reason: 'Cola priorizada: techo estimado (◑) junto a impresiones medidas (●) en la MISMA fila.'
  },
  {
    route: 'keyword-discovery',
    tool: 'get_seo_keyword_discovery',
    kind: 'figures',
    provenance: { pending: 'Ya declara su lente con un vocabulario propio (measurementKind + measuredGsc separado); migrarlo al canónico es unificación, no ausencia.' },
    reason: 'Candidatos con volumen ◑ del proveedor y `measuredGsc` ● como lente SEPARADA.'
  },
  {
    route: 'prospect-diagnostic',
    tool: 'get_seo_prospect_diagnostic',
    kind: 'figures',
    provenance: { pending: 'Ya emite ProspectFact, que ES la forma canónica especializada; le falta el envoltorio provenance a nivel de resultado, no la lente por cifra.' },
    reason: 'Carril prospecto: ◑ entero por definición (no hay Search Console de un prospecto).'
  },
  {
    route: 'dual-lens-visibility',
    tool: 'get_seo_dual_lens_visibility',
    kind: 'figures',
    provenance: 'emitted',
    reason:
      'Las DOS lentes de posición del mismo set de keywords, separadas y rotuladas. Es la ' +
      'única superficie del módulo cuyo contrato declara explícitamente que sus dos series NO ' +
      'son comparables punto a punto, y por diseño no tiene campo combinado.'
  },
  {
    route: 'visibility-360',
    tool: 'get_seo_visibility_360',
    kind: 'figures',
    provenance: { pending: 'Su eje AEO no pertenece a este vocabulario (boundary §1.1) y su eje SEO ya viaja separado en seoLens; el envoltorio exige decidir antes cómo se declara un eje ajeno.' },
    reason:
      'Cruce SEO×AEO. El eje SEO es ●; el eje AEO NO pertenece a este vocabulario de lentes ' +
      '(es el score del grader, con su propio contrato) y por eso viaja en `aeoLens`, separado ' +
      'por el boundary §1.1 — dos ejes ortogonales, jamás promediados.'
  },
  {
    route: 'site-audit-report',
    tool: 'get_seo_site_audit_report',
    kind: 'figures',
    provenance: { pending: 'Hallazgos de crawl (◑ dataforseo_onpage); su DTO es de conteos por severidad y hay que decidir si un conteo de findings es una cifra de mercado o un estado.' },
    reason: 'Hallazgos del crawl propio contratado al proveedor: ◑.'
  },

  // ── Comandos: escriben o encolan; su outcome es un estado ─────────────────
  {
    route: 'keywords/track',
    tool: 'track_seo_keywords',
    kind: 'command',
    reason: 'Compromete gasto recurrente. Devuelve outcome por keyword, no magnitudes.'
  },
  {
    route: 'keywords/untrack',
    tool: 'untrack_seo_keywords',
    kind: 'command',
    reason: 'Cierra membresías. Devuelve outcome por keyword, no magnitudes.'
  },
  {
    route: 'competitors/declare',
    tool: 'declare_seo_competitors',
    kind: 'command',
    reason: 'Clasificación humana de un dominio observado. Outcome, no magnitud.'
  },
  {
    route: 'competitors/retire',
    tool: 'retire_seo_competitors',
    kind: 'command',
    reason: 'Cierra cobertura declarada. Outcome, no magnitud.'
  },
  {
    route: null,
    tool: 'discover_seo_keywords',
    kind: 'command',
    reason: 'Encola una corrida async y devuelve su runId. Los candidatos salen por su reader.'
  },
  {
    route: null,
    tool: 'run_seo_prospect_diagnostic',
    kind: 'command',
    reason: 'Dispara una corrida única. El diagnóstico sale por su reader.'
  },
  {
    route: null,
    tool: 'prepare_seo_grounded_queries',
    kind: 'command',
    reason: 'Crea un draft AEO. El draft sale por su reader.'
  },

  // ── Estado / configuración: no son mediciones ─────────────────────────────
  {
    route: 'entitlement',
    tool: 'get_seo_entitlement',
    kind: 'state',
    reason: 'Asignación de módulo, tier y allowance. Un cupo restante es una cuota, no una medición del mercado.'
  },
  {
    route: 'performance-catalog',
    tool: 'get_seo_performance_catalog',
    kind: 'state',
    reason:
      'Catálogo de ítems elegibles. Lleva impresiones como criterio de orden, y su propia ' +
      'descripción ya declara que `impressions: 0` en una keyword trackeada significa "sin ' +
      'impresiones registradas todavía", nunca una medición de cero.'
  },
  {
    route: 'provider-spend',
    // ⚠️ `null` medido, no asumido: NO hay `registerTool('get_seo_provider_spend')` en el MCP
    // interno. El gateway la federa resolviendo contra la RUTA HTTP del lane, no contra el
    // registry interno — por eso puede existir allá sin existir acá, y por eso el censo se
    // ancla en la ruta, que es lo único que las dos superficies comparten.
    tool: null,
    kind: 'state',
    reason:
      'Gasto de proveedor en USD: es lo que a Efeonce le CUESTA servir, no una cifra del ' +
      'mercado del cliente. Su honestidad la gobierna `cost_basis` (invoiced|estimated), que ' +
      'es un eje propio y NUNCA se colapsa en un total único.'
  },
  {
    route: 'grounded-queries',
    tool: 'get_seo_grounded_query_draft',
    kind: 'state',
    reason: 'Draft de preguntas AEO con su procedencia. Texto y refs, no magnitudes.'
  },
  {
    route: 'keyword-discovery/actions',
    tool: null,
    kind: 'command',
    reason:
      'Ledger de decisiones de discovery. Registra una decisión humana (dismissed|rejected); ' +
      'su outcome es un hecho con autor, no una magnitud.'
  }
]
