/**
 * TASK-1670 — Hallazgos de SITIO del audit SEO (acceso de crawlers IA, borde, JSON-LD, sitemap).
 *
 * Por qué existe: el site audit (TASK-1304/1309) es un passthrough de DataForSEO OnPage, y
 * OnPage evalúa PÁGINAS. Hay tres cosas que no ve y que la doctrina 2026 pone en Capa 1 —
 * si un sitio bloquea a los crawlers de IA, no publica datos estructurados o no tiene índice
 * de descubrimiento, el reporte igual sale 95/100 y se presenta como sano. Ese falso sano es
 * el punto ciego que este archivo cierra.
 *
 * ── Frontera (§17.3 de la arquitectura del módulo SEO) ────────────────────────────────────
 * Se comparte cómo se OBTIENE la evidencia, NUNCA cómo se juzga. Este archivo consume el
 * sustrato (`@/lib/growth/site-substrate`: fetcher SSRF-guarded + parseo HTML/robots) y
 * escribe el JUICIO acá, dentro de `growth/seo`. No importa ni un símbolo de
 * `ai-visibility/probes/**` —la lint rule `greenhouse/growth-substrate-boundary` lo verifica
 * en CI— y usa vocabulario de sustrato (`SiteFetcher`), nunca `Probe`/`ProbeOutcome`: el
 * vocabulario del grader arrastra su contrato de ejecución episódico y su `score_version`, y
 * compartirlo haría que recalibrar SEO invalidara reportes AEO ya entregados a clientes.
 *
 * ── La distinción que hace que el reporte sea creíble ─────────────────────────────────────
 * Bloquear rastreo de RETRIEVAL (el que te cita en la respuesta) y bloquear rastreo de
 * ENTRENAMIENTO son cosas distintas. Lo segundo es una postura de derechos legítima y
 * frecuente; pintarla `critical` entrena al cliente a ignorar la severidad más alta del
 * informe. El evaluador del grader AEO mete los 10 bots en una bolsa con score proporcional,
 * y heredarlo tal cual haría que un sitio con retrieval COMPLETAMENTE abierto saliera
 * `critical` por no querer alimentar modelos. Por eso acá las familias son explícitas y
 * cada bot lleva su razón escrita.
 *
 * ── Un fetch que falla NUNCA es un sitio sano ─────────────────────────────────────────────
 * `unverified` es un estado de primera clase con razón adjunta. La alternativa —omitir el
 * hallazgo cuando no se pudo medir— se lee como ausencia de problema, que es la misma mentira
 * que esta task existe para cerrar, sólo que por otro camino.
 */

import 'server-only'

import {
  extractJsonLdBlocks,
  flattenJsonLdNodes,
  isPathAllowed,
  parseRobotsPolicy,
  type SiteFetchResult,
  type SiteFetcher
} from '@/lib/growth/site-substrate'
import { captureWithDomain } from '@/lib/observability/capture'

import type { SeoSiteAuditFindingSeverity } from '../contracts'

/**
 * Familia de rastreo. La severidad NO se decide por bot sino por familia, porque lo que
 * cambia el daño es para qué sirve el rastreo, no quién lo hace.
 */
export type AiCrawlerFamily = 'retrieval' | 'training' | 'other'

/**
 * Clasificación explícita, con la razón de cada bot. Open Question 4 de la task: un bot que no
 * cae limpio en una familia se clasifica a mano, y el default JAMÁS es `critical`.
 */
