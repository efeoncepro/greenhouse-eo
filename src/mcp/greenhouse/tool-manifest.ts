/**
 * TASK-1780 — El inventario de tools MCP de Greenhouse: UNA fuente, muchos consumidores.
 *
 * ═══ Para qué existe ═══
 *
 * Hasta esta task había DOS listas de qué tools expone Greenhouse —los `registerTool` de
 * `server.ts` y la copia a mano del guard de paridad en el repo del gateway— y ninguna estaba
 * declarada dueña. El modo de falla no es teórico: el espejo se editó a mano dos veces en dos
 * semanas, y mientras tanto el servidor se anunciaba `greenhouse-read-only` registrando siete
 * tools que escriben.
 *
 * Este manifiesto es la fuente. Sus consumidores:
 *
 *   1. `server.ts` — registra RECORRIÉNDOLO. Una tool sin entrada acá no se puede registrar.
 *   2. `server.ts` — el `name` y las `instructions` se DERIVAN de él (TASK-1780 Slice 2), así que
 *      el cartel no puede volver a mentir sobre lo que el servidor hace.
 *   3. El guard de paridad del gateway (`efeonce-mcp`), vía el artefacto generado.
 *
 * ═══ Lo que este manifiesto NO es ═══
 *
 * 🔴 **No declara qué está federado.** Greenhouse declara qué EXISTE; el gateway decide qué CRUZA,
 * con revisión humana por tool (decisión de `TASK-1647`, intacta). Por eso acá no hay campo de
 * federación: si lo hubiera, el manifiesto se convertiría en autoridad sobre la frontera pública,
 * que es justo lo que la regla dura del ADR le prohíbe.
 *
 * ⚠️ **No es el conjunto federado.** El gateway federa resolviendo contra RUTAS HTTP del lane
 * ecosystem, no contra nombres del MCP interno, así que una capacidad puede estar federada sin
 * existir acá (caso verificado: `get_seo_provider_spend`). Ausencia en este manifiesto no es
 * evidencia de que la capacidad no exista — es evidencia de que no existe COMO TOOL INTERNA.
 * Ver `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` §4.
 *
 * ⚠️ **No lleva schema ni handler.** Esos viven en `server.ts`/`tools.ts` y duplicarlos acá
 * reintroduce exactamente el problema que esta task cierra. El artefacto que consume el gateway
 * obtiene las claves del inputSchema por INTROSPECCIÓN del server real, nunca copiándolas.
 */

/** Dominio dueño de la capacidad. No es routing: es a quién le pertenece el contrato. */
export type GreenhouseMcpToolDomain = 'platform' | 'webhooks' | 'knowledge' | 'commercial' | 'seo'

export interface GreenhouseMcpToolManifestEntry {
  /** Nombre exacto con el que la tool se registra. Es la clave de todo lo demás. */
  name: string
  domain: GreenhouseMcpToolDomain
  /**
   * La tool MUTA estado de Greenhouse (crea, cierra, encola, declara).
   *
   * 🔴 Ortogonal a `spendsProviderBudget` a propósito. Fusionarlas en un solo `readOnly` es el
   * error que esta task cierra: hoy toda tool que gasta también escribe, pero una futura podría
   * comprar datos sin mutar nada nuestro, y el cliente MCP necesita saberlo igual.
   */
  writes: boolean
  /**
   * Llamarla compromete gasto real con un proveedor externo — al instante o de forma RECURRENTE.
   * El gasto diferido cuenta: seguir una keyword factura en cada ciclo de captura hasta que
   * alguien la deja de seguir. NUNCA describir como lectura algo que compromete gasto.
   */
  spendsProviderBudget: boolean
  /** Una línea de propósito, legible por humanos. La descripción agent-facing vive en `server.ts`. */
  purpose: string
}

/**
 * El inventario. Orden = orden de registro en `server.ts`.
 *
 * Para agregar una tool: entrada acá + definición en `server.ts`. Falta cualquiera de las dos y el
 * servidor no construye — no hay forma de registrar una tool en silencio.
 */
