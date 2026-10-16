/**
 * Local preview of the compiled HubSpot v2 modules (no WordPress): fills each template with its schema defaults,
 * the way EO_Hubspot_V2_Landing_Base_Widget::render_module does, and writes tmp/hubspot-v2-preview/index.html.
 * The Growth Form is a placeholder box here; the real renderer only exists on the live site.
 */
const fs = require('node:fs')
const path = require('node:path')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets')
const dir = path.join(plugin, 'includes/hubspot-v2')
const img = 'file://' + path.join(plugin, 'assets/img/hubspot-v2') + '/'
const order = ['hero', 'marquesina', 'numeros', 'punto', 'diferencia', 'resultados', 'riesgo', 'agentes', 'metodo', 'seguridad', 'caso', 'partner', 'preguntas', 'agenda']
const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const asset = u => (u || '').startsWith('@hubspotv2/') ? img + u.slice(11) : u

const value = (f, v) => ['media', 'video', 'url'].includes(f.type) ? esc(asset(v && typeof v === 'object' ? v.url : v)) : esc(v ?? '')

const fill = (file, fields, values, extra = {}) => {
  let html = fs.readFileSync(path.join(dir, 'templates', file), 'utf8')
  const map = { '%%instance%%': 'p', '%%asset_base%%': img, ...extra }

  for (const f of fields) map['%%' + f.key + '%%'] = value(f, values[f.key])
  for (const [k, v] of Object.entries(map)) html = html.split(k).join(v)

  return html
}

let out = ''

for (const m of order) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, 'schemas', m + '.json'), 'utf8'))
  let html = fill(m + '.html', d.fields, d.defaults)

  html = html.replace('%%growth_form%%', '<div style="height:520px;border:2px dashed #8e1b82;border-radius:16px;display:grid;place-items:center;color:#8e1b82">Growth Form efeonce-hubspot-scope</div>')
  for (const g of d.repeaters) {
    const rows = g.defaults.map((row, i) => fill(g.variants[row._layout].templates.item, g.fields, { ...g.defaults[0], ...row }, { '%%row_first%%': i === 0 ? 'true' : 'false' }).replace('data-gh-open="true"', 'open data-gh-open="true"')).join('')

    html = html.replace('%%repeat_' + g.key + '%%', rows)
  }
  if (/%%[a-z0-9_]+%%/.test(html)) throw new Error('Unfilled token in ' + m + ': ' + html.match(/%%[a-z0-9_]+%%/)[0])
  out += `<div class="gh-hsv2 gh-hsv2-module gh-hsv2-module--${m}" data-motion="yes">${html}</div>\n`
}

const page = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Poppins:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap">
<link rel="stylesheet" href="file://${path.join(plugin, 'assets/css/hubspot-v2-landing.css')}">
<style>body{margin:0;background:#001a33}</style></head><body>${out}</body></html>`
const target = path.resolve('tmp/hubspot-v2-preview/index.html')

fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, page)
console.log(target)