export const AI_CRAWLER_FAMILIES: Readonly<Record<string, { family: AiCrawlerFamily; reason: string }>> = {
  // ── Retrieval: sin ellos, el sitio no puede ser citado en la respuesta. ──
  'OAI-SearchBot': { family: 'retrieval', reason: 'Indexa para las respuestas con búsqueda de ChatGPT.' },
  PerplexityBot: { family: 'retrieval', reason: 'Indexa para las respuestas de Perplexity.' },
  ClaudeBot: { family: 'retrieval', reason: 'Rastrea contenido para las respuestas de Claude.' },
  'Claude-SearchBot': { family: 'retrieval', reason: 'Indexa para la búsqueda de Claude.' },
  /**
   * `ChatGPT-User` no aparece en la tabla del Delta 2026-08-15 de la task, pero SÍ en la
   * taxonomía declarada por TASK-1671 (su consumer UI). Se resuelve como retrieval y se deja
   * escrito por qué: es el agente que busca la página cuando una persona le pide a ChatGPT que
   * la abra. Bloquearlo no protege un corpus de entrenamiento — le niega el contenido a un
   * usuario que lo pidió explícitamente. El daño es de retrieval.
   */
  'ChatGPT-User': { family: 'retrieval', reason: 'Busca la página cuando un usuario se la pide a ChatGPT.' },

  // ── Training: bloquearlos es una decisión de derechos, no un defecto técnico. ──
  GPTBot: { family: 'training', reason: 'Recolecta contenido para entrenar los modelos de OpenAI.' },
  'Google-Extended': { family: 'training', reason: 'Controla el uso del contenido en el entrenamiento de Gemini.' },
  CCBot: { family: 'training', reason: 'Common Crawl: corpus público usado para entrenar modelos.' },
  'anthropic-ai': { family: 'training', reason: 'Token histórico de recolección de Anthropic.' },
  'Applebot-Extended': { family: 'training', reason: 'Opt-out de entrenamiento de Apple Intelligence.' },

  /**
   * `other`: familia ambigua a propósito. Se miden y su bloqueo queda como EVIDENCIA en el
   * detalle del hallazgo, pero nunca fabrican un hallazgo propio — bloquearlos es práctica
   * común y deliberada en la cartera, y emitirlos como issue sería ruido que erosiona la
   * lista priorizada.
   */
  Bytespider: { family: 'other', reason: 'Rastreador de ByteDance de uso mixto; su bloqueo es práctica común.' },
  Amazonbot: { family: 'other', reason: 'Rastreador de Amazon con usos mixtos, no claramente de respuesta.' }
} as const

const crawlersOfFamily = (family: AiCrawlerFamily): string[] =>
  Object.entries(AI_CRAWLER_FAMILIES)
    .filter(([, meta]) => meta.family === family)
    .map(([bot]) => bot)

/** `issue_type` de los hallazgos de SITIO. Ids de máquina propios — no son checks del proveedor. */
export const SITE_FINDING_SEVERITY: Readonly<Record<string, SeoSiteAuditFindingSeverity>> = {
  /** robots.txt niega el rastreo que te cita en la respuesta. */
  ai_retrieval_crawlers_blocked: 'critical',
  /** robots.txt niega el rastreo de entrenamiento. Postura legítima: NUNCA `critical`. */
  ai_training_crawlers_blocked: 'notice',
  /** El borde/WAF niega el acceso pese a un robots.txt que lo permite. Remediación distinta. */
  ai_crawler_edge_access_denied: 'critical',
  /** La home no publica JSON-LD: los motores no entienden quién es la marca. */
  structured_data_missing: 'warning',
  /** Sin índice de descubrimiento en /sitemap.xml y sin uno declarado en robots.txt. */
  sitemap_missing: 'notice',
  /** El sitemap que el propio robots.txt declara no responde o no es parseable. */
  sitemap_declared_broken: 'warning',
  /** No se pudo medir. Ni sano ni roto: un hueco declarado con su razón. */
  site_check_unverified: 'notice'
} as const

/** Chequeos de sitio, para nombrar cuál quedó sin verificar. */
export type SiteCheckKind = 'ai_crawler_access' | 'edge_access' | 'structured_data' | 'sitemap'

export interface SiteAuditFinding {
  issueType: string
  severity: SeoSiteAuditFindingSeverity
  detail: Record<string, unknown>
}

/**
 * Presupuesto de tiempo. El collect materializa dentro de una transacción que sostiene el
 * lock del run (es su mecanismo de exactly-once), así que un sitio lento no puede convertirse
 * en un lock largo. Cruzar el deadline degrada a `unverified`, jamás a "sano".
 */