export const GREENHOUSE_MCP_TOOL_MANIFEST: readonly GreenhouseMcpToolManifestEntry[] = [
  // ── Plataforma: contexto, organizaciones, capacidades y salud ──────────────
  {
    name: 'get_context',
    domain: 'platform',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Consumer y binding efectivos del scope externo configurado.'
  },
  {
    name: 'list_organizations',
    domain: 'platform',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Organizaciones accesibles desde el scope configurado.'
  },
  {
    name: 'get_organization',
    domain: 'platform',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Una organización por identificador canónico o ID público.'
  },
  {
    name: 'list_capabilities',
    domain: 'platform',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Asignaciones de capacidad de cliente visibles desde el scope.'
  },
  {
    name: 'get_integration_readiness',
    domain: 'platform',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Readiness operativa de una o más integraciones.'
  },
  {
    name: 'get_platform_health',
    domain: 'platform',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Snapshot de salud de plataforma con safe modes y degradación honesta.'
  },

  // ── Webhooks: catálogo de eventos, suscripciones y entregas ────────────────
  {
    name: 'list_event_types',
    domain: 'webhooks',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Tipos de evento del control plane de webhooks.'
  },
  {
    name: 'list_webhook_subscriptions',
    domain: 'webhooks',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Suscripciones del consumer y binding configurados.'
  },
  {
    name: 'get_webhook_subscription',
    domain: 'webhooks',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Detalle de una suscripción por ID.'
  },
  {
    name: 'list_webhook_deliveries',
    domain: 'webhooks',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Entregas de webhook del consumer y binding configurados.'
  },
  {
    name: 'get_webhook_delivery',
    domain: 'webhooks',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Detalle de una entrega por ID.'
  },

  // ── Knowledge: corpus gobernado, sólo lo publicado y agent-allowed ─────────
  {
    name: 'search_knowledge',
    domain: 'knowledge',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Busca el corpus gobernado y devuelve un paquete de citación con confianza declarada.'
  },
  {
    name: 'get_knowledge_document',
    domain: 'knowledge',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Un documento publicado y agent-allowed, con sus secciones y anclas de cita.'
  },

  // ── Comercial: catálogo de servicios y estimación referencial ──────────────
  {
    name: 'search_services',
    domain: 'commercial',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Servicios vendibles disponibles para cotizar en el scope.'
  },
  {
    name: 'quote_price',
    domain: 'commercial',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Estimación REFERENCIAL y no vinculante por SKU. No persiste nada.'
  },

  // ── SEO / Search Visibility 360. El orden es el de registro en server.ts ───
  {
    name: 'get_seo_keyword_opportunities',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Oportunidades striking-distance MEDIDAS por Search Console.'
  },
  {
    name: 'get_seo_keyword_market_data',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Dato de mercado ESTIMADO por keyword, de la captura mensual ya pagada.'
  },
  {
    name: 'get_seo_domain_overview',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Foto de dominio y trayectoria mensual, del snapshot de mercado persistido.'
  },
  {
    name: 'get_seo_url_visibility',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Qué ranquea una URL, subcarpeta, subdominio o dominio en el snapshot de mercado.'
  },
  {
    name: 'get_seo_backlink_detail',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Detalle nominal de dominios referentes detrás del agregado semanal.'
  },
  {
    name: 'get_seo_visibility_360',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Cruce de los dos internets de búsqueda: rank medido vs citabilidad IA.'
  },
  {
    name: 'get_seo_dual_lens_visibility',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Las dos series de posición SEPARADAS y etiquetadas: medida vs estimada.'
  },
  {
    name: 'get_seo_entitlement',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Estado del entitlement del módulo SEO para una organización.'
  },
  {
    name: 'get_seo_rank_evolution',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Serie temporal de posiciones exactas ya capturadas por el ciclo diario.'
  },
  {
    name: 'get_seo_performance',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Rendimiento en el tiempo de un conjunto elegido de keywords o URLs.'
  },
  {
    name: 'get_seo_performance_catalog',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Qué keywords o URLs se pueden comparar en el rendimiento.'
  },
  {
    name: 'get_seo_overview_kpis',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'KPIs norte del cockpit SEO, desde dato MEDIDO de Search Console.'
  },
  {
    name: 'get_seo_site_audit_report',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Reporte del audit técnico ya ejecutado: salud y hallazgos por severidad.'
  },
  {
    name: 'get_seo_backlink_profile',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Serie semanal del perfil de enlaces desde el snapshot persistido.'
  },

  // ── Las cuatro escrituras del set monitoreado y de competidores ────────────
  {
    name: 'track_seo_keywords',
    domain: 'seo',
    writes: true,
    spendsProviderBudget: true,
    purpose: 'Suma keywords al set monitoreado. Compromete gasto RECURRENTE hasta que se retiren.'
  },
  {
    name: 'untrack_seo_keywords',
    domain: 'seo',
    writes: true,
    spendsProviderBudget: false,
    purpose: 'Cierra la ventana de seguimiento y corta el gasto. No borra historia.'
  },
  {
    name: 'declare_seo_competitors',
    domain: 'seo',
    writes: true,
    spendsProviderBudget: true,
    purpose: 'Declara competidores con autoría humana. Compromete gasto RECURRENTE de cobertura.'
  },
  {
    name: 'retire_seo_competitors',
    domain: 'seo',
    writes: true,
    spendsProviderBudget: false,
    purpose: 'Retira competidores declarados y corta el gasto del próximo ciclo.'
  },

  // ── SEO: lecturas derivadas del dato ya capturado ──────────────────────────
  {
    name: 'get_seo_keyword_gap',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Gap competitivo derivado al leer. No tiene orden propio.'
  },
  {
    name: 'get_seo_work_queue',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'La cola priorizada: única autoridad de orden del módulo. Propone, no ejecuta.'
  },
  {
    name: 'get_seo_serp_top_results',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Top-N del SERP ya persistido por la captura diaria. Costo marginal cero.'
  },
  {
    name: 'get_seo_competitor_candidates',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'La mitad PROPOSE del loop de competidores: candidatos por recurrencia medida.'
  },
  {
    name: 'get_seo_keyword_discovery',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Corridas de discovery y sus candidatos. Un candidato no es una keyword seguida.'
  },

  // ── Discovery, borrador AEO y diagnóstico de prospecto ─────────────────────
  {
    name: 'discover_seo_keywords',
    domain: 'seo',
    writes: true,
    spendsProviderBudget: true,
    purpose: 'Encola una corrida de discovery. Gasta por llamada y por fila devuelta.'
  },
  {
    name: 'get_seo_grounded_query_draft',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Lee un BORRADOR de prompts AEO con su procedencia.'
  },
  {
    name: 'prepare_seo_grounded_queries',
    domain: 'seo',
    writes: true,
    spendsProviderBudget: false,
    purpose: 'Crea un BORRADOR de prompts AEO. Nunca aprueba, activa ni corre el grader.'
  },
  {
    name: 'get_seo_prospect_diagnostic',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'Lee diagnósticos de prospecto ya ejecutados.'
  },
  {
    name: 'run_seo_prospect_diagnostic',
    domain: 'seo',
    writes: true,
    spendsProviderBudget: true,
    purpose: 'Corre un diagnóstico one-shot de un dominio prospecto. Gasta dinero real por corrida.'
  }
] as const

