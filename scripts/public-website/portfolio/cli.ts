/**
 * `pnpm public-website:portfolio` — governed operation of the public portfolio of efeoncepro.com (plugin «EO Portfolio»,
 * PDR-028, TASK-2047). The live project document (revisions with author and message) is the source of truth. An agent
 * pulls it (or starts one from a file), edits a working copy, checks it locally with the plugin's own validator,
 * previews what the public would see under the client approval, and applies it against the revision it started from,
 * so a concurrent save is never overwritten. Publishing is a separate step that the plugin refuses without a client
 * approval with reference, date and scope.
 *
 * Every remote step goes through `pnpm public-website:wpcli` → `scripts/public-website/portfolio/remote.php` →
 * `wp eo-portfolio`, the same save service the admin screen uses. Production writes — `apply`, `publish`,
 * `unpublish`, `restore` — need the operator's go.
 * Manual: docs/manual-de-uso/public-site/operar-portafolio.md
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

type Json = any

const ROOT = resolve(__dirname, '../../..')
const BASE = join(ROOT, 'tmp/portfolio')
const RUNTIME = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const SITE = process.env.PUBLIC_WEBSITE_BASE_URL || 'https://efeoncepro.com'
const VALUE_FLAGS = ['message', 'from', 'revision', 'out']
const INTERNAL = ['clientApproval', 'greenhouseOrganizationId', '"revision"']

const fail = (message: string): never => {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const ok = (message: string) => console.log(`✓ ${message}`)
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))

const write = (file: string, value: unknown) => {
  mkdirSync(resolve(file, '..'), { recursive: true })
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}

const flag = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`)

  return index >= 0 ? args[index + 1] : undefined
}

const has = (args: string[], name: string) => args.includes(`--${name}`)

const positional = (args: string[]) =>
  args.filter((arg, index) => !arg.startsWith('--') && !(index > 0 && VALUE_FLAGS.includes(args[index - 1].slice(2))))

const slugOf = (args: string[]) => {
  const slug = positional(args)[0]

  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail('Falta el slug del proyecto (minúsculas con guiones).')

  return slug as string
}

const paths = (slug: string) => {
  const dir = join(BASE, slug)

  return { dir, live: join(dir, 'live.json'), work: join(dir, 'working.json') }
}

const messageOf = (args: string[]) => flag(args, 'message')?.trim() || fail('Cada cambio necesita --message con el porqué.')

// ── Remote: WP-CLI over SSH through the repo wrapper; data travels as --input-file, never as arguments ──

function remote(command: string, positionalArgs: string[] = [], assoc: Record<string, unknown> = {}, documentFile?: string) {
  const request = join(BASE, '.remote-request.json')

  write(request, { command, positional: positionalArgs, assoc })
  const inputs = ['--input-file', request, ...(documentFile ? ['--input-file', documentFile] : [])]

  try {
    const out = execFileSync('pnpm', ['-s', 'public-website:wpcli', '--', '--eval-file', 'scripts/public-website/portfolio/remote.php', ...inputs, '--wp-user', '12'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const match = out.match(/---EOP-BEGIN---\n([\s\S]*?)\n?---EOP-END---/)

    return match ? match[1].trim() : fail(`Salida inesperada del sitio:\n${out.slice(-800)}`)
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string }
    const text = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.replace(/---EOP-BEGIN---\n?/, '').trim()

    return fail(`El sitio rechazó «${command}»:\n${text.slice(-1500)}`)
  }
}

// ── Local: the plugin's validator and projection, without WordPress ──

function local(mode: 'validate' | 'project', file: string, publish = false): { code: number; out: Json } {
  try {
    const out = execFileSync('php', [join(__dirname, 'local.php'), mode, file, ...(publish ? ['publish'] : [])], {
      encoding: 'utf8',
      env: { ...process.env, PUBLIC_SITE_RUNTIME_ROOT: RUNTIME }
    })

    return { code: 0, out: JSON.parse(out) }
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string }

    if (err.status === 1 && err.stdout) return { code: 1, out: JSON.parse(err.stdout) }

    return fail(`No se pudo correr el validador local: ${err.stderr ?? error}`)
  }
}

function printIssues(issues: Json[], label: string) {
  for (const issue of issues) console.log(`  ${label} ${issue.code} en ${issue.path || '/'}: ${issue.message}`)
}

function checkLocal(file: string, publish: boolean) {
  const { out } = local('validate', file, publish)

  if (!out.valid) {
    printIssues(out.issues, '✗')
    fail('El documento no cumple portfolio-entry.v1; no se envió nada.')
  }

  if (publish && out.publishIssues.length) {
    printIssues(out.publishIssues, '✗')
    fail('Válido como borrador, pero no se puede publicar todavía.')
  }

  return out
}

function http(url: string, extra: string[] = []) {
  try {
    return execFileSync('curl', ['-s', '--max-time', '20', '-A', 'Mozilla/5.0 eo-portfolio-cli', ...extra, url], { encoding: 'utf8' })
  } catch (error) {
    return String((error as { stdout?: string }).stdout ?? '')
  }
}

const httpCode = (url: string) => http(url, ['-o', '/dev/null', '-w', '%{http_code}']) || '000'

// ── Commands ──

function list() {
  const rows: Json[] = JSON.parse(remote('list', [], { format: 'json' }) || '[]')

  if (!rows.length) return console.log('Sin proyectos en el sitio.')
  for (const row of rows) console.log(`${row.state === 'publish' ? '● publicado' : '○ borrador '}  r${row.revision}  ${row.slug}  — ${row.title}`)

  return rows
}

function pull(slug: string) {
  const { dir, live, work } = paths(slug)
  const doc = JSON.parse(remote('export', [slug]))

  mkdirSync(dir, { recursive: true })
  write(live, doc)

  if (existsSync(work)) {
    const current = read(work)

    if (current.revision !== doc.revision) {
      copyFileSync(work, join(dir, `working-r${current.revision ?? 'nuevo'}-${Date.now()}.json`))
      console.log(`! Tu copia de trabajo partía de la revisión ${current.revision}; la guardé aparte y la reemplacé por la ${doc.revision}.`)
    }
  }

  write(work, doc)
  ok(`${slug}: revisión ${doc.revision} en ${work}`)
}

function startNew(slug: string, args: string[]) {
  const from = flag(args, 'from') || fail('Indica --from <archivo.json> con el documento de partida.')
  const doc = read(resolve(process.cwd(), from as string))
  const { work } = paths(slug)

  if (existsSync(work) && !has(args, 'force')) fail(`Ya hay una copia de trabajo en ${work} (usa --force para reemplazarla).`)
  const rows: Json[] = JSON.parse(remote('list', [], { format: 'json' }) || '[]')

  if (rows.some(row => row.slug === slug)) fail(`«${slug}» ya existe en el sitio: usa \`pull ${slug}\`.`)
  doc.schema = 'portfolio-entry.v1'
  doc.slug = slug
  delete doc.revision
  delete doc.updatedAt
  write(work, doc)
  ok(`Copia de trabajo nueva en ${work}. Edítala y corre \`validate ${slug}\`.`)
}

function validate(slug: string, args: string[]) {
  const { work } = paths(slug)

  if (!existsSync(work)) fail(`No hay copia de trabajo de «${slug}»: corre \`pull\` o \`new\`.`)
  const out = checkLocal(work, false)
  const gate = local('validate', work, true).out.publishIssues as Json[]

  ok(`${slug}: cumple portfolio-entry.v1.`)

  if (gate.length) {
    printIssues(gate, '·')
    console.log('  Se puede guardar como borrador; para publicar falta lo anterior.')
  } else {
    ok('Tiene aprobación del cliente con alcance: se puede publicar.')
  }

  if (has(args, 'remote')) {
    console.log(remote('validate', [], { format: 'json', publish: true }, work))
  }

  return out
}

function preview(slug: string) {
  const { work } = paths(slug)

  if (!existsSync(work)) fail(`No hay copia de trabajo de «${slug}».`)
  const { code, out } = local('project', work)

  if (code) {
    printIssues(out.issues, '✗')
    fail('Corrige el documento antes de previsualizar.')
  }

  const entry = out.entry
  const hidden = ['results', 'chapters', 'testimonial'].filter(key => !(key in entry))

  console.log(`Alcance aprobado: ${out.scope.length ? out.scope.join(', ') : '(ninguno)'}`)
  console.log(`Se publicaría: ${Object.keys(entry).join(', ')}`)
  if (hidden.length) console.log(`Oculto por el alcance o por no existir: ${hidden.join(', ')}`)
  if (entry.measure) console.log(`Órbita de medida: ${entry.measure.value} % ${entry.measure.label} (${entry.measure.source})`)
  if (entry.formats) console.log(`Formatos: ${entry.formats.map((f: Json) => `${f.kind} ${f.format}`).join(', ')}`)
  write(join(paths(slug).dir, 'preview.json'), out)
  ok(`Proyección completa en ${join(paths(slug).dir, 'preview.json')}`)
}

function diff(slug: string) {
  const { live, work } = paths(slug)

  if (!existsSync(work)) fail(`No hay copia de trabajo de «${slug}».`)
  const before = existsSync(live) ? read(live) : {}
  const after = read(work)
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(key => !['revision', 'updatedAt'].includes(key))
  const changed = keys.filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))

  console.log(changed.length ? `Cambia: ${changed.join(', ')}` : 'Sin cambios frente a la versión viva.')
}

function apply(slug: string, args: string[]) {
  const { dir, live, work } = paths(slug)

  if (!existsSync(work)) fail(`No hay copia de trabajo de «${slug}».`)
  const message = messageOf(args)

  checkLocal(work, false)
  ok('Validación local con el validador del plugin.')
  console.log(remote('apply', [], { message, 'dry-run': true }, work))
  if (has(args, 'dry-run')) return ok('Dry run: nada se guardó.')
  if (existsSync(live)) copyFileSync(live, join(dir, `before-r${read(live).revision}-${Date.now()}.json`))
  console.log(remote('apply', [], { message }, work))
  pull(slug)
}

function setState(command: 'publish' | 'unpublish', slug: string, args: string[]) {
  const message = messageOf(args)

  if (command === 'publish') {
    const { work } = paths(slug)

    if (existsSync(work)) checkLocal(work, true)
    console.log(remote('publish', [slug], { message, 'dry-run': true }))
    if (has(args, 'dry-run')) return ok('Dry run: nada se publicó.')
  }

  console.log(remote(command, [slug], { message }))
  verify(slug)
}

function verify(slug?: string) {
  const index = http(`${SITE}/wp-json/eo/v1/portfolio`)
  let projects: Json[] = []

  try {
    projects = JSON.parse(index).projects
  } catch {
    fail(`La REST del portafolio no respondió JSON: ${index.slice(0, 200)}`)
  }

  const leaks = INTERNAL.filter(key => index.includes(key))

  console.log(`REST /wp-json/eo/v1/portfolio: ${projects.length} publicado(s)${leaks.length ? `, ✗ expone ${leaks.join(', ')}` : ''}`)
  console.log(`/portafolio/ → ${httpCode(`${SITE}/portafolio/`)}`)
  if (leaks.length) fail('La REST expone campos internos.')
  if (!slug) return

  const listed = projects.some(project => project.slug === slug)
  const entry = http(`${SITE}/wp-json/eo/v1/portfolio/${slug}`)
  const entryCode = httpCode(`${SITE}/wp-json/eo/v1/portfolio/${slug}`)
  const entryLeaks = INTERNAL.filter(key => entry.includes(key))

  console.log(`${slug}: ${listed ? 'en el índice' : 'fuera del índice'}, REST ${entryCode}, página /portafolio/${slug}/ → ${httpCode(`${SITE}/portafolio/${slug}/`)}`)
  if (entryLeaks.length) fail(`La entrada expone ${entryLeaks.join(', ')}.`)
  if (listed !== (entryCode === '200')) fail('El índice y la entrada no coinciden; purga la caché y vuelve a verificar.')
  ok('Sin campos internos en lo público.')
}

const HELP = `pnpm public-website:portfolio -- <comando>

  list                                  proyectos del sitio con estado y revisión
  pull <slug>                           trae el documento vivo a tmp/portfolio/<slug>/working.json
  new <slug> --from <archivo.json>      copia de trabajo nueva desde un documento de partida
  validate <slug> [--remote]            validador del plugin en local (y en el sitio con --remote)
  preview <slug>                        qué vería el público según el alcance de la aprobación
  diff <slug>                           qué campos cambian frente a la versión viva
  apply <slug> --message "<por qué>" [--dry-run]       guarda una revisión (nunca publica)
  publish <slug> --message "<por qué>" [--dry-run]     exige aprobación del cliente con alcance
  unpublish <slug> --message "<por qué>"
  revisions <slug>                      historial con autor y mensaje
  log <slug>                            quién publicó o despublicó y con qué aprobación (interno)
  restore <slug> <revisión> --message "<por qué>"      crea una revisión nueva con ese contenido
  verify [<slug>]                       REST pública, índice y página, sin campos internos

apply, publish, unpublish y restore escriben en producción: necesitan el OK del operador.
Manual: docs/manual-de-uso/public-site/operar-portafolio.md`

function main() {
  const [command, ...args] = process.argv.slice(2).filter(arg => arg !== '--')

  switch (command) {
    case 'list':
      list()
      break
    case 'pull':
      pull(slugOf(args))
      break
    case 'new':
      startNew(slugOf(args), args)
      break
    case 'validate':
      validate(slugOf(args), args)
      break
    case 'preview':
      preview(slugOf(args))
      break
    case 'diff':
      diff(slugOf(args))
      break
    case 'apply':
      apply(slugOf(args), args)
      break
    case 'publish':
    case 'unpublish':
      setState(command, slugOf(args), args)
      break
    case 'revisions':
    case 'log':
      console.log(remote(command, [slugOf(args)], {}))
      break

    case 'restore': {
      const [slug, revision] = positional(args)

      if (!slug || !/^\d+$/.test(revision ?? '')) fail('Uso: restore <slug> <revisión> --message "<por qué>"')
      console.log(remote('restore', [slug, revision], { message: messageOf(args) }))
      pull(slug)
      break
    }

    case 'verify':
      verify(positional(args)[0])
      break
    default:
      console.log(HELP)
  }
}

main()