export const SITE_FINDINGS_DEADLINE_MS = 15_000

const FETCH_TIMEOUT_MS = 6_000

/**
 * Variante de NUESTRO propio token para el chequeo de borde. NUNCA el de un bot de terceros:
 * suplantar a `GPTBot`/`OAI-SearchBot` es evasión verificable (los WAF la validan por DNS
 * inverso) y el costo reputacional lo paga el dominio que audita. Coherente con la postura
 * declarada en el contrato del sustrato.
 */
const EDGE_CHECK_USER_AGENT =
  'GreenhouseAEOGrader-EdgeCheck/1.0 (+https://greenhouse.efeoncepro.com; read-only edge access check)'

/** Product token propio, para preguntarle al robots.txt si a NOSOTROS nos deja pasar. */
const OWN_USER_AGENT_TOKEN = 'GreenhouseAEOGrader'

const unverified = (check: SiteCheckKind, reason: string, detail: Record<string, unknown> = {}): SiteAuditFinding => ({
  issueType: 'site_check_unverified',
  severity: SITE_FINDING_SEVERITY.site_check_unverified,
  detail: { check, reason, ...detail }
})

/** ¿El bot está bloqueado de la raíz? Grupo específico gana sobre `*`; Allow root gana sobre Disallow. */
const isBotBlockedFromRoot = (groups: ReturnType<typeof parseRobotsPolicy>, bot: string): boolean => {
  const botLower = bot.toLowerCase()

  // Match EXACTO del token del bot. A diferencia de `isPathAllowed` —que hace match por prefijo
  // porque persigue variantes de NUESTRO propio token— acá se mide a un tercero, y un prefijo
  // haría que `User-agent: C` capturara a `ClaudeBot`.
  const specific = groups.find(group => group.agents.includes(botLower))
  const wildcard = groups.find(group => group.agents.includes('*'))
  const group = specific ?? wildcard

  if (!group) return false

  if (group.rules.some(rule => rule.type === 'allow' && (rule.path === '/' || rule.path === ''))) {
    return false
  }

  return group.rules.some(rule => rule.type === 'disallow' && rule.path === '/')
}

/** Directivas `Sitemap:` declaradas en robots.txt (son globales, no pertenecen a un grupo). */
export const extractDeclaredSitemaps = (robotsText: string): string[] => {
  const declared: string[] = []

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    const match = /^sitemap\s*:\s*(\S+)$/i.exec(line)

    if (match?.[1]) declared.push(match[1])
  }

  return [...new Set(declared)]
}

const looksLikeSitemap = (body: string): boolean => /<sitemapindex\b/i.test(body) || /<urlset\b/i.test(body)

/**
 * Acceso de crawlers de IA en `robots.txt`, por familia.
 *
 * Emite hasta dos hallazgos independientes: si un sitio bloquea retrieval Y training salen los
 * dos, y el `critical` carga el peso. Colapsarlos en uno obligaría a elegir una severidad y
 * volvería a mezclar dos hechos que se remedian distinto.
 */