/**
 * Los dos modos de que el inventario y el servidor se separen. Función PURA para que el test
 * pueda inyectar estados sintéticos: un guard cuyo poder de detección nunca se ejercita tampoco
 * prueba nada (misma doctrina que el guard de paridad del gateway, `TASK-1658`).
 */
export interface GreenhouseMcpToolCoverageFinding {
  code: 'defined_not_in_manifest' | 'in_manifest_not_defined'
  tool: string
  message: string
}

export const computeGreenhouseMcpToolCoverage = (input: {
  manifest: readonly GreenhouseMcpToolManifestEntry[]
  definedNames: readonly string[]
}): GreenhouseMcpToolCoverageFinding[] => {
  const declared = new Set(input.manifest.map(entry => entry.name))
  const defined = new Set(input.definedNames)

  const findings: GreenhouseMcpToolCoverageFinding[] = []

  for (const entry of input.manifest) {
    if (!defined.has(entry.name)) {
      findings.push({
        code: 'in_manifest_not_defined',
        tool: entry.name,
        message:
          `Greenhouse MCP: el manifiesto declara "${entry.name}" y server.ts no la define. ` +
          'Agrega su definición, o quita la entrada del manifiesto.'
      })
    }
  }

  for (const name of input.definedNames) {
    if (!declared.has(name)) {
      findings.push({
        code: 'defined_not_in_manifest',
        tool: name,
        message:
          `Greenhouse MCP: "${name}" se define en server.ts sin entrada en el manifiesto. ` +
          'El inventario es la fuente: una tool que no está declarada no se registra.'
      })
    }
  }

  return findings
}

/** Índice por nombre. El registro del servidor y el generador del artefacto lo consumen. */
export const GREENHOUSE_MCP_TOOL_MANIFEST_BY_NAME: ReadonlyMap<string, GreenhouseMcpToolManifestEntry> =
  new Map(GREENHOUSE_MCP_TOOL_MANIFEST.map(entry => [entry.name, entry]))

/**
 * Toda tool que ESCRIBE o COMPROMETE GASTO. Es la clase que gobierna el `readOnlyHint` de las
 * annotations y el gate de scope del gateway: gastar dinero es efecto secundario, nunca lectura.
 */
export const greenhouseMcpToolIsReadOnly = (entry: GreenhouseMcpToolManifestEntry): boolean =>
  !entry.writes && !entry.spendsProviderBudget
