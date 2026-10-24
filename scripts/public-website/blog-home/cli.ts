/**
 * `pnpm public-website:blog-home` — operate the live blog home of efeoncepro.com (/blog/, TASK-2050/2051) from any
 * agent: read its state, change what the slider shows, load resources and events, deploy its two plugins and verify
 * the page, always through the plugin's own meta, taxonomies and readers (remote.php), never raw SQL or Elementor.
 *
 * Every write is a plan until `--apply`. An applied write prints the previous values (its rollback), reads back,
 * purges /blog/ and is appended to the ledger (scripts/public-website/blog-home/ledger/<YYYY-MM>.jsonl).
 * Production writes need the operator's go. Manual: docs/manual-de-uso/public-site/operar-portada-blog-por-cli.md
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(__dirname, '../../..')
const HERE = join(ROOT, 'scripts/public-website/blog-home')
const TMP = join(ROOT, 'tmp/blog-home')
const SITE = 'https://efeoncepro.com'
const REMOTE = 'scripts/public-website/blog-home/remote.php'
const VALUE_FLAGS = ['until', 'light', 'bold', 'attachment', 'image', 'alt', 'snapshot', 'surface']
const FORMATS = ['articulo', 'caso', 'guia', 'grabacion', 'glitch-edicion', 'glitch-flash', 'glitch-nota', 'novedad']

type Json = Record<string, any>

const fail = (message: string): never => {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const flag = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`)

  return index >= 0 ? args[index + 1] : undefined
}

const has = (args: string[], name: string) => args.includes(`--${name}`)

const positional = (args: string[]) =>
  args.filter((arg, index) => !arg.startsWith('--') && !(index > 0 && VALUE_FLAGS.includes(args[index - 1].slice(2))))

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')

const run = (bin: string, args: string[], options: { quiet?: boolean } = {}) =>
  execFileSync(bin, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', options.quiet ? 'pipe' : 'inherit'], maxBuffer: 64 * 1024 * 1024 })

const wpcli = (evalFile: string, inputs: string[], extra: string[] = []) =>
  run('pnpm', ['-s', 'public-website:wpcli', '--', '--eval-file', evalFile, ...inputs.flatMap(file => ['--input-file', file]), '--wp-user', '12', ...extra])

/** The remote prints one pretty JSON object; everything before it is transport noise. */
const lastJson = (text: string): Json => {
  const start = text.search(/^\{/m)

  if (start < 0) fail(`The remote refused the operation (its error is printed above).${text.trim() ? `\n${text}` : ""}`)

  return JSON.parse(text.slice(start))
}

const ledger = (entry: Json) => {
  const dir = join(HERE, 'ledger')

  mkdirSync(dir, { recursive: true })
  let author = 'unknown'

  try {
    author = run('git', ['config', 'user.name'], { quiet: true }).trim()
  } catch {}

  appendFileSync(join(dir, `${new Date().toISOString().slice(0, 7)}.jsonl`), JSON.stringify({ at: new Date().toISOString(), author, ...entry }) + '\n')
}

/** Runs one remote op. `image` is a local file passed as the second input (imported once per content hash). */
const remote = (payload: Json, image?: string): Json => {
  mkdirSync(TMP, { recursive: true })
  const file = join(TMP, `op-${payload.op}-${stamp()}.json`)

  writeFileSync(file, JSON.stringify(payload, null, 2))
  if (image && !existsSync(resolve(image))) fail(`Image not found: ${image}`)
  const result = lastJson(wpcli(REMOTE, image ? [file, resolve(image)] : [file]))

  if (payload.apply && result.applied) ledger({ op: payload.op, input: { ...payload, apply: undefined }, result: { before: result.before, after: result.after, id: result.id ?? result.post } })

  return result
}

const print = (value: unknown) => console.log(JSON.stringify(value, null, 2))

const readJsonFile = (path: string | undefined, what: string): Json => {
  if (!path) fail(`Pass the ${what} JSON file.`)

  return JSON.parse(readFileSync(resolve(path!), 'utf8'))
}

const plannedNote = (result: Json) => {
  if (result.applied === false) console.log('\n→ Plan only. Re-run with --apply to write it (needs the operator’s go in production).')
}

const exportBaseline = () => {
  const dir = join('tmp/public-site-code-baselines', `blog-home-${stamp()}`)

  run('pnpm', ['-s', 'public-website:export-live-code', '--', '--output', dir])

  return dir
}

const deploy = (target: string | undefined, apply: boolean) => {
  if (target !== 'home' && target !== 'content-model') fail('deploy needs `home` (eo-blog-home) or `content-model` (efeonce-editorial-blocks).')
  const baseline = exportBaseline()

  if (target === 'home') {
    console.log(run('node', ['scripts/public-website/build-blog-home-plugin-package.cjs', baseline]))
    if (!apply) return console.log('→ Package built (tmp/blog-home-plugin-release). Re-run with --apply to install it.')
    console.log(wpcli('scripts/public-website/deploy-blog-home-plugin-package.php', ['tmp/blog-home-plugin-release/package.zip', 'tmp/blog-home-plugin-release/manifest.json']))
    ledger({ op: 'deploy', input: { target }, result: { baseline } })

    return
  }

  console.log(run('node', ['scripts/public-website/build-blog-v3-content-model-package.cjs', baseline]))
  const dry = join(TMP, 'dry-run.txt')

  mkdirSync(TMP, { recursive: true })
  writeFileSync(dry, 'dry-run')
  const pkg = ['tmp/blog-v3-content-model-release/package.zip', 'tmp/blog-v3-content-model-release/manifest.json']

  console.log(wpcli('scripts/public-website/deploy-blog-v3-content-model-package.php', [...pkg, dry]))
  if (!apply) return console.log('→ Dry run only. Re-run with --apply to install it.')

  // The deploy refuses while the content model is on (PDR-029 §7): off → deploy → back to what it was.
  const before = String(remote({ op: 'status' }).flag)

  if (before === '1') remote({ op: 'flag', value: '0', apply: true })

  try {
    console.log(wpcli('scripts/public-website/deploy-blog-v3-content-model-package.php', pkg))
  } finally {
    if (before === '1') remote({ op: 'flag', value: '1', apply: true })
  }

  console.log(wpcli('scripts/public-website/blog-v3/verify-content-model.php', []))
  ledger({ op: 'deploy', input: { target }, result: { baseline, flag: before } })
}

const verify = (args: string[]) => {
  const url = flag(args, 'url') ?? `${SITE}/blog/`
  const html = run('curl', ['-sL', `${url}?v=${Date.now()}`], { quiet: true })

  const checks: Record<string, boolean> = {
    'template rendered (#eobh)': html.includes('id="eobh"'),
    'one page H1': (html.match(/<h1[\s>]/g) ?? []).length === 1,
    'canonical bar (site nav)': /axis-site-nav|eo-site-nav/.test(html),
    'indexable (robots index)': /<meta name=.robots. content=.index/.test(html),
    'real data (no example author)': !html.includes('[Autor real]')
  }

  for (const [name, passed] of Object.entries(checks)) console.log(`${passed ? '✓' : '✗'} ${name}`)
  const status = remote({ op: 'status' })

  console.log(`✓ flag ${status.flag} · ${status.posts.published} posts · ${status.posts.without_format} without format · ${status.slider.length} slides`)

  if (has(args, 'browser')) {
    console.log(run('node', [join(HERE, 'verify-browser.cjs'), url]))
    console.log(run('node', ['scripts/public-website/blog-v3/fidelity/a11y.cjs', `${url}?ax=${Date.now()}`]))
  }

  if (Object.values(checks).includes(false)) process.exit(1)
}

const page = (action: string | undefined, args: string[]) => {
  const script = 'scripts/public-website/blog-v3/publish-blog-home-page.php'

  if (!has(args, 'apply')) fail(`page ${action} writes the live /blog/ page: re-run with --apply (operator’s go).`)
  if (action === 'publish') return console.log(wpcli(script, []))

  if (action === 'rollback') {
    const snapshot = flag(args, 'snapshot') ?? fail('page rollback needs --snapshot <option printed by publish>.')

    return console.log(wpcli(script, [], ['rollback', snapshot as string]))
  }

  fail('page needs `publish` or `rollback --snapshot <option>`.')
}

const HELP = `pnpm public-website:blog-home <command>

Read (safe):
  status                         flag, slider, formats, resources, events, last purges
  slider                         the five slides and why each one is there
  post <id|slug>                 a post's home fields (format, pin, slider title and image)
  verify [--browser] [--url u]   live /blog/ checks; --browser adds widths 320–1920 and axe

Write (plan unless --apply; every apply is ledgered and purges /blog/):
  pin <post> --until <UTC date>  pin a post first in the slider until that date
  unpin <post>
  format <post> <${FORMATS.join('|')}>
  hero <post> [--light t] [--bold t] [--attachment id | --image file --alt text] [--clear]
  resource <file.json> [--image file --alt text]   create/update a resource (see manual for the shape)
  review <resource id>           mark a resource reviewed today (it hides after 180 days)
  event <file.json> [--image file --alt text]      create/update an event (no private meeting links)
  retire <resource|event> <id>   resource → draft; event → cancelled
  subscription <form-key|off> [--surface id]  connect the real Glitch subscription (published inline_pill form)
  flag <0|1>                     content model off (example content) / on (real data)
  purge                          purge /blog/ now

Deploy and page (production; --apply needs the operator's go):
  deploy <home|content-model>    export live baseline, build the guarded package, dry run; --apply installs it
  page publish|rollback --snapshot <option>        /blog/ cutover or its exact rollback`

const main = () => {
  const [command, ...args] = process.argv.slice(2)
  const pos = positional(args)
  const apply = has(args, 'apply')

  switch (command) {
    case 'status':
    case 'slider':
      return print(remote({ op: command }))
    case 'post':
      return print(remote({ op: 'post', post: pos[0] ?? fail('post needs an id or slug.') }))
    case 'pin':

    case 'unpin': {
      const result = remote({ op: command, post: pos[0] ?? fail(`${command} needs a post.`), until: flag(args, 'until'), apply })

      print(result)

      return plannedNote(result)
    }

    case 'format': {
      const result = remote({ op: 'format', post: pos[0] ?? fail('format needs a post.'), format: pos[1] ?? fail(`format needs one of: ${FORMATS.join(', ')}`), apply })

      print(result)

      return plannedNote(result)
    }

    case 'hero': {
      const image = flag(args, 'image')
      const payload: Json = { op: 'hero', post: pos[0] ?? fail('hero needs a post.'), apply }

      for (const name of ['light', 'bold', 'alt']) if (flag(args, name) !== undefined) payload[name] = flag(args, name)
      if (flag(args, 'attachment')) payload.attachment = Number(flag(args, 'attachment'))
      if (image) payload.image_file = true
      if (has(args, 'clear')) payload.clear = true
      const result = remote(payload, image)

      print(result)

      return plannedNote(result)
    }

    case 'resource':

    case 'event': {
      const image = flag(args, 'image')
      const result = remote({ op: `${command}-upsert`, data: readJsonFile(pos[0], command), image_file: Boolean(image), alt: flag(args, 'alt'), apply }, image)

      print(result)

      return plannedNote(result)
    }

    case 'review': {
      const result = remote({ op: 'resource-review', id: pos[0] ?? fail('review needs a resource id.'), apply })

      print(result)

      return plannedNote(result)
    }

    case 'retire': {
      const result = remote({ op: 'retire', kind: pos[0], id: pos[1] ?? fail('retire needs <resource|event> <id>.'), apply })

      print(result)

      return plannedNote(result)
    }

    case 'flag': {
      const result = remote({ op: 'flag', value: pos[0] ?? fail('flag needs 0 or 1.'), apply })

      print(result)

      return plannedNote(result)
    }

    case 'subscription': {
      const result = remote({ op: 'subscription', form_key: pos[0] ?? fail('subscription needs a Growth Form key or off.'), surface: flag(args, 'surface'), apply })

      print(result)

      return plannedNote(result)
    }

    case 'purge': {
      const result = remote({ op: 'purge', apply })

      print(result)

      return plannedNote(result)
    }

    case 'verify':
      return verify(args)
    case 'deploy':
      return deploy(pos[0], apply)
    case 'page':
      return page(pos[0], args)
    default:
      console.log(HELP)
  }
}

main()
