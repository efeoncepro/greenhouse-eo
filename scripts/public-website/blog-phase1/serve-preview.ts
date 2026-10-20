/** Local-only WordPress shell preview; no CMS writer, analytics or form submissions. */
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, basename, extname } from 'node:path'

import { load } from 'cheerio'

async function main() {
  const runtime = resolve(process.env.BLOG_RUNTIME_DIR || '../efeonce-public-site-runtime-develop')
  const plugin = resolve(runtime, 'wp-content/plugins/eo-elementor-widgets')
  const out = resolve('.captures/2026-10-20-blog-option2')
  const port = 8842
  const contract = readFileSync('.captures/2026-10-20-blog-growth-form/render-contract.preview.json', 'utf8')
  const shell = await (await fetch('https://efeoncepro.com/blog/')).text()

  mkdirSync(out, { recursive: true })
  writeFileSync(resolve(out, 'shell-source.html'), shell)
  const cache = new Map<string, { body: Buffer; type: string }>()

  const guard = `
window.__previewWrites=[];
localStorage.removeItem(${JSON.stringify('ghf-draft:' + JSON.parse(contract).form.slug + ':' + JSON.parse(contract).form.formVersionId)});
const originalFetch=window.fetch.bind(window);
window.fetch=(input,init={})=>{const method=(init.method||input?.method||'GET').toUpperCase();if(!['GET','HEAD','OPTIONS'].includes(method)){window.__previewWrites.push(method);return Promise.reject(new Error('Preview: writes disabled'));}return originalFetch(input,init)};
document.addEventListener('submit',e=>e.preventDefault(),true);
navigator.sendBeacon=()=>false;
`

  function page() {
    const $ = load(shell)

    if ($('[data-elementor-id="18456"]').length !== 1) throw new Error('Wrong blog shell')
    $('[data-elementor-id="18456"]').replaceWith(
      execFileSync('php', [resolve(runtime, 'tests/blog-phase1.test.php'), 'render'], { encoding: 'utf8' })
    )
    // No analytics scripts in the local preview. Theme/Elementor scripts retain the actual shell.
    $('script').each((_, e) => {
      const src = $(e).attr('src') || ''
      const text = $(e).text()

      if (
        /googletagmanager|hs-scripts|hsEmbed|send-app|site_tracking|stats.wp|googlesitekit|consent-bridge|consent-ui|akismet|contact-form-7/.test(
          src
        ) ||
        /gtag\(|gtm\.start|_hsq|hsFormsOnReady/.test(text)
      )
        $(e).remove()
    })
    $('noscript').remove()
    $('head').prepend('<script>' + guard + '</script>')
    $('head').append(
      '<style>' +
        ['blog-phase1.css', 'blog-subscription.css']
          .map(f => readFileSync(resolve(plugin, 'assets/css', f), 'utf8'))
          .join('\n') +
        '</style>'
    )
    $('greenhouse-form').attr('base-url', `http://127.0.0.1:${port}`)
    $('body').append('<script src="https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js"></script>')
    // Only the new local assets are redirected. Published images and shell styles keep their origin.
    $('[src]').each((_, e) => {
      const src = $(e).attr('src') || ''

      if (src.includes('/eo-elementor-widgets/assets/img/blog/')) $(e).attr('src', '/blog-assets/' + basename(src))
    })

    return $.html()
  }

  createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method || '')) {
        res.writeHead(405)

        return res.end('Preview: writes disabled')
      }

      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`)

      if (url.pathname === '/' || url.pathname === '/blog/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader(
          'Content-Security-Policy',
          "connect-src 'self'; form-action 'none'; frame-src 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' https://efeoncepro.com https://greenhouse.efeoncepro.com; img-src 'self' data: https://efeoncepro.com https://secure.gravatar.com; font-src 'self' data: https://efeoncepro.com https://fonts.gstatic.com"
        )

        return res.end(page())
      }

      if (url.pathname.startsWith('/api/public/growth/forms/')) {
        res.setHeader('Content-Type', 'application/json')

        return res.end(contract)
      }

      if (
        url.pathname.startsWith('/blog-assets/') ||
        url.pathname.startsWith('/wp-content/plugins/eo-elementor-widgets/assets/img/blog/')
      ) {
        const file = basename(url.pathname)

        if (!/^[a-z0-9.-]+$/.test(file)) {
          res.writeHead(400)

          return res.end()
        }

        res.setHeader('Content-Type', extname(file) === '.svg' ? 'image/svg+xml' : 'image/webp')

        return res.end(readFileSync(resolve(plugin, 'assets/img/blog', file)))
      }

      // Public static files only; never proxy APIs or arbitrary hosts.
      if (/^\/(wp-content|wp-includes)\/.*\.(woff2?|css|js|svg|png|jpg|webp|gif)$/.test(url.pathname)) {
        if (!cache.has(url.pathname)) {
          const upstream = await fetch('https://efeoncepro.com' + url.pathname)

          if (!upstream.ok) {
            res.writeHead(upstream.status)

            return res.end()
          }

          cache.set(url.pathname, {
            body: Buffer.from(await upstream.arrayBuffer()),
            type: upstream.headers.get('content-type') || 'application/octet-stream'
          })
        }

        const asset = cache.get(url.pathname)!

        res.setHeader('Content-Type', asset.type)

        return res.end(asset.body)
      }

      res.writeHead(404)
      res.end('Not part of the local preview')
    } catch (e) {
      res.writeHead(500)
      res.end(String(e))
    }
  }).listen(port, '127.0.0.1', () => console.log(`Local preview ready: http://127.0.0.1:${port}/blog/`))
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
