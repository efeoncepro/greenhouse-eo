/** Read-only checks against anonymous, server-rendered production HTML. No crawler impersonation. */

const root = 'https://efeoncepro.com/';

async function get(url, options = {}) {
  return fetch(url, { signal: AbortSignal.timeout(25000), ...options });
}

async function main() {
  const { default: assert } = await import('node:assert/strict');
  const { JSDOM } = await import('jsdom');
  const response = await get(root);

  assert.equal(response.status, 200);
  assert.equal(response.url, root);
  assert(!/noindex/i.test(response.headers.get('x-robots-tag') || ''));
  const html = await response.text();
  const d = new JSDOM(html).window.document;
  const content = d.querySelector('[data-elementor-id="251731"]');

  assert(content, 'Expected Home document');

  const meta = selector => {
    const matches = d.head.querySelectorAll(selector);

    assert.equal(matches.length, 1, selector);
    
return matches[0].getAttribute('content');
  };

  assert.equal(d.querySelectorAll('title').length, 1);
  assert.equal(d.head.querySelectorAll('link[rel="canonical"]').length, 1);
  assert.equal(d.head.querySelector('link[rel="canonical"]').href, root);
  const description = meta('meta[name="description"]');
  const robots = meta('meta[name="robots"]');

  assert(robots.split(/,\s*/).includes('index'));
  assert(robots.split(/,\s*/).includes('follow'));
  assert(!/noindex|nosnippet|nofollow/i.test(robots));
  assert.equal(content.querySelectorAll('h1').length, 1);
  assert(d.documentElement.lang.startsWith('es'));
  assert(d.title.includes('Efeonce') && /marketing digital/i.test(d.title));
  assert(description && description.length > 60);
  const ogTitle = meta('meta[property="og:title"]');

  assert.notEqual(ogTitle, 'Home');
  assert.equal(meta('meta[name="twitter:title"]'), ogTitle);
  assert.equal(meta('meta[property="og:description"]'), description);
  assert.equal(meta('meta[name="twitter:description"]'), description);
  assert.equal(meta('meta[property="og:url"]'), root);
  const image = meta('meta[property="og:image"]');

  assert(image.startsWith('https:'));
  const jsonld = [...d.querySelectorAll('script[type="application/ld+json"]')].map(x => JSON.parse(x.textContent));
  const graph = jsonld.flatMap(x => x['@graph'] || [x]);
  const ids = graph.map(x => x['@id']).filter(Boolean);

  assert.equal(ids.length, new Set(ids).size, 'Duplicate graph identifiers');
  const typed = type => graph.filter(x => [x['@type']].flat().includes(type));

  assert.equal(typed('WebPage').length, 1);
  assert.equal(typed('WebSite').length, 1);
  assert.equal(typed('Organization').length, 1);
  const page = typed('WebPage')[0], website = typed('WebSite')[0], organization = typed('Organization')[0];

  assert.equal(page.url, root);
  assert.equal(page.name, d.title);
  assert.equal(page.description, description);
  assert.equal(page.isPartOf['@id'], website['@id']);
  assert.equal(page.about['@id'], organization['@id']);
  assert.equal(website.publisher['@id'], organization['@id']);
  assert.equal(organization.url, root);
  assert(organization.logo.url.startsWith('https:'));

  for (const type of ['Review','AggregateRating','Product','VideoObject']) {
    assert.equal(typed(type).length, 0, 'Unexpected claim-bearing schema: ' + type);
  }

  const images = [...content.querySelectorAll('img')];

  assert(images.every(x => x.hasAttribute('alt')), 'Missing alt attributes');
  assert(images.every(x => !x.getAttribute('src')?.startsWith('http:')), 'Mixed-content image');

  for (const link of content.querySelectorAll('a[href^="#"]')) {
    assert(d.getElementById(link.getAttribute('href').slice(1)), 'Broken Home anchor');
  }

  const links = [...new Set([...content.querySelectorAll('a[href]')].map(x => x.href).filter(x => x.startsWith(root) && !x.includes('#')))];
  const media = [...new Set([image, organization.logo.url, ...images.map(x => x.src)])];
  const checked = [];

  for (const urls of [links, media]) {
    for (let i = 0; i < urls.length; i += 4) {
      await Promise.all(urls.slice(i, i + 4).map(async url => {
        const r = await get(url);

        assert.equal(r.status, 200, url);
        checked.push({ url, status: r.status });
        await r.body?.cancel();
      }));
    }
  }

  const sitemapResponse = await get(root + 'page-sitemap.xml');

  assert.equal(sitemapResponse.status, 200);
  const xml = new JSDOM(await sitemapResponse.text(), { contentType:'text/xml' }).window.document;
  const locations = [...xml.querySelectorAll('url > loc')].map(x => x.textContent);

  assert.equal(locations.filter(x => x === root).length, 1);
  assert(!locations.includes(root + 'home-2/'));
  const previous = await get(root + 'home-claude-design-preview/', { redirect:'manual' });

  assert.equal(previous.status, 301);
  assert.equal(previous.headers.get('location'), root);
  const old = new JSDOM(await (await get(root + 'home-2/')).text()).window.document;

  assert(/noindex/.test(old.querySelector('meta[name="robots"]').content));
  console.log(JSON.stringify({ status:'PASS', checkedAt:new Date().toISOString(), url:root,
    title:d.title, description, socialTitle:ogTitle, graphTypes:graph.map(x=>x['@type']),
    h1:content.querySelector('h1').textContent.trim().replace(/\s+/g,' '),
    faqCount:content.querySelectorAll('details').length, imageCount:images.length,
    checkedResources:checked.length, contentLinks:links,
    limits:['Not Search Console indexing proof','Not a Google rich-result eligibility test','Not field Core Web Vitals','Global Organization facts and theme footer need separate review']
  }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
