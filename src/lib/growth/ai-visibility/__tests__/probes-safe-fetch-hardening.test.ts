import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createProbeFetcher, isNonPublicResolvedAddress, MAX_REDIRECTS } from '../probes/safe-fetch'
import { createEntityApiFetcher } from '../probes/entity-fetch'
import { assessHtmlObservability } from '../probes/html'
import { readBodyWithCap } from '../probes/read-body'
import { isPathAllowed, parseRobotsPolicy } from '../probes/robots-policy'
import { jsonLdProbe } from '../probes/structural/json-ld'
import { structuredActionsProbe } from '../probes/agentic/structured-actions'
import { domSemanticsProbe } from '../probes/agentic/dom-semantics'
import { type ProbeContext, type ProbeFetchResult } from '../probes/contracts'

/**
 * TASK-1778 — Suite adversarial del endurecimiento del fetcher (ISSUE-164).
 *
 * Cubre: contención de redirects por salto (familia del sujeto), guarda DNS sobre
 * direcciones resueltas, tope de bytes por stream con rastro (`truncated`), observabilidad
 * (`observable`), obediencia de robots.txt con NUESTRO token, override de UA, y el test
 * anti-divergencia cabecera↔código.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

const PUBLIC_ADDR = [{ address: '93.184.216.34', family: 4 }]

type RouteMap = Record<string, () => Response>

/** fetch mock por tabla de rutas; registra cada URL pedida. Default robots.txt → 404. */
const routedFetch = (routes: RouteMap, calls: string[] = []) => {
  const impl = (async (input: unknown) => {
    const url = String(input)

    calls.push(url)

    const handler = routes[url]

    if (handler) return handler()
    if (url.endsWith('/robots.txt')) return new Response('not found', { status: 404 })

    return new Response('fallback', { status: 200, headers: { 'content-type': 'text/html' } })
  }) as unknown as typeof fetch

  return { impl, calls }
}

const redirect = (location: string, status = 302): Response =>
  new Response(null, { status, headers: { location } })

const html = (body: string): Response =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })

const strictFetcher = (routes: RouteMap, overrides: { lookup?: typeof lookupPublic } = {}) => {
  const { impl, calls } = routedFetch(routes)

  const fetcher = createProbeFetcher('https://example.com', {
    fetchImpl: impl,
    strictNetwork: true,
    lookupImpl: overrides.lookup ?? lookupPublic
  })

  return { fetcher, calls }
}

const lookupPublic = async () => PUBLIC_ADDR

// ── Slice 1 — contención de redirects ────────────────────────────────────────

