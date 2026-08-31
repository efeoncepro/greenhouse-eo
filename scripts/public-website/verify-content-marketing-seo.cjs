/** Anonymous production readback: DOM, metadata, graph, image, links and sitemap. */
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { JSDOM } = require('jsdom')
;(async () => {
  const url = 'https://efeoncepro.com/servicio-marketing-de-contenidos/'
  const response = await fetch(url)
  assert.equal(response.status, 200)
  const html = await response.text(),
    d = new JSDOM(html, { url }).window.document
  const meta = selector => {
    const n = d.querySelectorAll(selector)
    assert.equal(n.length, 1, selector)
    return n[0].content
  }
  assert.equal(d.title, 'Agencia de Content Marketing y Content Ops | Efeonce')
  assert.equal(d.querySelectorAll('h1').length, 1)
  assert.equal(d.querySelectorAll('[data-content-module]').length, 13)
  assert.equal(d.querySelectorAll('#faq details').length, 8)
  assert.equal(d.querySelector('link[rel=canonical]').href, url)
  const description = meta('meta[name=description]'),
    robots = meta('meta[name=robots]')
  assert(!/noindex|nofollow|nosnippet/.test(robots))
  assert(!/noindex/.test(response.headers.get('x-robots-tag') || ''))
  assert.equal(meta('meta[property="og:description"]'), description)
  assert.equal(meta('meta[name="twitter:description"]'), description)
  assert.equal(meta('meta[property="og:type"]'), 'website')
  const image = meta('meta[property="og:image"]')
  assert.equal((await fetch(image, { method: 'HEAD' })).status, 200)
  const graph = [...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(s => {
    const x = JSON.parse(s.textContent)
    return x['@graph'] || [x]
  })
  const typed = t => graph.filter(n => [n['@type']].flat().includes(t))
  for (const type of ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList', 'Service'])
    assert.equal(typed(type).length, 1, type)
  assert.equal(typed('Service')[0].provider['@id'], typed('Organization')[0]['@id'])
  assert.equal(typed('WebPage')[0].mainEntity['@id'], typed('Service')[0]['@id'])
  const ids = graph.map(x => x['@id']).filter(Boolean)
  assert.equal(new Set(ids).size, ids.length)
  const links = [
    ...new Set(
      [...d.querySelectorAll('[data-content-module] a[href]')]
        .map(a => a.href)
        .filter(u => u.startsWith('https://efeoncepro.com/') && !u.includes('#'))
    )
  ]
  const results = await Promise.all(
    links.map(async u => {
      const r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(25000) })
      assert(r.status < 400, u)
      return { url: u, status: r.status }
    })
  )
  const index = await (await fetch('https://efeoncepro.com/sitemap_index.xml')).text()
  const maps = [...index.matchAll(/<loc>([^<]*page-sitemap[^<]*)<\/loc>/g)].map(x => x[1])
  let listed = false
  for (const map of maps) {
    const xml = await (await fetch(map)).text()
    if (xml.includes('<loc>' + url + '</loc>')) listed = true
  }
  assert(listed, 'Page absent from page sitemap')
  const report = {
    url,
    status: response.status,
    title: d.title,
    description,
    robots,
    image,
    types: graph.map(n => n['@type']),
    links: results,
    sitemap: true,
    initialHtml: true
  }
  fs.mkdirSync('.captures/content-marketing', { recursive: true })
  fs.writeFileSync('.captures/content-marketing/seo.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
})().catch(e => {
  console.error(e)
  process.exit(1)
})
