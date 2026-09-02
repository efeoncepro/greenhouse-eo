import { describe, expect, it, vi } from 'vitest'

import {
  AI_CRAWLER_FAMILIES,
  SITE_FINDING_SEVERITY,
  evaluateAiCrawlerAccess,
  evaluateEdgeAccess,
  evaluateSitemap,
  evaluateSiteFindings,
  evaluateStructuredData,
  extractDeclaredSitemaps
} from '@/lib/growth/seo/site-audit/site-findings'
import type { SiteFetchResult } from '@/lib/growth/site-substrate'

const ok = (overrides: Partial<SiteFetchResult> = {}): SiteFetchResult => ({
  ok: true,
  status: 200,
  url: 'https://ejemplo.cl/',
  body: '',
  contentType: 'text/html',
  errorCode: null,
  truncated: false,
  observable: true,
  ...overrides
})

const failed = (overrides: Partial<SiteFetchResult> = {}): SiteFetchResult => ({
  ok: false,
  status: 0,
  url: 'https://ejemplo.cl/',
  body: '',
  contentType: null,
  errorCode: 'timeout',
  truncated: false,
  observable: false,
  ...overrides
})

const issueTypes = (findings: { issueType: string }[]): string[] => findings.map(finding => finding.issueType)

describe('familias de crawlers de IA', () => {
  it('separa retrieval de training y nunca deja una familia vacía', () => {
    const families = Object.values(AI_CRAWLER_FAMILIES).map(meta => meta.family)

    expect(families).toContain('retrieval')
    expect(families).toContain('training')
    expect(AI_CRAWLER_FAMILIES['OAI-SearchBot']?.family).toBe('retrieval')
    expect(AI_CRAWLER_FAMILIES.GPTBot?.family).toBe('training')
  })

  it('cada bot lleva su razón escrita: una familia sin razón es una clasificación sin dueño', () => {
    for (const [bot, meta] of Object.entries(AI_CRAWLER_FAMILIES)) {
      expect(meta.reason.length, `${bot} sin razón`).toBeGreaterThan(10)
    }
  })

  it('ninguna severidad de familia ambigua puede ser critical', () => {
    // El default jamás es `critical` (Open Question 4): `other` no emite hallazgo propio.
    const otherBots = Object.entries(AI_CRAWLER_FAMILIES).filter(([, meta]) => meta.family === 'other')

    expect(otherBots.length).toBeGreaterThan(0)
    expect(Object.keys(SITE_FINDING_SEVERITY)).not.toContain('ai_other_crawlers_blocked')
  })
})

