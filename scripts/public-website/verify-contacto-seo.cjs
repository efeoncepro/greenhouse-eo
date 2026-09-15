/** Verify live Contacto metadata and Yoast schema from the rendered public document. */
const assert = require('node:assert/strict')

async function main() {
  const response = await fetch('https://efeoncepro.com/contacto/')

  assert.equal(response.status, 200)
  const html = await response.text()

  const metas = [...html.matchAll(/<meta\s+[^>]*>/gi)].map(match =>
    Object.fromEntries([...match[0].matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map(attribute => [attribute[1], attribute[2]]))
  )

  const content = (property, kind = 'property') => metas.find(meta => meta[kind] === property)?.content
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1]
  const jsonLd = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]

  assert.ok(jsonLd)
  const schema = JSON.parse(jsonLd)

  assert.equal(title, 'Contacto Efeonce | Escríbenos o agenda una reunión')
  assert.equal(canonical, 'https://efeoncepro.com/contacto/')
  const robots = new Set(content('robots', 'name').split(',').map(value => value.trim()))

  for (const directive of ['index', 'follow', 'max-snippet:-1', 'max-image-preview:large', 'max-video-preview:-1']) {
    assert.ok(robots.has(directive), `Missing robots directive: ${directive}`)
  }

  assert.equal(content('og:type'), 'website')
  assert.equal(content('twitter:card', 'name'), 'summary_large_image')
  assert.match(content('og:image'), /efeonce-contacto-og-1200x630/)
  assert.equal(content('og:image:width'), '1200')
  assert.equal(content('og:image:height'), '630')

  const graph = schema['@graph']
  const contact = graph.find(node => [].concat(node['@type'] || []).includes('ContactPage'))
  const organization = graph.find(node => [].concat(node['@type'] || []).includes('Organization'))
  const faq = graph.find(node => [].concat(node['@type'] || []).includes('FAQPage'))
  const image = graph.find(node => [].concat(node['@type'] || []).includes('ImageObject') && node['@id'] === contact.primaryImageOfPage['@id'])

  assert.ok(contact)
  assert.equal(contact.about['@id'], organization['@id'])
  assert.equal(contact.hasPart['@id'], faq['@id'])
  assert.equal(organization.email, 'hola@efeoncepro.com')
  assert.equal(organization.address.addressLocality, 'Providencia')
  assert.equal(organization.contactPoint.length, 3)
  assert.equal(faq.mainEntity.length, 4)
  assert.equal(image.width, 1200)
  assert.equal(image.height, 630)
  assert.match(image.contentUrl || image.url, /efeonce-contacto-og-1200x630/)
  assert.doesNotMatch(html, /contacto-careers-cap\.png[^"']*"[^>]*(?:property|name)="(?:og:image|twitter:image)"/)
  console.log(JSON.stringify({ status: 'pass', title, ogType: content('og:type'), image: content('og:image'), schemaTypes: graph.map(node => node['@type']) }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
