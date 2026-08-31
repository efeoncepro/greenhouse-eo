/** Approved Claude Design -> semantic Elementor widgets. Build-time only; no DC/React/eval in WordPress. */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')

const cheerio = require('cheerio')
const postcss = require('postcss')




















const sourceDir = path.resolve('tmp/content-marketing-source'),
  target = '/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets'

const source = fs.readFileSync(path.join(sourceDir, 'Landing Content Marketing v2.dc.html'), 'utf8')
const sha = crypto.createHash('sha256').update(source).digest('hex')

const $ = cheerio.load(
  source,
  { xml: { xmlMode: false, decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true } },
  false
)

const names = {
  hero: 'Hero · Una idea',
  proof: 'Operación visible · Principios',
  problem: 'El punto de partida',
  system: 'Sistema · Siete pasos',
  atomization: 'Atomización · Cinco formatos',
  hub: 'Content Hub · Operación visible',
  review: 'Revisión creativa · Versiones',
  editorial: 'Blog y operación CMS',
  modes: 'Modos de colaboración',
  ecosystem: 'Servicios conectados',
  business: 'El caso para tu CMO',
  faq: 'Preguntas frecuentes',
  conversion: 'Conversación · Formulario'
}

const keys = Object.keys(names),
  output = []

const emit = (p, v) => {
  const f = path.join(target, p)

  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, v)
  output.push(p)
}

// Only replace the mock capture surface, never preserve mock-success code in production.
const conv = $('#content-marketing-conversion')
const formIf = conv.find('sc-if[value="{{ formOpen }}"]')
const card = formIf.children().first()

card.attr('data-cm-form-card', '').html('<div data-cm-form-host></div>')
formIf.replaceWith(card)
conv.find('sc-if[value="{{ formSent }}"],sc-if[value="{{ isScheduler }}"]').remove()
const bodyNodes = $('main').children('section').toArray()

if (bodyNodes.length !== 13) throw Error('Source section inventory drift: ' + bodyNodes.length)
let logic = source.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]