describe('TASK-1778 · redirect containment (strict)', () => {
  it('redirect a IP privada → blocked_redirect y el cuerpo del destino NO se lee', async () => {
    const { fetcher, calls } = strictFetcher({
      'https://example.com/': () => redirect('http://10.0.0.5/'),
      'http://10.0.0.5/': () => html('SECRETO INTERNO')
    })

    const res = await fetcher('/')

    expect(res.ok).toBe(false)
    expect(res.errorCode).toBe('blocked_redirect')
    expect(res.body).toBe('')
    expect(calls).not.toContain('http://10.0.0.5/')
  })

  it('redirect al metadata endpoint (169.254.169.254) → blocked_redirect', async () => {
    const { fetcher, calls } = strictFetcher({
      'https://example.com/': () => redirect('http://169.254.169.254/computeMetadata/v1/')
    })

    const res = await fetcher('/')

    expect(res.errorCode).toBe('blocked_redirect')
    expect(calls.filter(u => u.includes('169.254'))).toHaveLength(0)
  })

  it('redirect a un host público distinto → blocked_redirect (fuera de la familia del sujeto)', async () => {
    const { fetcher, calls } = strictFetcher({
      'https://example.com/': () => redirect('https://evil.test/landing')
    })

    const res = await fetcher('/')

    expect(res.errorCode).toBe('blocked_redirect')
    expect(calls).not.toContain('https://evil.test/landing')
  })

  it('redirect a un subdominio DESCENDIENTE del sujeto SIGUE funcionando (evidencia bancochile 2026-08-27)', async () => {
    // Caso real de la cartera: www.bancochile.cl → 301 → sitiospublicos.bancochile.cl.
    const { fetcher } = strictFetcher({
      'https://example.com/': () => redirect('https://sitiospublicos.example.com/personas', 301),
      'https://sitiospublicos.example.com/personas': () => html('portal personas')
    })

    const res = await fetcher('/')

    expect(res.ok).toBe(true)
    expect(res.body).toBe('portal personas')
  })

  it('el sufijo de descendiente se ancla con punto: hosts parecidos NO pasan', async () => {
    for (const evil of ['https://evilexample.com/', 'https://example.com.evil.test/']) {
      const { fetcher, calls } = strictFetcher({
        'https://example.com/': () => redirect(evil)
      })

      expect((await fetcher('/')).errorCode).toBe('blocked_redirect')
      expect(calls).not.toContain(evil)
    }
  })

  it('otro dominio registrable sigue bloqueado aunque comparta marca (berel.com.mx → berel.com)', async () => {
    const berelFetcher = createProbeFetcher('https://berel.com.mx', {
      fetchImpl: routedFetch({
        'https://berel.com.mx/': () => redirect('https://berel.com/', 301)
      }).impl,
      strictNetwork: true,
      lookupImpl: lookupPublic
    })

    expect((await berelFetcher('/')).errorCode).toBe('blocked_redirect')
  })

  it('un salto a subdominio descendiente TAMBIÉN pasa por la guarda DNS', async () => {
    const lookupByHost = async (hostname: string) =>
      hostname === 'interno.example.com' ? [{ address: '10.9.9.9', family: 4 }] : PUBLIC_ADDR

    const { impl } = routedFetch({
      'https://example.com/': () => redirect('https://interno.example.com/', 301)
    })

    const fetcher = createProbeFetcher('https://example.com', {
      fetchImpl: impl,
      strictNetwork: true,
      lookupImpl: lookupByHost
    })

    expect((await fetcher('/')).errorCode).toBe('blocked_private_address')
  })

  it('cadena que excede MAX_REDIRECTS → blocked_redirect', async () => {
    const routes: RouteMap = {}

    for (let i = 0; i <= MAX_REDIRECTS + 1; i++) {
      routes[`https://example.com/hop${i}`] = () => redirect(`https://example.com/hop${i + 1}`)
    }

    const { fetcher } = strictFetcher(routes)

    expect((await fetcher('/hop0')).errorCode).toBe('blocked_redirect')
  })

  it('downgrade https → http del mismo host → blocked_redirect', async () => {
    const { fetcher } = strictFetcher({
      'https://example.com/': () => redirect('http://example.com/')
    })

    expect((await fetcher('/')).errorCode).toBe('blocked_redirect')
  })

  it('apex → www SIGUE funcionando (familia del sujeto, no igualdad exacta)', async () => {
    const { fetcher } = strictFetcher({
      'https://example.com/': () => redirect('https://www.example.com/', 301),
      'https://www.example.com/': () => html('<html><body><h1>Hola</h1>contenido real de la marca</body></html>')
    })

    const res = await fetcher('/')

    expect(res.ok).toBe(true)
    expect(res.body).toContain('contenido real')
    expect(res.errorCode).toBeNull()
  })

  it('www → apex y upgrade http → https siguen funcionando', async () => {
    const wwwFetcher = createProbeFetcher('https://www.example.com', {
      fetchImpl: routedFetch({
        'https://www.example.com/': () => redirect('https://example.com/', 301),
        'https://example.com/': () => html('apex ok')
      }).impl,
      strictNetwork: true,
      lookupImpl: lookupPublic
    })

    expect((await wwwFetcher('/')).ok).toBe(true)

    const { fetcher } = strictFetcher({
      'http://example.com/legacy': () => redirect('https://example.com/legacy', 301),
      'https://example.com/legacy': () => html('https ok')
    })

    const upgraded = await fetcher('http://example.com/legacy')

    expect(upgraded.ok).toBe(true)
    expect(upgraded.body).toBe('https ok')
  })

  it('modo legacy (flag OFF): un solo fetch con redirect follow, sin DNS', async () => {
    const { impl, calls } = routedFetch({
      'https://example.com/': () => html('legacy')
    })

    let lookups = 0

    const fetcher = createProbeFetcher('https://example.com', {
      fetchImpl: impl,
      strictNetwork: false,
      lookupImpl: async () => {
        lookups++

        return PUBLIC_ADDR
      }
    })

    const res = await fetcher('/')

    expect(res.ok).toBe(true)
    expect(lookups).toBe(0)
    // robots.txt (política) + la página: exactamente 2 requests, sin hops manuales.
    expect(calls).toEqual(['https://example.com/robots.txt', 'https://example.com/'])
  })
})

