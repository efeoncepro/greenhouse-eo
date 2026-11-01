/**
 * TASK-2051 — Local preview of the blog home v3 inside the real site shell. Read-only: no CMS writer, no form
 * submissions, no analytics.
 *
 * Takes a live page that already carries the canonical header and footer (default /agenda/, full-width Ohio
 * container), replaces its Elementor body with the eo-blog-home server render (PHP CLI, same code as WordPress) and
 * serves the plugin assets locally. Public static files of the live site are proxied with GET only.
 *
 *   node preview/serve.cjs [--port 8843] [--shell https://efeoncepro.com/agenda/] [--now <ms>] [--subscribe <formKey>] [--event-form <formKey>] [--rail <file.json>]
 *
 * --rail replaces the rail cards of both boards with a JSON file in the adapter's contract ({ portada, movil }): try a
 * card's own image or focal point before writing it in WordPress.
 *
 * --subscribe (Glitch) and --event-form (the event's reservation) connect real published forms: the published Growth Form is read from Greenhouse through a
 * local GET-only proxy (/__ghf/, sent with the site origin), so the renderer works without CORS and nothing can be
 * submitted (the preview refuses every write).
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const cheerio = require('cheerio')

const { RUNTIME_DIR } = require('../lib/render-node.cjs')

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name)

  return i >= 0 ? process.argv[i + 1] : fallback
}

const PORT = Number(arg('port', 8843))
const SHELL_URL = arg('shell', 'https://efeoncepro.com/agenda/')
const NOW = arg('now', '')
const SUBSCRIBE = arg('subscribe', '')
const EVENT_FORM = arg('event-form', '')
const RAIL = arg('rail', '')

if (RAIL) process.env.EOBH_PREVIEW_RAIL = path.resolve(RAIL)
const PROXY = Boolean(SUBSCRIBE || EVENT_FORM)
const PLUGIN = path.join(RUNTIME_DIR, 'wp-content/plugins/eo-blog-home')
const LOCAL = '/wp-content/plugins/eo-blog-home/'
const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' }

// Writes and beacons are refused in the page itself; the server only answers GET/HEAD.
const GUARD = `window.__previewWrites=[];var __f=window.fetch.bind(window);window.fetch=function(i,o){o=o||{};var m=(o.method||(i&&i.method)||'GET').toUpperCase();if(['GET','HEAD','OPTIONS'].indexOf(m)<0){window.__previewWrites.push(m);return Promise.reject(new Error('Preview: writes disabled'))}return __f(i,o)};document.addEventListener('submit',function(e){e.preventDefault()},true);navigator.sendBeacon=function(){return false};`

let shell = null
const cache = new Map()

async function page() {
  if (!shell) shell = await (await fetch(SHELL_URL)).text()

  const $ = cheerio.load(shell)
  const body = $('main#main [data-elementor-type="wp-page"]')

  if (body.length !== 1) throw new Error('Shell without a single Elementor page body: ' + SHELL_URL)

  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'assets/generated/manifest.json'), 'utf8'))

  const env = PROXY
    ? {
        ...process.env,
        EOBH_PREVIEW_SUBSCRIBE_KEY: SUBSCRIBE,
        EOBH_PREVIEW_SUBSCRIBE_SURFACE: 'fhsf-efeonce-blog-subscription',
        EOBH_PREVIEW_EVENT_FORM_KEY: EVENT_FORM,
        EOBH_PREVIEW_EVENT_FORM_SURFACE: 'fhsf-efeonce-blog-events',
        EOBH_PREVIEW_SUBSCRIBE_BASE: `http://127.0.0.1:${PORT}/__ghf`
      }
    : process.env

  const markup = execFileSync('php', [path.join(__dirname, '../fidelity/php-page.php'), PLUGIN, LOCAL + 'assets/img', ...(NOW ? [NOW] : [])], { encoding: 'utf8', maxBuffer: 64 << 20, env })

  body.replaceWith(markup)
  $('script').each((_, e) => {
    const src = $(e).attr('src') || ''
    const text = $(e).text()

    if (/googletagmanager|hs-scripts|hsEmbed|send-app|site_tracking|stats\.wp|googlesitekit|consent-bridge|consent-ui|akismet|contact-form-7|clarity|hotjar/.test(src) || /gtag\(|gtm\.start|_hsq|hsFormsOnReady/.test(text)) $(e).remove()
  })
  $('noscript').remove()
  $('head').prepend(`<script>${GUARD}</script>`)
  // Same assets and media queries as EOBH_Front::enqueue().
  const media = { portada: '(min-width: 1100px)', tablet: '(min-width: 768px) and (max-width: 1099.98px)', movil: '(max-width: 767.98px)' }

  $('head').append(
    `<link rel="stylesheet" href="${manifest.fonts}"><link rel="stylesheet" href="${LOCAL}assets/generated/blog-home-base.css">` +
      Object.entries(media).map(([b, m]) => `<link rel="stylesheet" href="${LOCAL}assets/generated/${b}.css" media="${m}">`).join('') +
      `<link rel="stylesheet" href="${LOCAL}assets/css/eobh-host.css">`
  )
  $('body').append(
    `<script defer src="${LOCAL}assets/js/dc-runtime.js"></script><script>window.EoBlogV3Src=${JSON.stringify(Object.fromEntries(Object.keys(media).map(b => [b, LOCAL + 'assets/generated/' + b + '.js'])))}</script><script defer src="${LOCAL}assets/js/boot.js"></script>`
  )
  if (PROXY) $('body').append(`<script defer src="/__ghf/growth-forms/renderer-latest.js"></script>`)
  $('title').text('Blog — preview local TASK-2051')

  return $.html()
}

http
  .createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) return res.writeHead(405).end('Preview: writes disabled')

      const url = new URL(req.url, `http://127.0.0.1:${PORT}`)

      if (url.pathname === '/' || url.pathname === '/blog/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })

        return res.end(await page())
      }

      // --subscribe: GET-only proxy to Greenhouse (renderer bundle + public form contract), sent with the site origin.
      if (PROXY && url.pathname.startsWith('/__ghf/')) {
        const target = 'https://greenhouse.efeoncepro.com' + url.pathname.slice('/__ghf'.length) + url.search
        const upstream = await fetch(target, { headers: { origin: 'https://efeoncepro.com', accept: req.headers.accept || '*/*' } })

        res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'no-store' })

        return res.end(Buffer.from(await upstream.arrayBuffer()))
      }

      if (url.pathname.startsWith(LOCAL)) {
        const rel = path.normalize(url.pathname.slice(LOCAL.length))

        if (rel.startsWith('..') || !/^assets\//.test(rel)) return res.writeHead(400).end()
        const file = path.join(PLUGIN, rel)

        if (!fs.existsSync(file)) return res.writeHead(404).end()
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })

        return res.end(fs.readFileSync(file))
      }

      // Public static files of the live site only; never APIs or other hosts.
      if (/^\/(wp-content|wp-includes)\/.*\.(woff2?|ttf|css|js|svg|png|jpe?g|webp|gif)$/.test(url.pathname)) {
        if (!cache.has(url.pathname)) {
          const up = await fetch('https://efeoncepro.com' + url.pathname)

          if (!up.ok) return res.writeHead(up.status).end()
          cache.set(url.pathname, { body: Buffer.from(await up.arrayBuffer()), type: up.headers.get('content-type') || 'application/octet-stream' })
        }

        const a = cache.get(url.pathname)

        res.writeHead(200, { 'content-type': a.type })

        return res.end(a.body)
      }

      res.writeHead(404).end('Not part of the local preview')
    } catch (e) {
      res.writeHead(500).end(String(e && e.stack))
    }
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${PORT}/blog/  (shell ${SHELL_URL})`))
