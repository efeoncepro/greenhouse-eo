/**
 * `pnpm public-website:site-nav` — governed editing of the live global navigation of efeoncepro.com (TASK-2042).
 *
 * The live document (plugin «EO Navegación», revisions with author and message) is the source of truth. An agent pulls
 * it, edits a working copy with readable selectors, checks it with the plugin's own validator (byte-identical to AXIS),
 * previews it with the real renderer, and applies it as a new revision against the revision it started from, so a
 * concurrent save is never overwritten. Every apply purges the caches. Photos are cropped to the canvas sizes and
 * uploaded append-only (never overwritten) to the public AXIS bucket.
 *
 * Production writes — `photo` (bucket), `apply` and `restore` (WordPress) — need the operator's go.
 * Manual: docs/manual-de-uso/public-site/operar-navegacion-global.md
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

type Json = any
type Found = { node: Json; list?: Json[]; index?: number; pointer: string }

const ROOT = resolve(__dirname, '../../..')
const DIR = join(ROOT, 'tmp/site-nav')
const LIVE = join(DIR, 'live.json')
const WORK = join(DIR, 'working.json')
const RUNTIME = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const SITE = 'https://efeoncepro.com'
const BUCKET = 'gs://efeonce-group-axis-public-media/site-nav/v1'
const PUBLIC = 'https://storage.googleapis.com/efeonce-group-axis-public-media/site-nav/v1'

// Canvas v68 crops (TASK-2041): mega photo, onepage photo, editorial card.
const CROPS: Record<string, [number, number]> = { mm: [880, 472], op: [996, 1080], card: [880, 496] }

// Longest reading title measured to fit the card at 1200–1440 (2026-10-23); longer ones are cut by the card.
const CARD_TITLE_MAX = 65
const VALUE_FLAGS = ['revision', 'alt', 'file', 'slug', 'crops', 'position', 'json', 'after', 'before', 'message', 'path', 'open', 'line', 'state', 'tone']

const fail = (message: string): never => {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const ok = (message: string) => console.log(`✓ ${message}`)
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))

const write = (file: string, value: unknown) => {
  mkdirSync(DIR, { recursive: true })
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}

const working = (): Json => (existsSync(WORK) ? read(WORK) : fail('No working copy: run `pull` first.'))

const flag = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`)

  return index >= 0 ? args[index + 1] : undefined
}

const has = (args: string[], name: string) => args.includes(`--${name}`)

const positional = (args: string[]) =>
  args.filter((arg, index) => !arg.startsWith('--') && !(index > 0 && VALUE_FLAGS.includes(args[index - 1].slice(2))))

// ── Remote: WP-CLI over SSH through the repo wrapper; data travels as --input-file, never as arguments ──

function wpcli(evalFile: string, inputs: string[]): string {
  const files = inputs.flatMap(file => ['--input-file', file])

  return execFileSync('pnpm', ['-s', 'public-website:wpcli', '--', '--eval-file', evalFile, ...files, '--wp-user', '12'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
}

function remote(input: Json): string {
  const inputFile = join(DIR, 'remote-input.json')

  write(inputFile, input)
  const out = wpcli('scripts/public-website/site-nav/remote.php', [inputFile])
  const match = out.match(/---EOSN-BEGIN---\n([\s\S]*?)---EOSN-END---/)

  return match ? match[1].trim() : fail(`Unexpected remote output:\n${out.slice(-800)}`)
}

function applyRemote(doc: Json, baseRevision: number, message: string, dryRun: boolean): string {
  const docFile = join(DIR, 'apply-document.json')
  const metaFile = join(DIR, 'apply-meta.json')

  write(docFile, doc)
  write(metaFile, { baseRevision, message, dryRun })

  return wpcli('scripts/public-website/apply-site-nav-document.php', [docFile, metaFile])
}

// ── Local: the plugin's validator and renderer, without WordPress ──

function php(mode: string, ...files: string[]): string {
  return execFileSync('php', [join(ROOT, 'scripts/public-website/site-nav/local.php'), mode, ...files], {
    encoding: 'utf8',
    env: { ...process.env, PUBLIC_SITE_RUNTIME_ROOT: RUNTIME }
  })
}

const glyphCatalog = (): string[] => JSON.parse(php('glyphs'))

function stripMeta(doc: Json) {
  const rest = { ...doc }

  delete rest.revision
  delete rest.updatedAt

  return rest
}

function objectExists(object: string) {
  try {
    execFileSync('gcloud', ['storage', 'ls', object], { stdio: 'ignore' })

    return true
  } catch {
    return false
  }
}

function vendoredAxis() {
  const adapter = readFileSync(join(RUNTIME, 'wp-content/themes/ohio-child/inc/site-nav.php'), 'utf8')

  return adapter.match(/const EO_SITE_NAV_AXIS = '([\d.]+)'/)?.[1] ?? fail('EO_SITE_NAV_AXIS not found')
}

// A timeout or a refused connection answers «000» instead of throwing, so one slow URL never aborts the check.
function httpCode(url: string, head = false) {
  try {
    return execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '20', ...(head ? ['-I'] : []), url], { encoding: 'utf8' })
  } catch (error) {
    return String((error as { stdout?: string }).stdout ?? '') || '000'
  }
}

// ── Selectors ──
// primary|line|service|format|item:<id>, case:<lineId>, reading:<serviceId>, featured:<formatId>,
// strip|onepage:<primaryId>, and header, cta, logo, footer.

function find(doc: Json, target: string): Found {
  const [kind, id] = target.split(':')
  const lines: Found[] = []
  const services: Found[] = []
  const formats: Found[] = []
  const items: Found[] = []

  doc.primary.forEach((primary: Json, pi: number) => {
    ;(primary.lines ?? []).forEach((line: Json, li: number) => {
      lines.push({ node: line, list: primary.lines, index: li, pointer: `/primary/${pi}/lines/${li}` })
      line.services.forEach((service: Json, si: number) => {
        services.push({ node: service, list: line.services, index: si, pointer: `/primary/${pi}/lines/${li}/services/${si}` })
      })
    })
    ;(primary.formats ?? []).forEach((format: Json, fi: number) => {
      formats.push({ node: format, list: primary.formats, index: fi, pointer: `/primary/${pi}/formats/${fi}` })
      ;(format.items ?? []).forEach((item: Json, ii: number) => {
        items.push({ node: item, list: format.items, index: ii, pointer: `/primary/${pi}/formats/${fi}/items/${ii}` })
      })
    })
    ;(primary.items ?? []).forEach((item: Json, ii: number) => {
      items.push({ node: item, list: primary.items, index: ii, pointer: `/primary/${pi}/items/${ii}` })
    })
    ;(primary.onepage?.items ?? []).forEach((item: Json, ii: number) => {
      items.push({ node: item, list: primary.onepage.items, index: ii, pointer: `/primary/${pi}/onepage/items/${ii}` })
    })
  })

  const byId = (list: Found[]) => list.find(found => found.node.id === id) ?? fail(`${kind}:${id} not found. Run \`show\` to list ids.`)

  const primary = (): Found => {
    const index = doc.primary.findIndex((entry: Json) => entry.id === id)

    if (index < 0) fail(`primary:${id} not found.`)

    return { node: doc.primary[index], list: doc.primary, index, pointer: `/primary/${index}` }
  }

  const child = (parent: Found, key: string): Found => {
    parent.node[key] ??= {}

    return { node: parent.node[key], pointer: `${parent.pointer}/${key}` }
  }

  switch (kind) {
    case 'primary':
      return primary()
    case 'line':
      return byId(lines)
    case 'service':
      return byId(services)
    case 'format':
      return byId(formats)
    case 'item':
      return byId(items)
    case 'case':
      return child(byId(lines), 'case')
    case 'reading':
      return child(byId(services), 'reading')
    case 'featured':
      return child(byId(formats), 'featured')
    case 'strip':
      return child(primary(), 'strip')
    case 'onepage':
      return child(primary(), 'onepage')
    case 'header':
      return { node: doc.header, pointer: '/header' }
    case 'cta':
      return { node: doc.header.cta, pointer: '/header/cta' }
    case 'logo':
      return { node: doc.header.logo, pointer: '/header/logo' }
    case 'footer':
      return { node: doc.onepage.footer, pointer: '/onepage/footer' }
    default:
      return fail(`Unknown selector «${target}». Use primary|line|service|format|item|case|reading|featured|strip|onepage:<id>, or header|cta|logo|footer.`)
  }
}

const parseValue = (raw: string) => {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function setPath(node: Json, path: string, value: unknown) {
  const keys = path.split('.')
  const last = keys.pop()!
  let target = node

  for (const key of keys) {
    target[key] ??= {}
    target = target[key]
  }

  if (value === undefined) delete target[last]
  else target[last] = value
}

// ── Commands ──

const commands: Record<string, (args: string[]) => void | Promise<void>> = {
  pull(args) {
    const revision = flag(args, 'revision')
    const doc = JSON.parse(remote({ command: 'export', ...(revision ? { revision: Number(revision) } : {}) }))

    write(LIVE, doc)
    if (!has(args, 'keep') || !existsSync(WORK)) write(WORK, doc)

    if (has(args, 'mirror')) {
      writeFileSync(join(RUNTIME, 'manifests/site-nav/efeoncepro.com.json'), JSON.stringify(stripMeta(doc), null, 2) + '\n')
      ok('Mirrored into the runtime repo (commit it there).')
    }

    ok(`Pulled revision ${doc.revision} of ${doc.site} → ${WORK}`)
  },

  show(args) {
    const doc = working()
    const [target] = positional(args)

    if (target) {
      console.log(JSON.stringify(find(doc, target).node, null, 2))

      return
    }

    for (const primary of doc.primary) {
      console.log(`primary:${primary.id}  «${primary.label}» ${primary.href}${primary.panel ? `  [${primary.panel}]` : ''}`)

      for (const line of primary.lines ?? []) {
        console.log(`  line:${line.id}  «${line.label}» ${line.question}${line.case ? `  case: «${line.case.title}»` : ''}`)

        for (const s of line.services) {
          console.log(`    service:${s.id}  «${s.label}» ${s.href}  glyph:${s.glyph}${s.photo ? '  photo' : ''}${s.reading ? `  reading: «${s.reading.title}»` : ''}`)
        }
      }

      for (const format of primary.formats ?? []) console.log(`  format:${format.id}  «${format.label}» ${format.href}  items:${(format.items ?? []).length}`)
      for (const item of primary.items ?? []) console.log(`  item:${item.id}  «${item.label}» ${item.href}`)
    }

    console.log(`context matchers: ${doc.context?.matchers?.length ?? 0} (exceptions only: a service page marks itself)`)
  },

  set(args) {
    const [target, field, ...rest] = positional(args)

    if (!target || !field || !rest.length) fail('Usage: set <selector> <field[.sub]> <value>')
    const doc = working()
    const found = find(doc, target)

    setPath(found.node, field, parseValue(rest.join(' ')))
    write(WORK, doc)
    ok(`${target}.${field} set (${found.pointer}/${field.replaceAll('.', '/')})`)
  },

  unset(args) {
    const [target, field] = positional(args)
    const doc = working()

    setPath(find(doc, target).node, field, undefined)
    write(WORK, doc)
    ok(`${target}.${field} removed`)
  },

  glyphs(args) {
    const [filter] = positional(args)

    console.log(glyphCatalog().filter(glyph => !filter || glyph.includes(filter)).join('\n'))
  },

  glyph(args) {
    const [target, name] = positional(args)

    if (!target?.startsWith('service:')) fail('Usage: glyph service:<id> <glyph> (see `glyphs`)')
    if (!glyphCatalog().includes(name)) fail(`«${name}» is not in the Trazo catalog. Run \`glyphs\`.`)
    const doc = working()

    find(doc, target).node.glyph = name
    write(WORK, doc)
    ok(`${target} glyph → ${name}`)
  },

  async photo(args) {
    const [target] = positional(args)
    const file = flag(args, 'file')
    const alt = flag(args, 'alt')
    const slug = flag(args, 'slug') ?? target?.split(':')[1]

    if (!target || !file || !alt) fail('Usage: photo <selector> --file <image> --alt "<descripción>" [--slug name] [--crops mm,op] [--position attention|centre|north] [--dry-run]')
    if (!existsSync(file!)) fail(`No such file: ${file}`)

    const kind = target!.split(':')[0]
    const defaultCrops = ['featured', 'format'].includes(kind) ? 'card' : ['item', 'onepage'].includes(kind) ? 'op' : 'mm,op'
    const crops = (flag(args, 'crops') ?? defaultCrops).split(',')
    const position = flag(args, 'position') ?? 'attention'
    const sharp = (await import('sharp')).default
    const meta = await sharp(file!).metadata()
    const doc = working()
    const node = find(doc, target!).node
    const photo: Json = { ...(node.photo ?? {}), alt }
    const uploads: { local: string; object: string; url: string }[] = []

    for (const crop of crops) {
      const size = CROPS[crop] ?? fail(`Unknown crop ${crop} (mm, op, card)`)

      if ((meta.width ?? 0) < size[0] || (meta.height ?? 0) < size[1]) {
        console.warn(`! ${basename(file!)} is ${meta.width}×${meta.height}, smaller than the ${crop} crop ${size[0]}×${size[1]}: it will be upscaled.`)
      }

      // Objects are immutable: a new crop of the same slug gets the next .vN name, never an overwrite.
      let name = `${slug}-${crop}.webp`

      for (let version = 2; objectExists(`${BUCKET}/${name}`); version++) name = `${slug}-${crop}.v${version}.webp`
      const local = join(DIR, 'photos', name)

      mkdirSync(join(DIR, 'photos'), { recursive: true })
      await sharp(file!).resize(size[0], size[1], { fit: 'cover', position }).webp({ quality: 82 }).toFile(local)
      uploads.push({ local, object: `${BUCKET}/${name}`, url: `${PUBLIC}/${name}` })
      photo[crop] = `${PUBLIC}/${name}`
    }

    if (has(args, 'dry-run')) {
      for (const upload of uploads) console.log(`would upload ${upload.local} → ${upload.object}`)
      ok('Dry run: crops written locally, nothing uploaded, document unchanged.')

      return
    }

    for (const upload of uploads) {
      execFileSync('gcloud', ['storage', 'cp', upload.local, upload.object, '--no-clobber', '--cache-control=public, max-age=31536000, immutable', '--content-type=image/webp'], { stdio: 'inherit' })
      ok(`uploaded ${upload.url}`)
    }

    node.photo = photo
    write(WORK, doc)
    ok(`${target}.photo updated in the working copy (apply to publish it)`)
  },

  add(args) {
    const [parent, kind] = positional(args)
    const json = flag(args, 'json')

    if (!parent || !kind || !json) fail('Usage: add <parent selector> services|lines|items|formats --json \'{…}\' [--after <id>|--first]')
    const doc = working()
    const list: Json[] = find(doc, parent).node[kind] ?? fail(`${parent} has no «${kind}» list.`)
    const value = JSON.parse(json!)

    if (list.some(entry => entry.id === value.id)) fail(`id «${value.id}» already exists in ${parent}.${kind}`)
    const after = flag(args, 'after')
    const at = has(args, 'first') ? 0 : after ? list.findIndex(entry => entry.id === after) + 1 : list.length

    if (after && at === 0) fail(`--after ${after}: not found`)
    list.splice(at, 0, value)
    write(WORK, doc)
    ok(`added ${kind.replace(/s$/, '')}:${value.id} to ${parent} at position ${at + 1}`)
  },

  remove(args) {
    const [target] = positional(args)
    const doc = working()
    const found = find(doc, target)

    if (!found.list) fail(`${target} is not a list entry.`)
    found.list!.splice(found.index!, 1)
    write(WORK, doc)
    ok(`removed ${target}`)
  },

  move(args) {
    const [target] = positional(args)
    const doc = working()
    const found = find(doc, target)

    if (!found.list) fail(`${target} is not a list entry.`)
    const list = found.list!
    const [entry] = list.splice(found.index!, 1)
    const after = flag(args, 'after')
    const before = flag(args, 'before')
    let at: number

    if (has(args, 'first')) at = 0
    else if (has(args, 'last')) at = list.length
    else if (after) at = list.findIndex(other => other.id === after) + 1
    else if (before) at = list.findIndex(other => other.id === before)
    else at = fail('Use --after <id>, --before <id>, --first or --last')

    list.splice(Math.max(0, at), 0, entry)
    write(WORK, doc)
    ok(`moved ${target}`)
  },

  // RFC 6902 subset (add, replace, remove) for anything the selectors do not cover.
  patch(args) {
    const [file] = positional(args)
    const doc = working()
    const ops: Json[] = read(file)

    for (const op of ops) {
      const keys = op.path.split('/').slice(1).map((key: string) => key.replaceAll('~1', '/').replaceAll('~0', '~'))
      const last = keys.pop()
      let target = doc

      for (const key of keys) target = target[key] ?? fail(`patch path not found: ${op.path}`)

      if (op.op === 'remove') {
        if (Array.isArray(target)) target.splice(Number(last), 1)
        else delete target[last]
      } else if (op.op === 'add' && Array.isArray(target)) {
        target.splice(last === '-' ? target.length : Number(last), 0, op.value)
      } else if (op.op === 'add' || op.op === 'replace') {
        target[last] = op.value
      } else {
        fail(`Unsupported op ${op.op}`)
      }
    }

    write(WORK, doc)
    ok(`${ops.length} patch operations applied`)
  },

  check() {
    const doc = working()
    const issues: Json[] = JSON.parse(php('validate', WORK))
    const hrefs = new Set<string>()
    const photos = new Set<string>()
    const titles: [string, string][] = []
    let errors = 0
    let warnings = 0

    for (const issue of issues) {
      console.log(`✗ ${issue.code} ${issue.path} ${issue.message ?? ''}`)
      errors++
    }

    const walk = (value: Json, path: string) => {
      if (Array.isArray(value)) return value.forEach((entry, index) => walk(entry, `${path}/${index}`))
      if (!value || typeof value !== 'object') return

      for (const [key, entry] of Object.entries(value)) {
        if ((key === 'href' || key === 'fallbackHref') && typeof entry === 'string' && (entry.startsWith('/') || entry.startsWith(SITE))) hrefs.add(entry)
        if (['mm', 'op', 'card'].includes(key) && typeof entry === 'string') photos.add(entry)
        if (key === 'title' && /\/(case|reading)$/.test(path)) titles.push([path, entry as string])

        // Text is plain: an HTML entity copied from WordPress (`&#x2122;`) is painted literally on the site.
        if (typeof entry === 'string' && /&(#x?[0-9a-f]+|[a-z]+);/i.test(entry)) {
          console.log(`✗ ${path}/${key} has an HTML entity: write the character itself («${entry.slice(0, 60)}»)`)
          errors++
        }

        walk(entry, `${path}/${key}`)
      }
    }

    walk(doc, '')

    // Links and photos must answer; a redirect is a warning (link the final page instead).
    for (const href of hrefs) {
      const code = httpCode(href.startsWith('/') ? SITE + href : href)

      if (code === '200') continue

      if (code.startsWith('3')) {
        console.log(`! ${href} answers ${code}: link the final page`)
        warnings++
      } else {
        console.log(`✗ ${href} answers ${code}`)
        errors++
      }
    }

    for (const photo of photos) {
      const code = httpCode(photo, true)

      if (code !== '200') {
        console.log(`✗ photo ${photo} answers ${code}`)
        errors++
      }
    }

    for (const [path, title] of titles) {
      if (title.length > CARD_TITLE_MAX) {
        console.log(`! ${path} title has ${title.length} characters (> ${CARD_TITLE_MAX}): the card cuts it at 1200–1280; shorten it keeping its words`)
        warnings++
      }
    }

    console.log(`${errors ? '✗' : '✓'} check: ${issues.length} schema issues, ${hrefs.size} links, ${photos.size} photos, ${titles.length} card titles — ${errors} errors, ${warnings} warnings`)
    if (errors) process.exit(1)
  },

  diff() {
    const changes: string[] = []

    const keyed = (list: Json[]) => list.length > 0 && list.every(entry => entry && typeof entry === 'object' && typeof entry.id === 'string')

    const compare = (before: Json, after: Json, path: string) => {
      if (JSON.stringify(before) === JSON.stringify(after)) return

      // Lists of entries with ids (lines, services, items…) are compared by id, so a move reads as a move.
      if (Array.isArray(before) && Array.isArray(after) && keyed(before) && keyed(after)) {
        const ids = (list: Json[]) => list.map(entry => entry.id)

        for (const entry of after) {
          const old = before.find(other => other.id === entry.id)

          if (old) compare(old, entry, `${path}/${entry.id}`)
          else changes.push(`${path}/${entry.id}\n  + added ${JSON.stringify(entry)}`)
        }

        for (const entry of before) if (!after.some(other => other.id === entry.id)) changes.push(`${path}/${entry.id}\n  − removed`)
        const kept = ids(before).filter(id => ids(after).includes(id))
        const order = ids(after).filter(id => kept.includes(id))

        if (kept.join() !== order.join()) changes.push(`${path}\n  order ${kept.join(', ')} → ${order.join(', ')}`)

        return
      }

      if (before && after && typeof before === 'object' && typeof after === 'object' && Array.isArray(before) === Array.isArray(after)) {
        for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) compare(before[key], after[key], `${path}/${key}`)

        return
      }

      changes.push(`${path}\n  − ${JSON.stringify(before)}\n  + ${JSON.stringify(after)}`)
    }

    compare(stripMeta(read(LIVE)), stripMeta(working()), '')
    console.log(changes.length ? changes.join('\n') : 'No changes against the pulled revision.')
  },

  async preview(args) {
    working()
    const version = vendoredAxis()
    const assetUrl = (file: string) => `${SITE}/wp-content/themes/ohio-child/assets/vendor/axis/site-nav/${version}/brand/${file}`

    const options = {
      path: flag(args, 'path') ?? '/',
      state: flag(args, 'state') ?? 'top',
      tone: flag(args, 'tone') ?? 'dark',
      assets: {
        logoNegative: assetUrl('efeonce-logo-negative.svg'),
        logoPositive: assetUrl('efeonce-logo-positive.svg'),
        glitchNegative: assetUrl('glitch-logo-negative.svg'),
        social: Object.fromEntries(['linkedin', 'instagram', 'youtube'].map(network => [network, assetUrl(`${network}-isotype-negative.svg`)]))
      }
    }

    const optionsFile = join(DIR, 'preview-options.json')

    write(optionsFile, options)
    const nav = php('render', WORK, optionsFile)
    const vendor = `${RUNTIME}/wp-content/themes/ohio-child/assets/vendor/axis/site-nav/${version}`
    const script = readFileSync(join(vendor, 'site-nav.js'), 'utf8').replace(/export\s*\{[^}]*\};?\s*$/, '')
    const fonts = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Poppins:wght@300;400;500;600;700&display=swap'
    const css = readFileSync(join(vendor, 'site-nav.css'), 'utf8')
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${fonts}"><style>${css} body{margin:0;min-height:200vh;background:linear-gradient(#0b1a33 0 900px,#f7f8f6 0)}</style><body>${nav}<script type="module">${script}\nenhanceSiteNav(document)</script></body></html>`
    const file = join(DIR, 'preview.html')

    writeFileSync(file, html)
    const { chromium } = await import('@playwright/test')
    const browser = await chromium.launch({ channel: 'chrome' })
    const open = flag(args, 'open')
    const line = flag(args, 'line')

    for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]] as const) {
      const page = await browser.newPage({ viewport })

      await page.goto('file://' + file)
      await page.waitForTimeout(800)

      if (name === 'desktop' && open) {
        await page.click(`[data-site-nav-trigger="${open}"]`)
        await page.waitForTimeout(900)

        if (line) {
          await page.hover(`[data-site-nav-line="${line}"]`)
          await page.waitForTimeout(900)
        }
      }

      if (name === 'phone') {
        await page.click('.axis-site-nav__burger')
        await page.waitForTimeout(1300)
      }

      const shot = join(DIR, `preview-${name}.png`)

      await page.screenshot({ path: shot })
      ok(`preview ${name}: ${shot}`)
      await page.close()
    }

    await browser.close()
  },

  // Every text the design clamps (one-line descriptions, two-line card titles…) must fit: renders the working copy at the
  // widths where space is tightest, walks every line of every panel and lists what is cut.
  async fit() {
    await commands.preview([])
    const { chromium } = await import('@playwright/test')
    const browser = await chromium.launch({ channel: 'chrome' })
    const cut = new Map<string, Set<number>>()

    for (const width of [1440, 1280, 1200]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })

      await page.goto('file://' + join(DIR, 'preview.html'))
      await page.waitForTimeout(600)
      const triggers = await page.$$eval('[data-site-nav-trigger]', nodes => nodes.map(node => node.getAttribute('data-site-nav-trigger')))

      for (const trigger of triggers) {
        await page.click(`[data-site-nav-trigger="${trigger}"]`)
        await page.waitForTimeout(700)
        const lines = await page.$$eval(`#site-nav-panel-${trigger} [data-site-nav-line]`, nodes => nodes.map(node => node.getAttribute('data-site-nav-line')))

        for (const line of lines.length ? lines : [null]) {
          if (line) {
            await page.hover(`#site-nav-panel-${trigger} [data-site-nav-line="${line}"]`)
            await page.waitForTimeout(500)
          }

          const clipped: string[] = await page.$$eval(`#site-nav-panel-${trigger} *`, nodes =>
            nodes
              .filter(node => {
                const el = node as HTMLElement
                const style = getComputedStyle(el)

                const box = el.getBoundingClientRect()

                // Text hidden on purpose for screen readers (1 px, clipped) is not a cut.
                return el.children.length === 0 && box.width > 2 && box.height > 2 && style.visibility !== 'hidden' && style.opacity !== '0' &&
                  (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && (style.textOverflow === 'ellipsis' || style.webkitLineClamp !== 'none' || style.overflow === 'hidden')
              })
              .map(node => `${(node.textContent ?? '').trim()}\u0000${(node as HTMLElement).className}`)
              .filter(Boolean)
          )

          for (const text of clipped) {
            if (!cut.has(text)) cut.set(text, new Set())
            cut.get(text)!.add(width)
          }
        }

        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }

      await page.close()
    }

    await browser.close()

    // Approved design (canvas board Mega1280, confirmed by the fidelity session on 2026-10-23): a service description is
    // one line with an ellipsis below 1440 and must be whole at 1440. Resource titles in Recursos are replaced live by
    // the latest posts and clamp by design: they are reported, not failed.
    let errors = 0

    for (const [entry, widths] of cut) {
      const [text, where] = entry.split('\u0000')
      const at = [...widths]
      const label = `cut at ${at.join('/')}: «${text}» (${text.length} chars, ${where})`

      if (where.includes('axis-site-nav__desc') && !at.includes(1440)) console.log(`· ${label} — by design below 1440 (Mega1280)`)
      else if (where.includes('axis-site-nav__resource-title')) console.log(`! ${label} — fallback title; live posts replace it`)
      else {
        console.log(`✗ ${label} — shorten it keeping its words`)
        errors++
      }
    }

    console.log(errors ? `✗ fit: ${errors} texts are cut` : '✓ fit: every text that must fit does, at 1440, 1280 and 1200')
    if (errors) process.exit(1)
  },

  apply(args) {
    const message = flag(args, 'message') ?? fail('apply needs --message "why it changed"')
    const live = read(LIVE)
    const doc = stripMeta(working())
    const dry = applyRemote(doc, live.revision, message, true)

    console.log(dry)
    if (!/Válido|Valid/i.test(dry)) fail('Dry run did not validate; nothing was saved.')

    if (has(args, 'dry-run')) {
      ok('Dry run only.')

      return
    }

    console.log(applyRemote(doc, live.revision, message, false))
    commands.pull(['--keep'])
    ok('Applied. Run `verify` once the edge refreshes (≈40 s).')
  },

  verify(args) {
    const path = flag(args, 'path') ?? '/'
    const live = read(LIVE)
    const rest = JSON.parse(execFileSync('curl', ['-s', `${SITE}/wp-json/eo/v1/site-nav?v=${Date.now()}`], { encoding: 'utf8' }))

    if (rest.revision !== live.revision) fail(`REST serves revision ${rest.revision}, expected ${live.revision}`)
    const html = execFileSync('curl', ['-s', SITE + path], { encoding: 'utf8' })

    if (!html.includes('data-axis-site-nav')) fail(`${path} does not paint the menu`)
    ok(`REST revision ${rest.revision}; ${path} paints the menu (${(html.match(/<a [^>]*data-site-nav-target/g) ?? []).length} menu links)`)
  },

  revisions() {
    for (const row of JSON.parse(remote({ command: 'revisions' }))) {
      console.log(`${String(row.revision).padStart(3)}  ${row.date}  ${row.author}  ${row.hash}  ${row.message}`)
    }
  },

  restore(args) {
    const [revision] = positional(args)
    const message = flag(args, 'message') ?? fail('restore needs --message')

    console.log(remote({ command: 'restore', revision: Number(revision), message }))
    commands.pull([])
  }
}

const USAGE = `Usage: pnpm public-website:site-nav <command>
  pull [--revision n] [--keep] [--mirror]   live document → tmp/site-nav/working.json
  show [selector]                            outline, or one node as JSON
  set <selector> <field[.sub]> <value>       edit a field (value is JSON or text)
  unset <selector> <field>
  glyphs [filter] · glyph service:<id> <name>
  photo <selector> --file img --alt "…" [--slug s] [--crops mm,op,card] [--position attention] [--dry-run]
  add <parent> services|lines|items|formats --json '{…}' [--after id|--first]
  remove <selector> · move <selector> --after id|--before id|--first|--last
  patch <ops.json>                           RFC 6902 add/replace/remove
  check · diff · preview [--path /x/] [--open soluciones] [--line growth] · fit
  apply --message "…" [--dry-run] · verify [--path /x/] · revisions · restore <n> --message "…"
Selectors: primary|line|service|format|item|case|reading|featured|strip|onepage:<id>, header, cta, logo, footer.`

const [cmd, ...args] = process.argv.slice(2)

if (!cmd || !commands[cmd]) {
  console.log(USAGE)
  process.exit(cmd ? 1 : 0)
}

Promise.resolve(commands[cmd](args)).catch(error => fail(error instanceof Error ? error.message : String(error)))