// ── Slice 2 — guarda DNS ─────────────────────────────────────────────────────

describe('TASK-1778 · DNS guard (strict)', () => {
  it('hostname público que resuelve a rango privado → blocked_private_address, sin conectar', async () => {
    const { impl, calls } = routedFetch({})

    const fetcher = createProbeFetcher('https://rebind.example.com', {
      fetchImpl: impl,
      strictNetwork: true,
      lookupImpl: async () => [{ address: '10.1.2.3', family: 4 }]
    })

    const res = await fetcher('/')

    expect(res.errorCode).toBe('blocked_private_address')
    expect(calls).toHaveLength(0)
  })

  it('basta UNA dirección resuelta no pública para bloquear (dual A record)', async () => {
    const fetcher = createProbeFetcher('https://dual.example.com', {
      fetchImpl: routedFetch({}).impl,
      strictNetwork: true,
      lookupImpl: async () => [...PUBLIC_ADDR, { address: '169.254.169.254', family: 4 }]
    })

    expect((await fetcher('/')).errorCode).toBe('blocked_private_address')
  })

  it('la guarda aplica también al host de un salto', async () => {
    const lookupByHost = async (hostname: string) =>
      hostname === 'www.example.com' ? [{ address: '192.168.1.10', family: 4 }] : PUBLIC_ADDR

    const { impl } = routedFetch({
      'https://example.com/': () => redirect('https://www.example.com/', 301)
    })

    const fetcher = createProbeFetcher('https://example.com', {
      fetchImpl: impl,
      strictNetwork: true,
      lookupImpl: lookupByHost
    })

    expect((await fetcher('/')).errorCode).toBe('blocked_private_address')
  })

  it('clasifica IPv4-mapped IPv6 y rangos IPv6 no públicos', () => {
    expect(isNonPublicResolvedAddress('::ffff:10.0.0.5')).toBe(true)
    expect(isNonPublicResolvedAddress('::ffff:169.254.169.254')).toBe(true)
    expect(isNonPublicResolvedAddress('::1')).toBe(true)
    expect(isNonPublicResolvedAddress('fe80::1')).toBe(true)
    expect(isNonPublicResolvedAddress('fd00::1')).toBe(true)
    expect(isNonPublicResolvedAddress('2606:2800:220:1:248:1893:25c8:1946')).toBe(false)
    expect(isNonPublicResolvedAddress('93.184.216.34')).toBe(false)
  })
})

// ── Slice 3 — tope real por stream + truncado con rastro + observable ────────