export const evaluateAiCrawlerAccess = (robots: SiteFetchResult): SiteAuditFinding[] => {
  // 404 explícito: sin robots.txt no hay restricción. Es una ausencia MEDIDA, señal buena.
  if (robots.status === 404) return []

  if (!robots.ok) {
    return [
      unverified('ai_crawler_access', 'No se pudo leer robots.txt.', {
        httpStatus: robots.status,
        errorCode: robots.errorCode
      })
    ]
  }

  const groups = parseRobotsPolicy(robots.body)

  const blockedByFamily: Record<AiCrawlerFamily, string[]> = { retrieval: [], training: [], other: [] }

  for (const [bot, meta] of Object.entries(AI_CRAWLER_FAMILIES)) {
    if (isBotBlockedFromRoot(groups, bot)) blockedByFamily[meta.family].push(bot)
  }

  const findings: SiteAuditFinding[] = []

  if (blockedByFamily.retrieval.length > 0) {
    findings.push({
      issueType: 'ai_retrieval_crawlers_blocked',
      severity: SITE_FINDING_SEVERITY.ai_retrieval_crawlers_blocked,
      detail: {
        blocked: blockedByFamily.retrieval,
        evaluated: crawlersOfFamily('retrieval'),
        reasons: blockedByFamily.retrieval.map(bot => AI_CRAWLER_FAMILIES[bot]?.reason).filter(Boolean),
        // Evidencia, no hallazgo: la familia ambigua viaja adjunta y nunca emite issue propio.
        otherBlocked: blockedByFamily.other,
        source: 'robots_txt'
      }
    })
  }

  if (blockedByFamily.training.length > 0) {
    findings.push({
      issueType: 'ai_training_crawlers_blocked',
      severity: SITE_FINDING_SEVERITY.ai_training_crawlers_blocked,
      detail: {
        blocked: blockedByFamily.training,
        evaluated: crawlersOfFamily('training'),
        reasons: blockedByFamily.training.map(bot => AI_CRAWLER_FAMILIES[bot]?.reason).filter(Boolean),
        retrievalOpen: blockedByFamily.retrieval.length === 0,
        otherBlocked: blockedByFamily.other,
        source: 'robots_txt'
      }
    })
  }

  return findings
}

/**
 * Acceso real en el borde (CDN/WAF), que es la forma MÁS COMÚN del bloqueo: en una muestra de
 * 12 dominios LatAm/CL (2026-08-15), 2 de los 3 casos con problema tenían el `robots.txt`
 * impecable y devolvían 403 al user-agent de un crawler. Un audit que sólo parsea robots.txt
 * les dice "acceso correcto".
 *
 * Cómo se mide sin suplantar a nadie: nuestro propio crawler está identificado como tal, así
 * que si el borde le niega la home mientras el robots.txt lo permite, el borde está filtrando
 * rastreadores. Se agrega un segundo GET con una variante de nuestro token para registrar si la
 * discriminación es por user-agent.
 *
 * Límite declarado: esto prueba que el borde bloquea rastreadores identificados, NO cuál bot de
 * terceros está bloqueado. Responder eso con certeza exige leer las reglas del WAF con el
 * cliente. La remediación, en cambio, es la misma (allowlist en CDN/WAF), y por eso el hallazgo
 * lleva `issue_type` propio y jamás se disfraza de hallazgo de robots.txt.
 */
export const evaluateEdgeAccess = (
  home: SiteFetchResult,
  variant: SiteFetchResult,
  robotsAllowsOurCrawler: boolean
): SiteAuditFinding[] => {
  // El robots.txt nos prohíbe la raíz: el hallazgo es de robots, no del borde. No se duplica.
  if (!robotsAllowsOurCrawler || home.errorCode === 'blocked_robots') return []

  const denied = (result: SiteFetchResult): boolean => result.status === 403 || result.status === 429

  if (denied(home) || denied(variant)) {
    return [
      {
        issueType: 'ai_crawler_edge_access_denied',
        severity: SITE_FINDING_SEVERITY.ai_crawler_edge_access_denied,
        detail: {
          identifiedCrawlerStatus: home.status,
          variantStatus: variant.status,
          // `true` = el borde responde distinto a dos tokens nuestros ⇒ discrimina por user-agent.
          differsByUserAgent: home.status !== variant.status,
          robotsAllowsCrawlers: true,
          source: 'edge'
        }
      }
    ]
  }

  // Ninguna de las dos llegó a una respuesta HTTP utilizable: no se midió.
  if (home.status === 0 && variant.status === 0) {
    return [
      unverified('edge_access', 'No hubo respuesta del sitio para verificar el acceso en el borde.', {
        errorCode: home.errorCode ?? variant.errorCode
      })
    ]
  }

  return []
}