describe('evaluateAiCrawlerAccess', () => {
  it('bloquear retrieval es critical', () => {
    const findings = evaluateAiCrawlerAccess(ok({ body: 'User-agent: OAI-SearchBot\nDisallow: /' }))

    expect(issueTypes(findings)).toEqual(['ai_retrieval_crawlers_blocked'])
    expect(findings[0]?.severity).toBe('critical')
    expect(findings[0]?.detail.blocked).toEqual(['OAI-SearchBot'])
  })

  it('bloquear SOLO entrenamiento con retrieval abierto es notice, jamás critical', () => {
    const robots = ok({ body: 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: Google-Extended\nDisallow: /' })
    const findings = evaluateAiCrawlerAccess(robots)

    expect(issueTypes(findings)).toEqual(['ai_training_crawlers_blocked'])
    expect(findings[0]?.severity).toBe('notice')
    expect(findings.every(finding => finding.severity !== 'critical')).toBe(true)
    expect(findings[0]?.detail.retrievalOpen).toBe(true)
  })

  it('bloquear las dos familias emite los dos hallazgos por separado', () => {
    const robots = ok({ body: 'User-agent: *\nDisallow: /' })
    const findings = evaluateAiCrawlerAccess(robots)

    expect(issueTypes(findings).sort()).toEqual(['ai_retrieval_crawlers_blocked', 'ai_training_crawlers_blocked'])
  })

  it('un Allow explícito de la raíz exime al bot, aunque el wildcard bloquee al resto', () => {
    const robots = ok({ body: 'User-agent: *\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /' })

    const retrieval = evaluateAiCrawlerAccess(robots).find(
      finding => finding.issueType === 'ai_retrieval_crawlers_blocked'
    )

    // El grupo `*` sigue bloqueando a los demás, así que el hallazgo EXISTE — lo que no puede
    // pasar es que el bot con su Allow explícito aparezca listado como bloqueado.
    expect(retrieval?.detail.blocked).not.toContain('OAI-SearchBot')
    expect(retrieval?.detail.blocked).toContain('PerplexityBot')
  })

  it('sin robots.txt (404) no hay restricción: ausencia MEDIDA, no hallazgo', () => {
    expect(evaluateAiCrawlerAccess(ok({ status: 404 }))).toEqual([])
  })

  it('robots ilegible NO se lee como sitio sano: queda como no verificado con su razón', () => {
    const findings = evaluateAiCrawlerAccess(failed({ errorCode: 'timeout' }))

    expect(issueTypes(findings)).toEqual(['site_check_unverified'])
    expect(findings[0]?.detail.check).toBe('ai_crawler_access')
    expect(findings[0]?.detail.errorCode).toBe('timeout')
  })

  it('un bot de familia ambigua bloqueado viaja como evidencia, no como hallazgo propio', () => {
    const robots = ok({ body: 'User-agent: Bytespider\nDisallow: /\n\nUser-agent: OAI-SearchBot\nDisallow: /' })
    const findings = evaluateAiCrawlerAccess(robots)

    expect(issueTypes(findings)).toEqual(['ai_retrieval_crawlers_blocked'])
    expect(findings[0]?.detail.otherBlocked).toEqual(['Bytespider'])
  })

  it('no confunde un token ajeno por coincidencia de prefijo', () => {
    // `User-agent: C` no puede capturar a ClaudeBot: el match de terceros es exacto.
    const findings = evaluateAiCrawlerAccess(ok({ body: 'User-agent: C\nDisallow: /' }))

    expect(findings).toEqual([])
  })
})

describe('evaluateEdgeAccess', () => {
  it('403 al crawler identificado con robots limpio es un hallazgo DE BORDE, no de robots', () => {
    const findings = evaluateEdgeAccess(ok({ ok: false, status: 403 }), ok({ ok: false, status: 403 }), true)

    expect(issueTypes(findings)).toEqual(['ai_crawler_edge_access_denied'])
    expect(findings[0]?.severity).toBe('critical')
    expect(findings[0]?.detail.source).toBe('edge')
    expect(findings[0]?.detail.robotsAllowsCrawlers).toBe(true)
  })

  it('registra cuando el borde responde distinto a dos tokens nuestros', () => {
    const findings = evaluateEdgeAccess(ok({ ok: false, status: 403 }), ok({ status: 200 }), true)

    expect(findings[0]?.detail.differsByUserAgent).toBe(true)
  })

  it('401 en la home pública también es denegación del borde', () => {
    const findings = evaluateEdgeAccess(ok({ ok: false, status: 401 }), ok({ ok: false, status: 401 }), true)

    expect(issueTypes(findings)).toEqual(['ai_crawler_edge_access_denied'])
  })

  it('429 también cuenta como denegación en el borde', () => {
    const findings = evaluateEdgeAccess(ok({ ok: false, status: 429 }), ok({ status: 200 }), true)

    expect(issueTypes(findings)).toEqual(['ai_crawler_edge_access_denied'])
  })

  it('no duplica el hallazgo cuando quien nos niega es el robots.txt', () => {
    const blocked = failed({ errorCode: 'blocked_robots' })

    expect(evaluateEdgeAccess(blocked, blocked, false)).toEqual([])
  })

  it('sitio que responde 200 a ambos tokens no produce hallazgo', () => {
    expect(evaluateEdgeAccess(ok(), ok(), true)).toEqual([])
  })

  it('sin respuesta HTTP alguna no se declara sano', () => {
    const findings = evaluateEdgeAccess(failed(), failed(), true)

    expect(issueTypes(findings)).toEqual(['site_check_unverified'])
    expect(findings[0]?.detail.check).toBe('edge_access')
  })
})

describe('evaluateStructuredData', () => {
  it('home sin JSON-LD es warning', () => {
    const findings = evaluateStructuredData(ok({ body: '<html><body><h1>Hola</h1></body></html>' }))

    expect(issueTypes(findings)).toEqual(['structured_data_missing'])
    expect(findings[0]?.severity).toBe('warning')
  })

  it('home con JSON-LD no produce hallazgo', () => {
    const body = '<script type="application/ld+json">{"@type":"Organization","name":"X"}</script>'

    expect(evaluateStructuredData(ok({ body }))).toEqual([])
  })

  it('cuerpo truncado NUNCA concluye ausencia: "no miré todo" no es "no está"', () => {
    const findings = evaluateStructuredData(ok({ body: '<html>', truncated: true }))

    expect(issueTypes(findings)).toEqual(['site_check_unverified'])
    expect(findings[0]?.detail.truncated).toBe(true)
  })

  it('cascarón de render JS tampoco concluye ausencia', () => {
    const findings = evaluateStructuredData(ok({ body: '<div id="root"></div>', observable: false }))

    expect(issueTypes(findings)).toEqual(['site_check_unverified'])
  })

  it('encontrar JSON-LD en un cuerpo truncado SÍ es prueba (la asimetría corre en un sentido)', () => {
    const body = '<script type="application/ld+json">{"@type":"Organization"}</script>'

    expect(evaluateStructuredData(ok({ body, truncated: true }))).toEqual([])
  })

  it('home ilegible no se lee como ausencia de datos estructurados', () => {
    const findings = evaluateStructuredData(failed({ status: 500, errorCode: 'http_error' }))

    expect(issueTypes(findings)).toEqual(['site_check_unverified'])
  })
})

describe('extractDeclaredSitemaps', () => {
  it('lee la directiva Sitemap sin importar el grupo ni el orden', () => {
    const robots = 'User-agent: *\nDisallow: /admin\nSitemap: https://ejemplo.cl/sitemap_index.xml'

    expect(extractDeclaredSitemaps(robots)).toEqual(['https://ejemplo.cl/sitemap_index.xml'])
  })

  it('ignora comentarios y no repite', () => {
    const robots = '# Sitemap: https://falso.cl/x.xml\nSitemap: https://ejemplo.cl/a.xml\nSitemap: https://ejemplo.cl/a.xml'

    expect(extractDeclaredSitemaps(robots)).toEqual(['https://ejemplo.cl/a.xml'])
  })
})

describe('evaluateSitemap', () => {
  it('ausente en /sitemap.xml y sin declarar es notice, no warning', () => {
    const findings = evaluateSitemap(ok({ ok: false, status: 404 }), null)

    expect(issueTypes(findings)).toEqual(['sitemap_missing'])
    expect(findings[0]?.severity).toBe('notice')
  })

  it('404 en la ruta convencional NO es hallazgo si robots declara uno sano', () => {
    const declared = { url: 'https://ejemplo.cl/sitemap_index.xml', result: ok({ body: '<sitemapindex></sitemapindex>' }) }

    expect(evaluateSitemap(null, declared)).toEqual([])
  })

  it('el sitemap declarado en robots y roto sí es warning', () => {
    const declared = { url: 'https://ejemplo.cl/sitemap.xml', result: failed({ ok: false, status: 404, errorCode: 'http_error' }) }
    const findings = evaluateSitemap(null, declared)

    expect(issueTypes(findings)).toEqual(['sitemap_declared_broken'])
    expect(findings[0]?.severity).toBe('warning')
    expect(findings[0]?.detail.reason).toBe('unreachable')
  })

  it('el declarado que responde pero no parsea también es warning', () => {
    const declared = { url: 'https://ejemplo.cl/sitemap.xml', result: ok({ body: '<html>no soy un sitemap</html>' }) }
    const findings = evaluateSitemap(null, declared)

    expect(issueTypes(findings)).toEqual(['sitemap_declared_broken'])
    expect(findings[0]?.detail.reason).toBe('not_parseable')
  })

  it('sitemap válido en la ruta convencional no produce hallazgo', () => {
    expect(evaluateSitemap(ok({ body: '<urlset><url><loc>https://ejemplo.cl/</loc></url></urlset>' }), null)).toEqual([])
  })

  it('el robots que nos prohíbe la ruta NO convierte al sitemap en roto', () => {
    // Caso real: reuters.com declara su sitemap y su robots.txt nos prohíbe leerlo. No haber
    // mirado el archivo no autoriza a decir que está roto.
    const declared = {
      url: 'https://ejemplo.cl/sitemap.xml',
      result: failed({ errorCode: 'blocked_robots' })
    }

    const findings = evaluateSitemap(null, declared)

    expect(issueTypes(findings)).toEqual(['site_check_unverified'])
    expect(findings[0]?.detail.check).toBe('sitemap')
  })

  it('sitemap inalcanzable por red no se declara ausente', () => {
    const findings = evaluateSitemap(failed({ errorCode: 'timeout' }), null)

    expect(issueTypes(findings)).toEqual(['site_check_unverified'])
  })
})

describe('evaluateSiteFindings (orquestación)', () => {
  const fetcherFor = (responses: Record<string, SiteFetchResult>) =>
    vi.fn(async (path: string, init?: { userAgent?: string }) => {
      void init

      return responses[path] ?? ok()
    })

  it('un sitio sano no produce ningún hallazgo', async () => {
    const fetcher = fetcherFor({
      '/robots.txt': ok({ body: 'User-agent: *\nAllow: /' }),
      '/': ok({ body: '<script type="application/ld+json">{"@type":"Organization"}</script>' }),
      '/sitemap.xml': ok({ body: '<urlset></urlset>' })
    })

    const result = await evaluateSiteFindings('https://ejemplo.cl', fetcher)

    expect(result.findings).toEqual([])
    expect(result.siteUrl).toBe('https://ejemplo.cl')
  })

  it('el falso sano que la task existe para cerrar: robots limpio + 403 en el borde', async () => {
    const fetcher = fetcherFor({
      '/robots.txt': ok({ body: 'User-agent: *\nAllow: /' }),
      '/': ok({ ok: false, status: 403 }),
      '/sitemap.xml': ok({ body: '<urlset></urlset>' })
    })

    const result = await evaluateSiteFindings('https://ejemplo.cl', fetcher)

    expect(issueTypes(result.findings)).toContain('ai_crawler_edge_access_denied')
    expect(result.findings.some(finding => finding.severity === 'critical')).toBe(true)
  })

  it('prefiere el sitemap declarado en robots sobre la ruta convencional', async () => {
    const fetcher = fetcherFor({
      '/robots.txt': ok({ body: 'User-agent: *\nAllow: /\nSitemap: https://ejemplo.cl/sm.xml' }),
      '/': ok({ body: '<script type="application/ld+json">{"@type":"Organization"}</script>' }),
      'https://ejemplo.cl/sm.xml': ok({ body: '<sitemapindex></sitemapindex>' })
    })

    const result = await evaluateSiteFindings('https://ejemplo.cl', fetcher)

    expect(result.findings).toEqual([])
    expect(fetcher).not.toHaveBeenCalledWith('/sitemap.xml', expect.anything())
  })

  it('un sitio inalcanzable degrada a no verificado, nunca a sano', async () => {
    const fetcher = vi.fn(async () => failed({ errorCode: 'network' }))

    const result = await evaluateSiteFindings('https://caido.cl', fetcher)

    expect(result.findings.length).toBeGreaterThan(0)
    expect(result.findings.every(finding => finding.issueType === 'site_check_unverified')).toBe(true)
  })

  it('nunca lanza: un fetcher que explota degrada con evidencia en vez de tumbar el collect', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('boom')
    })

    const result = await evaluateSiteFindings('https://ejemplo.cl', fetcher)

    expect(issueTypes(result.findings)).toEqual(['site_check_unverified'])
  })

  it('el presupuesto de tiempo corta y degrada, no cuelga el cierre del run', async () => {
    const fetcher = vi.fn(
      async () =>
        new Promise<SiteFetchResult>(resolve => {
          setTimeout(() => resolve(ok()), 5_000)
        })
    )

    const result = await evaluateSiteFindings('https://lento.cl', fetcher, { deadlineMs: 20 })

    expect(issueTypes(result.findings)).toEqual(['site_check_unverified'])
    expect(result.findings[0]?.detail.deadlineMs).toBe(20)
  })

  it('el chequeo de borde usa una variante de NUESTRO token, nunca el de un bot de terceros', async () => {
    const fetcher = fetcherFor({ '/robots.txt': ok({ body: 'User-agent: *\nAllow: /' }) })

    await evaluateSiteFindings('https://ejemplo.cl', fetcher)

    const userAgents = fetcher.mock.calls
      .map(([, init]) => init?.userAgent)
      .filter((value): value is string => typeof value === 'string')

    expect(userAgents.length).toBeGreaterThan(0)
    expect(userAgents.every(agent => agent.startsWith('GreenhouseAEOGrader'))).toBe(true)

    for (const forbidden of ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Mozilla']) {
      expect(userAgents.some(agent => agent.includes(forbidden))).toBe(false)
    }
  })
})