describe('TASK-1778 · streaming cap + truncated + observable', () => {
  it('una respuesta chunked gigante sin content-length NO se bufferiza completa', async () => {
    let pushed = 0
    const chunk = new TextEncoder().encode('z'.repeat(1024))

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pushed++
        controller.enqueue(chunk)
      }
    })

    const response = new Response(stream, { status: 200, headers: { 'content-type': 'text/html' } })
    const { body, truncated } = await readBodyWithCap(response, 8 * 1024)

    expect(truncated).toBe(true)
    expect(body).toHaveLength(8 * 1024)
    // El productor se canceló mucho antes del infinito: el tope protege memoria de verdad.
    expect(pushed).toBeLessThan(64)
  })

  it('un body exactamente en el tope NO se marca truncado', async () => {
    const response = new Response('a'.repeat(100), { status: 200 })
    const { body, truncated } = await readBodyWithCap(response, 100)

    expect(body).toHaveLength(100)
    expect(truncated).toBe(false)
  })

  it('HTML sobre el tope con JSON-LD al final → el probe degrada a skipped, JAMÁS "no tiene"', async () => {
    const bigHtml =
      '<html><body>' +
      'relleno '.repeat(1000) +
      '<script type="application/ld+json">{"@type":"Organization"}</script></body></html>'

    const { fetcher } = strictFetcher({
      'https://example.com/': () => html(bigHtml)
    })

    const cappedFetcher = (path: string, init = {}) => fetcher(path, { ...init, maxBytes: 500 })

    const ctx: ProbeContext = {
      domain: 'example.com',
      baseUrl: 'https://example.com',
      fetcher: cappedFetcher,
      headless: null
    }

    const outcome = await jsonLdProbe.run(ctx)

    expect(outcome.status).toBe('skipped')
    expect(outcome.score).toBeNull()
    expect(outcome.errorCode).toBe('truncated_body')
  })

  it('encontrar en un cuerpo parcial SÍ es prueba (la asimetría corre en una dirección)', async () => {
    const truncatedWithFinding: ProbeFetchResult = {
      ok: true,
      status: 200,
      url: 'https://example.com/',
      body: '<script type="application/ld+json">{"@type":"Organization"}</script>',
      contentType: 'text/html',
      errorCode: null,
      truncated: true,
      observable: false
    }

    const ctx: ProbeContext = {
      domain: 'example.com',
      baseUrl: 'https://example.com',
      fetcher: async () => truncatedWithFinding,
      headless: null
    }

    const outcome = await jsonLdProbe.run(ctx)

    expect(outcome.status).toBe('succeeded')
    expect(outcome.score).toBeGreaterThan(0)
  })

  it('shell SPA vacío → observable false → probes de presencia degradan a skipped', async () => {
    const shell =
      '<html><head><script src="/app.js"></script></head><body>' +
      '<noscript>You need to enable JavaScript to run this app.</noscript>' +
      '<div id="root"></div></body></html>'

    expect(assessHtmlObservability(shell).observable).toBe(false)

    const { fetcher } = strictFetcher({ 'https://example.com/': () => html(shell) })

    const ctx: ProbeContext = {
      domain: 'example.com',
      baseUrl: 'https://example.com',
      fetcher,
      headless: null
    }

    for (const probe of [jsonLdProbe, structuredActionsProbe, domSemanticsProbe]) {
      const outcome = await probe.run(ctx)

      expect(outcome.status).toBe('skipped')
      expect(outcome.score).toBeNull()
      expect(outcome.errorCode).toBe('not_observable')
    }
  })

  it('una página chica legítima sigue siendo observable (la señal sólo retira, no inventa)', () => {
    const minimal = '<html><body><h1>Estudio Pérez</h1><p>Abogados en Santiago desde 1990.</p></body></html>'

    expect(assessHtmlObservability(minimal).observable).toBe(true)
  })

  it('entity-fetch comparte el arreglo: corta por stream y deja rastro', async () => {
    const fetchImpl = (async () =>
      new Response('k'.repeat(5000), { status: 200 })) as unknown as typeof fetch

    const entityFetcher = createEntityApiFetcher({ fetchImpl })
    const res = await entityFetcher('https://www.wikidata.org/w/api.php', { maxBytes: 1000 })

    expect(res.body).toHaveLength(1000)
    expect(res.truncated).toBe(true)
  })
})