/**
 * Ausencia de datos estructurados en la home.
 *
 * El allowlist de `findings-map.ts` sólo detecta ERRORES en marcado existente
 * (`has_micromarkup_errors`) y no su ausencia — a propósito, porque la regla del módulo prohíbe
 * invertir los checks positivos del proveedor. Este chequeo la cubre desde el otro lado.
 *
 * Asimetría heredada de TASK-1778: encontrar JSON-LD en un cuerpo parcial ES prueba de que
 * existe; NO encontrarlo en un cuerpo truncado o en un shell de render JS no prueba nada.
 * "No miré todo" nunca puede reportarse como "no está".
 */
export const evaluateStructuredData = (home: SiteFetchResult): SiteAuditFinding[] => {
  if (!home.ok) {
    return [
      unverified('structured_data', 'No se pudo leer el HTML de la home.', {
        httpStatus: home.status,
        errorCode: home.errorCode
      })
    ]
  }

  const nodes = flattenJsonLdNodes(extractJsonLdBlocks(home.body))

  if (nodes.length > 0) return []

  if (home.truncated === true || home.observable === false) {
    return [
      unverified(
        'structured_data',
        home.truncated === true
          ? 'El HTML se cortó en el tope de lectura: no se puede afirmar que falten datos estructurados sin ver el documento completo.'
          : 'La home se sirve como cascarón de render por JavaScript: no se puede afirmar que falten datos estructurados.',
        { truncated: home.truncated === true, observable: home.observable !== false }
      )
    ]
  }

  return [
    {
      issueType: 'structured_data_missing',
      severity: SITE_FINDING_SEVERITY.structured_data_missing,
      detail: { httpStatus: home.status, jsonLdBlocks: 0, source: 'home_html' }
    }
  ]
}

/**
 * Salud del sitemap.
 *
 * La directiva `Sitemap:` del robots.txt manda sobre `/sitemap.xml`: en la misma muestra de 12
 * dominios, 3 devuelven 404 en la ruta convencional y declaran su índice en robots — están
 * BIEN, y un `warning` sobre ellos sería ruido. De ahí el corte: ausencia es `notice`;
 * `warning` se reserva para el sitemap que el propio sitio declara y que está roto, que sí es
 * un defecto verificable.
 */
export const evaluateSitemap = (
  conventional: SiteFetchResult | null,
  declared: { url: string; result: SiteFetchResult } | null
): SiteAuditFinding[] => {
  if (declared) {
    if (!declared.result.ok) {
      return [
        {
          issueType: 'sitemap_declared_broken',
          severity: SITE_FINDING_SEVERITY.sitemap_declared_broken,
          detail: {
            declaredUrl: declared.url,
            httpStatus: declared.result.status,
            errorCode: declared.result.errorCode,
            reason: 'unreachable',
            source: 'robots_txt_directive'
          }
        }
      ]
    }

    if (!looksLikeSitemap(declared.result.body)) {
      return [
        {
          issueType: 'sitemap_declared_broken',
          severity: SITE_FINDING_SEVERITY.sitemap_declared_broken,
          detail: {
            declaredUrl: declared.url,
            httpStatus: declared.result.status,
            reason: 'not_parseable',
            source: 'robots_txt_directive'
          }
        }
      ]
    }

    return []
  }

  if (!conventional) {
    return [unverified('sitemap', 'No se pudo verificar el sitemap.')]
  }

  if (conventional.status === 404) {
    return [
      {
        issueType: 'sitemap_missing',
        severity: SITE_FINDING_SEVERITY.sitemap_missing,
        detail: { checkedPath: '/sitemap.xml', httpStatus: 404, declaredInRobots: false, reason: 'absent' }
      }
    ]
  }

  if (!conventional.ok) {
    return [
      unverified('sitemap', 'No hubo respuesta utilizable en /sitemap.xml.', {
        httpStatus: conventional.status,
        errorCode: conventional.errorCode
      })
    ]
  }

  if (!looksLikeSitemap(conventional.body)) {
    return [
      {
        issueType: 'sitemap_missing',
        severity: SITE_FINDING_SEVERITY.sitemap_missing,
        detail: {
          checkedPath: '/sitemap.xml',
          httpStatus: conventional.status,
          declaredInRobots: false,
          // Responde, pero lo que entrega no es un sitemap: para el descubrimiento equivale a
          // no tenerlo, y por eso comparte severidad. El matiz vive en el detalle, no en un
          // `issue_type` aparte que nadie sabría interpretar distinto.
          reason: 'not_parseable'
        }
      }
    ]
  }

  return []
}

