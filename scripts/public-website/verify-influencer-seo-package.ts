#!/usr/bin/env tsx

import { chromium } from 'playwright'

const canonical = 'https://efeoncepro.com/servicios/agencia-de-influencers/'

const expected = {
  title: 'Agencia de influencers y UGC para marcas | Efeonce',
  description:
    'Efeonce es una agencia de influencers y UGC para marcas en Chile, Colombia, México y Perú: scouting, derechos, paid usage, whitelisting y medición.',
  socialTitle: 'Influencer marketing y UGC con derechos claros | Efeonce',
  socialDescription:
    'Activa creators, contenido y distribución con derechos definidos desde el inicio. Efeonce opera en Chile, Colombia, México y Perú.',
  image: 'https://efeoncepro.com/wp-content/uploads/2026/08/agencia-influencers-efeonce-og-1200x630-1.png'
} as const

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message)
}

type GraphNode = Record<string, unknown>

const nodeTypes = (node: GraphNode) => {
  const type = node['@type']

  return Array.isArray(type) ? type.map(String) : [String(type)]
}

const main = async () => {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

    const response = await page.goto(`${canonical}?seo-verification=${Date.now()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    })

    assert(response?.status() === 200, `Expected HTTP 200, received ${response?.status()}`)

    const initialHtml = await response.text()

    assert(initialHtml.includes('Creadores que construyen confianza.'), 'Critical H1 copy is absent from initial HTML')
    assert(initialHtml.includes('¿Necesito UGC o influencer marketing?'), 'FAQ copy is absent from initial HTML')

    const contract = await page.evaluate((canonicalUrl: string) => {
      const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null
      const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'))

      const faq = Array.from(document.querySelectorAll<HTMLDetailsElement>('#preguntas .gh-im-faq__list details')).map(
        detail => ({
          question: detail.querySelector('summary span')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          answer: detail.querySelector(':scope > p')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        })
      )

      return {
        title: document.title,
        description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? null,
        robots: document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? null,
        canonical: canonicalLink,
        og: {
          type: document.querySelector<HTMLMetaElement>('meta[property="og:type"]')?.content ?? null,
          title: document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? null,
          description: document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ?? null,
          url: document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content ?? null,
          image: document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ?? null,
          width: document.querySelector<HTMLMetaElement>('meta[property="og:image:width"]')?.content ?? null,
          height: document.querySelector<HTMLMetaElement>('meta[property="og:image:height"]')?.content ?? null,
          mime: document.querySelector<HTMLMetaElement>('meta[property="og:image:type"]')?.content ?? null
        },
        twitter: {
          card: document.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')?.content ?? null,
          title: document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.content ?? null,
          description: document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.content ?? null,
          image: document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content ?? null
        },
        h1: Array.from(document.querySelectorAll('h1')).map(node => node.textContent?.replace(/\s+/g, ' ').trim()),
        menuLinks: document.querySelectorAll(`a[href="${canonicalUrl}"]`).length,
        faq,
        schemas: scripts.map(script => ({
          owner: script.dataset.ghSchema ?? (script.classList.contains('yoast-schema-graph') ? 'yoast' : 'unknown'),
          raw: script.textContent ?? ''
        })),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      }
    }, canonical)

    assert(contract.title === expected.title, `Unexpected title: ${contract.title}`)
    assert(contract.description === expected.description, `Unexpected meta description: ${contract.description}`)
    assert(contract.canonical === canonical, `Unexpected canonical: ${contract.canonical}`)
    assert(contract.robots?.includes('index') && contract.robots.includes('follow'), `Unexpected robots: ${contract.robots}`)
    assert(contract.h1.length === 1, `Expected one H1, received ${contract.h1.length}`)
    assert(contract.menuLinks >= 1, 'Canonical menu link is missing')
    assert(contract.overflow === 0, `Desktop overflow detected: ${contract.overflow}px`)

    assert(contract.og.title === expected.socialTitle, `Unexpected OG title: ${contract.og.title}`)
    assert(contract.og.description === expected.socialDescription, `Unexpected OG description: ${contract.og.description}`)
    assert(contract.og.url === canonical, `Unexpected OG URL: ${contract.og.url}`)
    assert(contract.og.image === expected.image, `Unexpected OG image: ${contract.og.image}`)
    assert(contract.og.width === '1200' && contract.og.height === '630', 'Unexpected OG image dimensions')
    assert(contract.og.mime === 'image/png', `Unexpected OG image MIME: ${contract.og.mime}`)
    assert(contract.og.type === 'article', `Unexpected Yoast OG type: ${contract.og.type}`)

    assert(contract.twitter.card === 'summary_large_image', `Unexpected Twitter card: ${contract.twitter.card}`)
    assert(contract.twitter.title === expected.socialTitle, `Unexpected Twitter title: ${contract.twitter.title}`)
    assert(contract.twitter.description === expected.socialDescription, 'Unexpected Twitter description')
    assert(contract.twitter.image === expected.image, `Unexpected Twitter image: ${contract.twitter.image}`)

    const graph: GraphNode[] = []

    for (const schema of contract.schemas) {
      assert(!/&amp;(?:#[0-9]+|#x[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]+);/.test(schema.raw), `${schema.owner}: double-escaped HTML entity in JSON-LD`)
      const parsed = JSON.parse(schema.raw) as GraphNode
      const nested = parsed['@graph']

      graph.push(...(Array.isArray(nested) ? (nested as GraphNode[]) : [parsed]))
    }

    const nodesByType = (type: string) => graph.filter(node => nodeTypes(node).includes(type))
    const service = nodesByType('Service').find(node => node['@id'] === `${canonical}#service`)
    const faq = nodesByType('FAQPage').find(node => node['@id'] === `${canonical}#faq`)

    assert(nodesByType('WebPage').length === 1, 'Expected one WebPage node')
    assert(nodesByType('Organization').length === 1, 'Expected one Organization node')
    assert(nodesByType('BreadcrumbList').length === 1, 'Breadcrumb schema is duplicated')
    assert(service, 'Primary Service node is missing')
    assert(faq, 'FAQPage node is missing')

    const provider = service.provider as GraphNode | undefined
    const image = service.image as GraphNode | undefined
    const areaServed = service.areaServed as GraphNode[] | undefined
    const offerCatalog = service.hasOfferCatalog as GraphNode | undefined
    const offers = offerCatalog?.itemListElement as GraphNode[] | undefined

    assert(provider?.['@id'] === 'https://efeoncepro.com/#organization', 'Service provider does not reuse Organization @id')
    assert(image?.contentUrl === expected.image && image.width === 1200 && image.height === 630, 'Service image contract failed')
    assert(areaServed?.length === 4, `Expected four served countries, received ${areaServed?.length ?? 0}`)
    assert(offers?.length === 5, `Expected five visible service offers, received ${offers?.length ?? 0}`)

    const faqEntities = faq.mainEntity as GraphNode[] | undefined

    assert(
      faqEntities?.length === contract.faq.length,
      `FAQ schema and visible FAQ counts differ: schema=${faqEntities?.length ?? 0}, visible=${contract.faq.length}`
    )
    assert(contract.faq.length === 6, `Expected six visible FAQ entries, received ${contract.faq.length}`)

    for (let index = 0; index < contract.faq.length; index += 1) {
      const schemaQuestion = faqEntities?.[index]
      const acceptedAnswer = schemaQuestion?.acceptedAnswer as GraphNode | undefined

      assert(schemaQuestion?.name === contract.faq[index]?.question, `FAQ ${index + 1} question drift`)
      assert(acceptedAnswer?.text === contract.faq[index]?.answer, `FAQ ${index + 1} answer drift`)
    }

    const [imageResponse, sitemapResponse, robotsResponse] = await Promise.all([
      page.request.get(expected.image),
      page.request.get('https://efeoncepro.com/page-sitemap.xml'),
      page.request.get('https://efeoncepro.com/robots.txt')
    ])

    assert(imageResponse.status() === 200, `OG image returned ${imageResponse.status()}`)
    assert(imageResponse.headers()['content-type']?.includes('image/png'), 'OG image content type is not PNG')
    assert(sitemapResponse.status() === 200, `Page sitemap returned ${sitemapResponse.status()}`)
    assert((await sitemapResponse.text()).includes(canonical), 'Canonical URL is absent from page sitemap')
    assert(robotsResponse.status() === 200, `robots.txt returned ${robotsResponse.status()}`)

    const robots = await robotsResponse.text()

    assert(!/User-agent:\s*(?:OAI-SearchBot|PerplexityBot)[\s\S]*?Disallow:\s*\//i.test(robots), 'Retrieval bot is explicitly blocked')

    console.log(
      JSON.stringify(
        {
          status: 'pass',
          url: canonical,
          metadata: {
            titleLength: contract.title.length,
            descriptionLength: contract.description.length,
            ogType: contract.og.type,
            ogImage: expected.image
          },
          graph: {
            topLevelTypes: graph.map(node => node['@type']),
            faqCount: contract.faq.length,
            offerCount: offers.length,
            breadcrumbCount: nodesByType('BreadcrumbList').length
          },
          discovery: {
            menuLinks: contract.menuLinks,
            sitemap: true,
            retrievalBotsExplicitlyBlocked: false
          }
        },
        null,
        2
      )
    )
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