// ── Slice 4 — robots.txt obedecido ───────────────────────────────────────────

describe('TASK-1778 · robots.txt obedience', () => {
  const robots = (text: string) => () => new Response(text, { status: 200, headers: { 'content-type': 'text/plain' } })

  it('un Disallow que nos alcanza → blocked_robots (hallazgo, no lectura)', async () => {
    const { fetcher, calls } = strictFetcher({
      'https://example.com/robots.txt': robots('User-agent: *\nDisallow: /private'),
      'https://example.com/private/data': () => html('privado')
    })

    const res = await fetcher('/private/data')

    expect(res.errorCode).toBe('blocked_robots')
    expect(res.body).toBe('')
    expect(calls).not.toContain('https://example.com/private/data')

    const home = await fetcher('/')

    expect(home.ok).toBe(true)
  })

  it('NUNCA nos matcheamos contra los bots que auditamos: GPTBot bloqueado ≠ nosotros bloqueados', async () => {
    const { fetcher } = strictFetcher({
      'https://example.com/robots.txt': robots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /')
    })

    const res = await fetcher('/')

    expect(res.ok).toBe(true)
  })

  it('nuestro propio token SÍ nos gobierna', async () => {
    const { fetcher } = strictFetcher({
      'https://example.com/robots.txt': robots('User-agent: GreenhouseAEOGrader\nDisallow: /')
    })

    expect((await fetcher('/')).errorCode).toBe('blocked_robots')
  })

  it('/robots.txt SIEMPRE es alcanzable aunque la política prohíba todo', async () => {
    const { fetcher } = strictFetcher({
      'https://example.com/robots.txt': robots('User-agent: *\nDisallow: /')
    })

    const policy = await fetcher('/robots.txt')

    expect(policy.ok).toBe(true)
    expect(policy.body).toContain('Disallow')
    expect((await fetcher('/')).errorCode).toBe('blocked_robots')
  })

  it('el robots.txt se descarga UNA vez por sujeto (la política reusa la lectura del probe)', async () => {
    const { fetcher, calls } = strictFetcher({
      'https://example.com/robots.txt': robots('User-agent: *\nAllow: /'),
      'https://example.com/': () => html('home'),
      'https://example.com/llms.txt': () => new Response('x', { status: 200 })
    })

    await fetcher('/robots.txt')
    await fetcher('/')
    await fetcher('/llms.txt')

    expect(calls.filter(u => u === 'https://example.com/robots.txt')).toHaveLength(1)
  })

  it('sin robots.txt legible (404) → sin restricción', async () => {
    const { fetcher } = strictFetcher({
      'https://example.com/robots.txt': () => new Response('nope', { status: 404 }),
      'https://example.com/x': () => html('ok')
    })

    expect((await fetcher('/x')).ok).toBe(true)
  })
})

