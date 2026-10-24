/**
 * TASK-2055 — Local preview of the «Archivo del blog» inside the real site shell. Read-only.
 *
 * Takes the live /blog/ page (canonical header and footer, and the same wrappers eo-blog-home's archive template opens:
 * page-container -full-w › primary › page-content › main#main), replaces the content of main#main with the archive
 * server render (PHP CLI, same code as WordPress) for one view's approved example content, applies the archive's body
 * classes and serves the plugin assets locally. Public static files of the live site are proxied with GET only.
 *
 *   node preview/serve.cjs [--port 8845] [--shell https://efeoncepro.com/blog/]
 *   → http://127.0.0.1:8845/<tema|etiqueta|autor|busqueda|tema-vacio|busqueda-vacia>/
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const cheerio = require('cheerio')

const { RUNTIME_DIR } = require('../../blog-v3/lib/render-node.cjs')

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name)

  return i >= 0 ? process.argv[i + 1] : fallback
}

const PORT = Number(arg('port', 8845))
const SHELL_URL = arg('shell', 'https://efeoncepro.com/blog/')
const PLUGIN = path.join(RUNTIME_DIR, 'wp-content/plugins/eo-blog-home')
const LOCAL = '/wp-content/plugins/eo-blog-home/'
const VIEWS = ['tema', 'etiqueta', 'autor', 'busqueda', 'tema-vacio', 'busqueda-vacia']
const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' }
// Same as EOBH_Archive::body_class(): Ohio's demo chrome classes go, eoba-page comes.
const DROP = ['with-switcher', 'with-mobile-switcher', 'with-headline', 'with-breadcrumbs', 'custom-cursor', 'with-fixed-search']
const GUARD = `var __f=window.fetch.bind(window);window.fetch=function(i,o){o=o||{};var m=(o.method||(i&&i.method)||'GET').toUpperCase();if(['GET','HEAD','OPTIONS'].indexOf(m)<0){return Promise.reject(new Error('Preview: writes disabled'))}return __f(i,o)};document.addEventListener('submit',function(e){e.preventDefault()},true);navigator.sendBeacon=function(){return false};`

let shell = null
const cache = new Map()

async function page(view) {
  if (!shell) shell = await (await fetch(SHELL_URL)).text()

  const $ = cheerio.load(shell)
  const main = $('main#main')

  if (main.length !== 1) throw new Error('Shell without a single main#main: ' + SHELL_URL)
  const markup = execFileSync('php', [path.join(__dirname, '../fidelity/php-archive-page.php'), PLUGIN, LOCAL + 'assets/img', view], { encoding: 'utf8', maxBuffer: 64 << 20 })

  main.empty().append(markup)
  const body = $('body')
  const cls = (body.attr('class') || '').split(/\s+/).filter(c => c && !DROP.includes(c) && !/^(page|page-id-\d+|page-template.*)$/.test(c))

  body.attr('class', [...cls, 'eoba-page'].join(' '))
  $('script').each((_, e) => {
    const src = $(e).attr('src') || ''
    const text = $(e).text()

    if (/googletagmanager|hs-scripts|hsEmbed|send-app|site_tracking|stats\.wp|googlesitekit|consent-bridge|consent-ui|akismet|contact-form-7|clarity|hotjar|eo-blog-home/.test(src) || /gtag\(|gtm\.start|_hsq|hsFormsOnReady|EoBlogV3Src/.test(text)) $(e).remove()
  })
  $('link[href*="eo-blog-home"]').remove()
  $('noscript').remove()
  $('head').prepend(`<script>${GUARD}</script>`)
  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'assets/generated/archive-manifest.json'), 'utf8'))

  $('head').append(
    `<link rel="stylesheet" href="${manifest.fonts}"><link rel="stylesheet" href="${LOCAL}assets/generated/archive-base.css"><link rel="stylesheet" href="${LOCAL}assets/generated/archive.css"><link rel="stylesheet" href="${LOCAL}assets/css/eoba-host.css">`
  )
  $('title').text(`Archivo (${view}) — preview local TASK-2055`)

  return $.html()
}

http
  .createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) return res.writeHead(405).end('Preview: writes disabled')
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
      const view = url.pathname.replace(/^\/|\/$/g, '')

      if (VIEWS.includes(view)) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })

        return res.end(await page(view))
      }

      if (url.pathname.startsWith(LOCAL)) {
        const rel = path.normalize(url.pathname.slice(LOCAL.length))

        if (rel.startsWith('..') || !/^assets\//.test(rel)) return res.writeHead(400).end()
        const file = path.join(PLUGIN, rel)

        if (!fs.existsSync(file)) return res.writeHead(404).end()
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })

        return res.end(fs.readFileSync(file))
      }

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
  .listen(PORT, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${PORT}/<${VIEWS.join('|')}>/  (shell ${SHELL_URL})`))