logic = logic
  .replace(/  submit\(ev\) \{[\s\S]*?\n  chapterBtn\(/, '  chapterBtn(')
  .replace(/  nextStep\(\) \{[\s\S]*?\n  copyMemo\(/, '  copyMemo(')
logic = logic.replace('const top = el.offsetTop - h', 'const top = el.getBoundingClientRect().top + window.scrollY - h')
logic = logic.replace(
  "document.querySelector('header')",
  "document.querySelector('#masthead') || document.querySelector('header')"
)
// Reduced motion/editor are handled by the host; preserve source rendering and event methods.
logic = logic.replace(
  'const pinned = !this.reduce && window.innerWidth >= 940;',
  "const pinned = this.module === 'system' && !this.reduce && window.innerWidth >= 940;"
)
logic = logic.replace(
  'const p = !this.reduce && window.innerWidth >= 940;',
  "const p = this.module === 'system' && !this.reduce && window.innerWidth >= 940;"
)
logic = logic.replace('if (!this.reduce) this._word', "if (!this.reduce && this.module === 'hero') this._word")
logic = logic.replace(
  'this.reduce = !!(window.matchMedia',
  'this.reduce = this.editor || this.motion === false || !!(window.matchMedia'
)
logic = logic.replace("document.querySelectorAll('[data-reveal]')", "this.root.querySelectorAll('[data-reveal]')")
logic = logic.replace(
  "document.getElementById('content-system-stage')",
  "this.root.querySelector('#content-system-stage')"
)
logic = logic.replace('window.innerWidth >= 940', 'window.innerWidth >= 940 && window.innerHeight >= 740')
logic = logic.replace(
  'if (this._io) this._io.disconnect();',
  'if (this._io) this._io.disconnect();\n    if (this._revVideo) this._revVideo.pause();'
)
// No fake network success even as unreachable source methods.
if (logic.includes('setTimeout(() => this.setState({ sending:false, sent:true })')) throw Error('Mock capture leaked')

const context = vm.createContext({
  setTimeout: () => 0,
  clearTimeout() {},
  setInterval: () => 0,
  clearInterval() {},
  document: { querySelector: () => null, getElementById: () => null },
  window: { scrollTo() {}, scrollY: 0 },
  navigator: {}
})

vm.runInContext(
  'class DCLogic { props={}; setState(v,cb){this.state={...this.state,...(typeof v==="function"?v(this.state):v)};if(cb)cb();} }\n' +
    logic +
    '\nglobalThis.component=new Component();globalThis.formats=FORMATS.map(x=>x.id);globalThis.hubrows=HUB_ROWS.map(x=>x.id);globalThis.reviews=REVIEW;',
  context
)
const component = context.component

const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const cssStyle = o =>
  typeof o === 'object'
    ? Object.entries(o)
        .map(
          ([k, v]) =>
            k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) +
            ':' +
            (typeof v === 'number' &&
            v !== 0 &&
            !/^(opacity|zIndex|flex|flexGrow|flexShrink|fontWeight|lineHeight|order|scale)$/.test(k)
              ? v + 'px'
              : v)
        )
        .join(';')
    : String(o || '')

const routeMap = {
  '/servicios/seo/': '/servicios/posicionamiento-seo/',
  '/servicios/aeo/': '/aeo-2/',
  '/servicios/agencia-creativa/': '/agencia-creativa-v2/',
  '/servicios/inbound-marketing/': '/agencia-inbound-marketing/',
  '/servicios/influencer-marketing/': '/servicios/agencia-de-influencers/'
}

const styleRules = []
let styleSerial = 0

function expr(s) {
  const parts = []
  let end = 0

  for (const m of String(s).matchAll(/{{\s*([\s\S]*?)\s*}}/g)) {
    if (m.index > end) parts.push(JSON.stringify(s.slice(end, m.index)))
    parts.push('(' + m[1] + ')')
    end = m.index + m[0].length
  }

  if (end < s.length) parts.push(JSON.stringify(s.slice(end)))
  
return parts.length ? parts.join('+') : JSON.stringify(s)
}

function compile(n) {
  if (n.type === 'text') return 'T(' + expr(n.data) + ')'
  if (n.type !== 'tag') return 'null'

  const a = { ...n.attribs },
    children = () => '[' + (n.children || []).map(compile).join(',') + ']'

  if (n.tagName === 'sc-for')
    return '(' + a.list.replace(/{{|}}/g, '') + ').map((' + a.as + ',$index)=>' + children() + ')'
  if (n.tagName === 'sc-if') return '(' + a.value.replace(/{{|}}/g, '') + ')?' + children() + ':null'
  if (n.tagName === 'x-import') throw Error('Design component not migrated: ' + a['component-from-global-scope'])
  const hover = a['style-hover']

  if (hover) {
    const cls = 'cm-hover-' + ++styleSerial

    a.class = (a.class || '') + ' ' + cls
    styleRules.push('.gh-content-module .' + cls + ':is(:hover,:focus-visible){' + hover + '}')
  }

  for (const k of Object.keys(a))
    if (k.startsWith('style-') || k.startsWith('hint-') || k === 'data-screen-label' || k === 'ref') delete a[k]
  if (n.tagName === 'a') a.class = (a.class || '') + ' -undash'
  const attrs = Object.entries(a).map(([k, v]) => JSON.stringify(k) + ':' + expr(v))

  
return 'H(' + JSON.stringify(n.tagName) + ',{' + attrs.join(',') + '},' + children() + ')'
}

function flatten(a) {
  return a.flat(Infinity).filter(v => v !== null && v !== undefined && v !== false)
}

const h = (tag, attrs, children) => ({ tag, attrs, children: flatten(children) }),
  t = v => String(v ?? '')

const voids = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source'])
const modules = {}

for (let index = 0; index < bodyNodes.length; index++) {
  const key = keys[index],
    node = bodyNodes[index]

  node.attribs['data-capture'] = 'cm-' + key

  const code = compile(node),
    render = Function('v', 'H', 'T', 'with(v){return ' + code + '}')

  const schema = {
    schema: 'contentMarketingModule.v1',
    module: key,
    title: names[key],
    sourceSha256: sha,
    scheme: ['hero', 'system', 'modes', 'business', 'conversion'].includes(key) ? 'dark' : 'light',
    fields: [],
    defaults: {},
    repeaters: []
  }

  const map = new Map()

  function field(type, value, label) {
    if (!value || !String(value).trim()) return value
    const id = type + '|' + value

    if (!map.has(id)) {
      const key = 'content_' + String(map.size + 1).padStart(3, '0')

      map.set(id, key)
      schema.fields.push({
        key,
        type,
        label:
          (label || { text: 'Texto', textarea: 'Descripción', media: 'Imagen', url: 'Destino', icon: 'Icono' }[type]) +
          ' · ' +
          String(value).replace(/\s+/g, ' ').trim().slice(0, 60),
        sourceValue: value
      })
      schema.defaults[key] = ['media', 'url'].includes(type) ? { url: value, id: 0 } : value
    }

    
return '%%' + map.get(id) + '%%'
  }

  const fixURL = v => routeMap[v] || v

  function serialize(tree, collect = true) {
    if (typeof tree === 'string') {
      const value = tree

      
return esc(collect ? field(value.trim().length > 110 ? 'textarea' : 'text', value) : value)
    }

    if (!tree) return ''
    let attrs = ''

    for (let [k, v] of Object.entries(tree.attrs)) {
      if (/^on/.test(k) || k === 'ref' || v === false || v == null) continue
      if (k === 'style') {
        v = cssStyle(v)
        v = v.replace(/url\(["']?(assets\/[\w/.-]+)["']?\)/g, (_, u) => 'url(' + field('media', u) + ')')
      } else if (['src', 'poster'].includes(k)) v = field('media', v)
      else if (k === 'href') v = field('url', fixURL(v))
      else if (['alt', 'aria-label', 'title'].includes(k)) v = field('text', v, 'Nombre accesible')
      else if (k === 'class' && /^ti ti-/.test(v)) v = field('icon', v)
      k = k.toLowerCase()
      attrs += ' ' + k + '="' + esc(v === true ? '' : v) + '"'
    }

    
return (
      '<' +
      tree.tag +
      attrs +
      '>' +
      (voids.has(tree.tag) ? '' : tree.children.map(c => serialize(c, collect)).join('') + '</' + tree.tag + '>')
    )
  }

  const initial = component.state
  const variants = [{}]

  if (key === 'hero') for (let word = 0; word < 5; word++) variants.push({ word })
  if (key === 'system') for (let chapter = 0; chapter < 7; chapter++) variants.push({ chapter, pinned: true })
  if (key === 'atomization')
    for (const format of context.formats)
      for (let slide = 0; slide < 4; slide++) variants.push({ format, slide, crop: 'ambos' })
  if (key === 'atomization') for (const crop of ['recorte', 'adaptado', 'ambos']) variants.push({ crop })
  if (key === 'hub')
    for (const hubView of ['tabla', 'tablero', 'calendario'])
      for (const hubRow of context.hubrows) variants.push({ hubView, hubRow })
  if (key === 'review')
    for (const rev of context.reviews)
      for (let revComment = 0; revComment < rev.comments.length; revComment++)
        variants.push({ revVersion: rev.id, revComment })
  if (key === 'modes') for (let mode = 0; mode < 3; mode++) variants.push({ mode, modeTouched: true })
  if (key === 'business') variants.push({ memoCopied: true })
  let initialHTML

  for (const state of variants) {
    component.state = { ...initial, ...state }
    const html = serialize(render(component.renderVals(), h, t))

    if (!initialHTML) initialHTML = html
  }

  component.state = initial
  if (key === 'editorial') initialHTML = require('./content-marketing-cms-logos.cjs').apply(schema, initialHTML)
  emit('includes/content-marketing/schemas/' + key + '.json', JSON.stringify(schema, null, 2) + '\n')
  emit('includes/content-marketing/templates/' + key + '.html', initialHTML)
  modules[key] = { code, schema }
}

const ds = path.join(sourceDir, '_ds', fs.readdirSync(path.join(sourceDir, '_ds'))[0], 'tokens')
let css =
  ['fonts', 'colors', 'typography', 'spacing'].map(k => fs.readFileSync(path.join(ds, k + '.css'), 'utf8')).join('\n') +
  source.match(/<style>([\s\S]*?)<\/style>/)[1]
const ast = postcss.parse(css)

ast.walkAtRules('import', r => r.remove())
ast.walkRules(r => {
  r.selectors = r.selectors.map(s => {
    s = s.replace(/:root|\bbody\b|\bhtml\b/g, '.gh-content-module')
    
return s.startsWith('.gh-content-module') ? s : '.gh-content-module ' + s
  })
})
emit('assets/css/content-marketing.css', ast.toString() + '\n' + styleRules.join('\n'))
for (const dir of ['aro', 'logos'])
  for (const f of fs.readdirSync(path.join(sourceDir, 'assets', dir)))
    emit('assets/img/content-marketing/' + dir + '/' + f, fs.readFileSync(path.join(sourceDir, 'assets', dir, f)))
// Keep approved source version and digest in the runtime, not an executable editor mock.
emit(
  'includes/content-marketing/source-manifest.json',
  JSON.stringify(
    {
      source: 'Landing Content Marketing v2.dc.html',
      sha256: sha,
      modules: keys,
      exceptions: [
        'Native Ohio header and footer',
        'Canonical Growth Forms capture',
        'Verified service destinations',
        'Scoped stylesheet and lifecycle cleanup'
      ]
    },
    null,
    2
  )
)

const rendererCode = Object.entries(modules)
  .map(
    ([k, m]) =>
      JSON.stringify(k) +
      ':(v,H,T)=>{const {' +
      Object.keys(component.renderVals()).join(',') +
      '}=v;return ' +
      m.code +
      '}'
  )
  .join(',\n')

fs.mkdirSync('tmp/content-marketing-build', { recursive: true })
fs.writeFileSync('tmp/content-marketing-build/logic.js', logic)
fs.writeFileSync('tmp/content-marketing-build/renderers.js', 'const renderers={' + rendererCode + '};\n')
fs.writeFileSync('tmp/content-marketing-build/modules.json', JSON.stringify(keys))
console.log(
  JSON.stringify({
    sourceSha256: sha,
    modules: keys,
    fields: Object.fromEntries(Object.entries(modules).map(([k, v]) => [k, v.schema.fields.length])),
    files: output.length
  })
)