describe('TASK-1778 · robots policy (parser puro)', () => {
  it('longest-match gana y el empate favorece a Allow', () => {
    const groups = parseRobotsPolicy('User-agent: *\nDisallow: /a\nAllow: /a/b')

    expect(isPathAllowed(groups, '/a/x', 'GreenhouseAEOGrader')).toBe(false)
    expect(isPathAllowed(groups, '/a/b/c', 'GreenhouseAEOGrader')).toBe(true)
  })

  it('soporta comodín * y ancla $', () => {
    const groups = parseRobotsPolicy('User-agent: *\nDisallow: /*.pdf$\nDisallow: /tmp/*')

    expect(isPathAllowed(groups, '/docs/informe.pdf', 'GreenhouseAEOGrader')).toBe(false)
    expect(isPathAllowed(groups, '/docs/informe.pdf?v=1', 'GreenhouseAEOGrader')).toBe(true)
    expect(isPathAllowed(groups, '/tmp/x/y', 'GreenhouseAEOGrader')).toBe(false)
    expect(isPathAllowed(groups, '/otro', 'GreenhouseAEOGrader')).toBe(true)
  })

  it('Disallow vacío y ausencia de grupos → permitir (conservador)', () => {
    expect(isPathAllowed(parseRobotsPolicy('User-agent: *\nDisallow:'), '/x', 'GreenhouseAEOGrader')).toBe(true)
    expect(isPathAllowed(parseRobotsPolicy(''), '/x', 'GreenhouseAEOGrader')).toBe(true)
    expect(isPathAllowed(parseRobotsPolicy('User-agent: GPTBot\nDisallow: /'), '/x', 'GreenhouseAEOGrader')).toBe(true)
  })

  it('matchea nuestro token variado por prefijo (EdgeCheck), jamás el de un tercero', () => {
    const groups = parseRobotsPolicy('User-agent: GreenhouseAEOGrader\nDisallow: /')

    expect(isPathAllowed(groups, '/', 'GreenhouseAEOGrader-EdgeCheck')).toBe(false)
    expect(isPathAllowed(groups, '/', 'OtroBot')).toBe(true)
  })
})

// ── Slice 4b — override de User-Agent ────────────────────────────────────────

describe('TASK-1778 · user-agent override', () => {
  it('el UA por defecto es nuestro token de cortesía; el override varía NUESTRO token', async () => {
    const seen: string[] = []

    const fetchImpl = (async (_url: unknown, init?: { headers?: Record<string, string> }) => {
      seen.push(init?.headers?.['user-agent'] ?? '')

      return new Response('ok', { status: 200 })
    }) as unknown as typeof fetch

    const fetcher = createProbeFetcher('https://example.com', {
      fetchImpl,
      strictNetwork: false,
      lookupImpl: lookupPublic
    })

    await fetcher('/robots.txt')
    expect(seen[0]).toContain('GreenhouseAEOGrader/1.0')

    await fetcher('/', { userAgent: 'GreenhouseAEOGrader-EdgeCheck/1.0 (+https://greenhouse.efeoncepro.com)' })
    expect(seen[1]).toContain('GreenhouseAEOGrader-EdgeCheck/1.0')
  })
})

// ── Anti-divergencia cabecera ↔ código ───────────────────────────────────────

describe('TASK-1778 · la cabecera de safe-fetch describe lo que el código hace', () => {
  // TASK-1697: el fetcher vive en el sustrato (`site-substrate/site-fetch.ts`); el shim
  // `probes/safe-fetch.ts` sólo re-exporta. El anti-divergencia audita la IMPLEMENTACIÓN.
  const source = readFileSync(join(__dirname, '..', '..', 'site-substrate', 'site-fetch.ts'), 'utf-8')

  it('cada garantía declarada tiene su mecanismo en el archivo', () => {
    // Contención de redirects → redirect manual + tope de saltos.
    expect(source).toContain("redirect: strictNetwork ? 'manual' : 'follow'")
    expect(source).toContain('MAX_REDIRECTS')
    // Guarda DNS → resolución real antes de conectar.
    expect(source).toContain("from 'node:dns/promises'")
    expect(source).toContain('resolvesNonPublic')
    // Tope real → lectura por stream compartida.
    expect(source).toContain('readBodyWithCap')
    // Robots obedecido → predicado de la política.
    expect(source).toContain('isPathAllowed')
  })

  it('la afirmación falsa original no volvió', () => {
    // ISSUE-164: la cabecera prometía `redirect: 'follow'` "acotado al mismo registrable
    // host" sin una línea que lo acotara. Si esta frase reaparece, cabecera y código
    // volvieron a divergir.
    expect(source).not.toMatch(/redirect: 'follow'` acotado/)
  })
})