export interface SiteFindingsEvaluation {
  findings: SiteAuditFinding[]
  /** URL canónica del sujeto. Es la `url` con la que se materializan (la tabla la exige NOT NULL). */
  siteUrl: string
}

const withDeadline = async <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  let timer: NodeJS.Timeout | undefined

  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), ms)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Evalúa los cuatro chequeos de sitio contra el dominio del target.
 *
 * NUNCA LANZA (contrato heredado de TASK-1266): el collect materializa el run con o sin estos
 * hallazgos, y un sitio caído no puede tumbar el cierre de un audit que ya se pagó. Un fallo
 * inesperado se reporta a Sentry y degrada a `unverified`, nunca a silencio.
 */
export const evaluateSiteFindings = async (
  baseUrl: string,
  fetcher: SiteFetcher,
  options: { deadlineMs?: number } = {}
): Promise<SiteFindingsEvaluation> => {
  const deadlineMs = options.deadlineMs ?? SITE_FINDINGS_DEADLINE_MS

  const timedOut: SiteAuditFinding[] = [
    unverified('ai_crawler_access', 'Se agotó el presupuesto de tiempo para verificar el sitio.', {
      deadlineMs
    })
  ]

  const evaluate = async (): Promise<SiteAuditFinding[]> => {
    const findings: SiteAuditFinding[] = []

    // El fetcher memoiza robots.txt por instancia, así que esta lectura es la misma que ya usa
    // para su propia política de conducta: no se paga dos veces.
    const robots = await fetcher('/robots.txt', { accept: 'text/plain', timeoutMs: FETCH_TIMEOUT_MS })

    findings.push(...evaluateAiCrawlerAccess(robots))

    const robotsAllowsOurCrawler =
      robots.status === 404 || !robots.ok ? true : isPathAllowed(parseRobotsPolicy(robots.body), '/', OWN_USER_AGENT_TOKEN)

    const [home, variant] = await Promise.all([
      fetcher('/', { timeoutMs: FETCH_TIMEOUT_MS }),
      fetcher('/', { timeoutMs: FETCH_TIMEOUT_MS, userAgent: EDGE_CHECK_USER_AGENT })
    ])

    findings.push(...evaluateEdgeAccess(home, variant, robotsAllowsOurCrawler))
    findings.push(...evaluateStructuredData(home))

    const declaredSitemaps = robots.ok ? extractDeclaredSitemaps(robots.body) : []
    const declaredUrl = declaredSitemaps[0] ?? null

    if (declaredUrl) {
      const declaredResult = await fetcher(declaredUrl, {
        accept: 'application/xml,text/xml',
        timeoutMs: FETCH_TIMEOUT_MS
      })

      findings.push(...evaluateSitemap(null, { url: declaredUrl, result: declaredResult }))
    } else {
      const conventional = await fetcher('/sitemap.xml', {
        accept: 'application/xml,text/xml',
        timeoutMs: FETCH_TIMEOUT_MS
      })

      findings.push(...evaluateSitemap(conventional, null))
    }

    return findings
  }

  try {
    const findings = await withDeadline(evaluate(), deadlineMs, timedOut)

    return { findings, siteUrl: baseUrl }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_site_audit_site_findings' },
      extra: { baseUrl }
    })

    return {
      findings: [unverified('ai_crawler_access', 'La verificación del sitio falló de forma inesperada.')],
      siteUrl: baseUrl
    }
  }
}
