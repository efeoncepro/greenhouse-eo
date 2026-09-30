// Núcleo compartido del plano de control del creative-workbench.
//
// El workbench es un CLIENTE gobernado de greenhouse-eo: todo lo que el equipo creativo recibe
// (skills, CLIs, docs, gates) sale de acá por un único camino — `buildPlan()` — y queda sellado con
// su sha256 en `.workbench/sync.lock.json` del repo destino. Lo que el lock declara, el equipo no lo
// edita: el gate `managed-drift` de su CI lo detecta y el próximo sync lo pisa.
//
// Desde 2026-09-30 hay una segunda clase: rutas NATIVAS (el harness propio del workbench). Las
// declara el manifest de acá, viajan selladas en el lock y el sync no las escribe ni las borra.
//
// 🔴 Se exporta desde un REF de git (HEAD por defecto), nunca desde el working tree. El checkout es
// compartido por varias sesiones: exportar el disco arrastraría trabajo sin commitear de otra sesión
// al equipo creativo, con un sello que diría "commit X" sin serlo. Pasó en el bootstrap (2026-09-29).
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, globSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { builtinModules } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const HERE = path.join(ROOT, 'scripts/creative-workbench')
export const TEMPLATE_REL = 'scripts/creative-workbench/template'
export const LOCK_REL = '.workbench/sync.lock.json'
export const REPORT_REL = '.workbench/export-report.json'

// Lo mínimo que hay que extraer del ref para construir el plan. Todo lo que el plan puede tocar vive aquí.
const SOURCE_PATHSPECS = [
  '.claude/skills',
  '.codex/skills',
  'scripts',
  'src/lib',
  'docs/operations',
  'docs/architecture',
  'docs/manual-de-uso/creative',
  'docs/documentation/creative',
  'package.json',
  'tsconfig.json'
]

const toPosix = p => p.split(path.sep).join('/')

export const sha256 = buf => createHash('sha256').update(buf).digest('hex')

export function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

/**
 * Rutas NATIVAS: las posee el workbench (su harness), no greenhouse-eo. El sync no las escribe ni las
 * borra, y el gate managed-drift no las compara. La lista la decide greenhouse-eo en el manifest y
 * viaja SELLADA en `sync.lock.json` (`native`): el workbench no puede eximirse a sí mismo.
 *
 * Formas admitidas: ruta exacta (`AGENTS.md`) o carpeta completa (`brands/**`). Nada más: un patrón
 * más expresivo es una frontera que nadie puede leer de un vistazo. Mismo matcher en
 * `template/gates/lib.mjs` (los gates corren sin dependencias).
 */
export function validateNativePatterns(patterns, reserved = []) {
  const stem = p => (p.endsWith('/**') ? p.slice(0, -2) : p)

  for (const p of patterns) {
    // Forma canónica y nada más: sin './', sin segmentos vacíos o '.', sin '/' final ni '\\'. Una ruta
    // no canónica no calza con ninguna ruta del plan: se creería nativa y el sync la pisaría igual.
    const segments = typeof p === 'string' ? stem(p).replace(/\/$/, '').split('/') : []

    const bad =
      typeof p !== 'string' ||
      !p ||
      p.startsWith('/') ||
      p.includes('\\') ||
      (p.endsWith('/') && !p.endsWith('/**')) ||
      segments.some(seg => seg === '' || seg === '.' || seg === '..') ||
      (/[*?[{]/.test(p) && !/^[^*?[{]+\/\*\*$/.test(p))

    if (bad) throw new Error(`native.paths: "${p}" no es una ruta exacta ni una carpeta "dir/**"`)
    if (p === '.workbench/**' || p.startsWith('.workbench/'))
      throw new Error('native.paths: .workbench/ es del plano de control y no puede ser nativo')

    // Reservado = cómo greenhouse-eo controla el workbench (gates, su workflow, el sello).
    const clash = reserved.find(r => isNative(stem(p), [r]) || isNative(stem(r), [p]))

    if (clash) throw new Error(`native.paths: "${p}" se cruza con la ruta reservada "${clash}"`)
  }

  // package.json y su lockfile van juntos: con sólo uno nativo, el sync escribiría un package.json sin
  // poder regenerar el lock (o regeneraría y sellaría un lock que resuelve el manifest del workbench).
  if (isNative('package.json', patterns) !== isNative('pnpm-lock.yaml', patterns))
    throw new Error('native.paths: package.json y pnpm-lock.yaml son nativos los dos o ninguno')

  return patterns
}

/**
 * Clientes que puede producir un miembro. `"todos"` (en el miembro, o `clientesPorDefecto` si el miembro
 * no declara) = todos los de `control.clientes`, incluidos los que se agreguen después.
 */
export function memberClients(member, control) {
  const declared = member.clientes ?? control.clientesPorDefecto ?? []

  return declared === 'todos' ? [...control.clientes] : declared
}

export function isNative(rel, patterns = []) {
  return patterns.some(p => (p.endsWith('/**') ? rel.startsWith(p.slice(0, -2)) : rel === p))
}

/**
 * Qué hace un sync sobre el checkout del workbench, sin tocar el disco.
 *
 * - `added` / `changed`: rutas del plan que se escriben.
 * - `removed`: gestionadas en el sello anterior que el plan ya no trae (se borran).
 * - `handedOff`: gestionadas en el sello anterior que pasaron a nativas: se sueltan del sello SIN
 *   borrarlas (borrarlas destruiría el harness del workbench).
 * - `collisions`: rutas del plan que existen en el workbench sin haber sido gestionadas. El sync no
 *   pisa trabajo que no es suyo: aborta y hay que decidir de quién es la ruta.
 *
 * `targetHash(rel)` devuelve el sha256 del archivo en el workbench, o null si no existe.
 */
export function reconcile({ plan, previous, native = [], targetHash }) {
  const previousFiles = previous?.files ?? {}
  const out = { added: [], changed: [], removed: [], handedOff: [], collisions: [] }

  for (const [rel, { content }] of plan) {
    const current = targetHash(rel)

    if (current === null) out.added.push(rel)
    else if (current !== sha256(content)) {
      // Sin sello previo (bootstrap) todo es del plan; con sello, sólo lo que el sello gestionaba.
      if (previous && !(rel in previousFiles)) out.collisions.push(rel)
      else out.changed.push(rel)
    }
  }

  for (const rel of Object.keys(previousFiles)) {
    if (plan.has(rel) || rel === 'pnpm-lock.yaml') continue
    if (isNative(rel, native)) out.handedOff.push(rel)
    else out.removed.push(rel)
  }

  // El lockfile de pnpm no está en el plan: se regenera. Si pasó a nativo, también se suelta.
  if ('pnpm-lock.yaml' in previousFiles && isNative('pnpm-lock.yaml', native)) out.handedOff.push('pnpm-lock.yaml')

  for (const list of Object.values(out)) list.sort()

  return out
}

/** Manifest y control del working tree: lo usan access/provision, que aplican estado deseado local. */
export function loadManifest(root = ROOT) {
  return readJson(path.join(root, 'scripts/creative-workbench/export-manifest.json'))
}

export function loadControl(root = ROOT) {
  return readJson(path.join(root, 'scripts/creative-workbench/control.json'))
}

export function resolveTarget(manifest, override) {
  return path.resolve(ROOT, override ?? manifest.target.localPath)
}

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024, ...opts })

  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} falló (${r.status}):\n${(r.stderr || r.stdout || '').trim()}`)
  }

  return r
}

export function resolveRef(ref = 'HEAD') {
  return run('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: ROOT }).stdout.trim()
}

/** Rutas exportables con cambios sin commitear: NO viajan (se exporta el ref). Sólo para avisar. */
export function uncommittedExportable() {
  const r = run('git', ['status', '--porcelain', '--', ...SOURCE_PATHSPECS], { cwd: ROOT, allowFail: true })

  return r.stdout
    .split('\n')
    .filter(Boolean)
    .map(l => l.slice(3))
}

/** Extrae el ref a un directorio temporal (export, no checkout: no hay worktree ni índice). */
function extractRef(commit) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'creative-workbench-src-'))

  const archive = spawnSync('git', ['archive', '--format=tar', commit, '--', ...SOURCE_PATHSPECS], {
    cwd: ROOT,
    maxBuffer: 2 * 1024 * 1024 * 1024
  })

  if (archive.status !== 0) {
    rmSync(dir, { recursive: true, force: true })
    throw new Error(`git archive ${commit} falló: ${archive.stderr}`)
  }

  const untar = spawnSync('tar', ['-x', '-C', dir], { input: archive.stdout, maxBuffer: 1024 })

  if (untar.status !== 0) {
    rmSync(dir, { recursive: true, force: true })
    throw new Error(`tar falló: ${untar.stderr}`)
  }

  return dir
}

/** Todos los archivos bajo `dir`, incluidos los ocultos, como rutas posix relativas a `dir`. */
export function walk(dir) {
  if (!existsSync(dir)) return []

  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(d => d.isFile())
    .map(d => toPosix(path.relative(dir, path.join(d.parentPath, d.name))))
    .filter(rel => !rel.split('/').includes('.DS_Store'))
    .sort()
}

function expandGlobs(src, patterns) {
  const out = new Set()

  for (const pattern of patterns) {
    if (!/[*?[{]/.test(pattern)) {
      if (!existsSync(path.join(src, pattern)))
        throw new Error(`export-manifest declara ${pattern} y no existe en el ref`)
      out.add(pattern)
      continue
    }

    for (const f of globSync(pattern, { cwd: src })) {
      const rel = toPosix(f)

      if (statSync(path.join(src, rel)).isFile() && !rel.endsWith('.DS_Store')) out.add(rel)
    }
  }

  return out
}

const isTest = rel => /\.(test|spec)\.(m?[jt]s|tsx)$/.test(rel)

/** Scripts de package.json que se exportan, con su comando literal. */
export function exportedScripts(manifest, src = ROOT) {
  const pkg = readJson(path.join(src, 'package.json'))
  const matches = (name, pattern) => (pattern.endsWith('*') ? name.startsWith(pattern.slice(0, -1)) : name === pattern)
  const out = {}

  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    if (manifest.scripts.include.some(p => matches(name, p)) && !manifest.scripts.exclude.includes(name))
      out[name] = cmd
  }

  return out
}

/** Archivos de entrada de un comando de script: tokens que son rutas de código existentes. */
function entrypointsOf(cmd, src) {
  return cmd
    .split(/\s+/)
    .map(t => t.replace(/^\.\//, ''))
    .filter(t => /\.(m?[jt]s|cjs)$/.test(t) && existsSync(path.join(src, t)))
}

/**
 * Cierre de código local de los CLIs: todo archivo fuente alcanzable por import desde algún
 * entrypoint exportado, más los paquetes npm externos que importan.
 *
 * Se calcula con esbuild en cada sync a propósito: una lista a mano se desactualiza en cuanto un CLI
 * importa un módulo nuevo, y el workbench se rompería en silencio del lado del equipo.
 */
export async function codeClosure(manifest, src = ROOT) {
  const { build } = await import('esbuild')

  const entries = [
    ...new Set(Object.values(exportedScripts(manifest, src)).flatMap(cmd => entrypointsOf(cmd, src)))
  ].sort()

  const result = await build({
    entryPoints: entries.map(e => path.join(src, e)),
    absWorkingDir: src,
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    metafile: true,
    packages: 'external',
    tsconfig: path.join(src, 'tsconfig.json'),
    outdir: path.join(src, '.closure-out'),
    logLevel: 'silent'
  })

  const files = new Set()
  const external = new Set()

  for (const [input, info] of Object.entries(result.metafile.inputs)) {
    if (!input.includes('node_modules')) files.add(toPosix(input))

    for (const im of info.imports) {
      if (!im.external || im.path.startsWith('node:') || builtinModules.includes(im.path.split('/')[0])) continue
      external.add(im.path.startsWith('@') ? im.path.split('/').slice(0, 2).join('/') : im.path.split('/')[0])
    }
  }

  for (const rel of files) {
    const hit = manifest.code.forbiddenRoots.find(
      root => rel === root || rel.startsWith(`${root}/`) || rel.startsWith(`${root}.`)
    )

    if (hit)
      throw new Error(
        `El cierre de código de los CLIs alcanza ${rel} (raíz prohibida ${hit}). Corta ese import antes de exportar.`
      )
  }

  return { entries, files, external }
}

/** Versión a fijar para un paquete externo: la declarada en el ref, o la instalada si es transitiva. */
export function pinnedVersion(name, src = ROOT) {
  const pkg = readJson(path.join(src, 'package.json'))
  const declared = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]

  if (declared) return declared

  const installed = path.join(ROOT, 'node_modules', name, 'package.json')

  if (!existsSync(installed))
    throw new Error(`No puedo fijar versión para ${name}: no está en package.json ni en node_modules`)

  return readJson(installed).version
}

const REF_PATTERN = /(?:docs|src|scripts)\/[A-Za-z0-9_./-]+\.(?:md|ts|mjs|json|tsx)/g

/** Comandos retirados (p. ej. `pnpm foto:generar`) que mencionan los archivos de texto de una skill. */
export function retiredCommandsIn(files, src, config) {
  const pattern = new RegExp(
    `pnpm (?:run )?((?:${config.retiredPrefixes.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[A-Za-z0-9:-]*)`,
    'g'
  )

  const found = new Set()

  for (const rel of files) {
    if (!/\.(md|ya?ml|json|txt)$/.test(rel)) continue
    for (const m of readFileSync(path.join(src, rel), 'utf8').matchAll(pattern)) {
      // `pnpm foto:*` se lee como la familia completa; `pnpm ai:image,` pierde la puntuación final.
      const command = m[1].replace(/-+$/, '')

      found.add(command.endsWith(':') ? `${command}*` : command)
    }
  }

  return [...found].sort()
}

/** Inserta la nota de workbench justo después del frontmatter del SKILL.md (o al inicio si no hay). */
export function withOverlay(text, overlay, commands) {
  const note = overlay.replace('{{comandos}}', commands.map(c => `\`pnpm ${c}\``).join(', ')).trimEnd()
  const fm = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)

  return Buffer.from(fm ? `${fm[0]}\n${note}\n\n${text.slice(fm[0].length)}` : `${note}\n\n${text}`)
}

/**
 * El plan completo para un ref: ruta destino → { content: Buffer, kind }.
 * Lee todo del ref extraído y lo carga en memoria; el directorio temporal se borra antes de volver.
 */
export async function buildPlan({ ref = 'HEAD' } = {}) {
  const commit = resolveRef(ref)
  const src = extractRef(commit)

  try {
    return { ...(await planFromSource(src, commit)), commit }
  } finally {
    rmSync(src, { recursive: true, force: true })
  }
}

/**
 * Plan desde un directorio fuente ya materializado. Sólo `buildPlan` (ref de git) y los tests lo
 * llaman: el sync real nunca exporta el working tree.
 */
export async function planFromSource(src, commit) {
  const manifest = loadManifest(src)
  const native = validateNativePatterns(manifest.native?.paths ?? [], manifest.native?.reserved ?? [])
  const plan = new Map()
  const nativeSkipped = new Set()

  const add = (rel, kind, content) => {
    if (plan.has(rel)) throw new Error(`Colisión en el plan: ${rel} lo aportan ${plan.get(rel).kind} y ${kind}`)

    // Lo nativo es del workbench: greenhouse-eo no lo entrega aunque su plantilla lo tenga.
    if (isNative(rel, native)) {
      if (kind !== 'template' && kind !== 'generated')
        throw new Error(
          `${rel} (${kind}) cae en una ruta nativa: una skill, un CLI o un doc exportado no puede ser del workbench`
        )
      nativeSkipped.add(rel)

      return
    }

    plan.set(rel, { kind, content })
  }

  const fromSrc = rel => readFileSync(path.join(src, rel))

  // 1. Plantilla del workbench (el "chasis": guardarraíles, gates, herramientas, clientes).
  const templateDir = path.join(src, TEMPLATE_REL)

  if (!existsSync(templateDir))
    throw new Error(
      `El ref ${commit.slice(0, 9)} no trae ${TEMPLATE_REL}: commitea el plano de control antes de sincronizar.`
    )

  for (const rel of walk(templateDir)) {
    if (rel === 'package.base.json') continue
    add(rel, 'template', readFileSync(path.join(templateDir, rel)))
  }

  // 2. Skills, espejadas para Claude y Codex desde la misma fuente. Si el manifest declara una nota de
  //    workbench, se inserta al inicio del SKILL.md de cada skill que menciona comandos que allá
  //    pueden estar retirados (la fuente de la skill en greenhouse-eo no cambia).
  const skillFiles = new Map()
  const skillOverlays = {}
  const overlay = manifest.skillOverlay ? readFileSync(path.join(src, manifest.skillOverlay.path), 'utf8') : null

  for (const skill of manifest.skills) {
    const claudeRel = `.claude/skills/${skill}`

    if (!existsSync(path.join(src, claudeRel))) throw new Error(`Skill ${skill} no existe en .claude/skills del ref`)
    const codexRel = existsSync(path.join(src, `.codex/skills/${skill}`)) ? `.codex/skills/${skill}` : claudeRel

    const claudeFiles = walk(path.join(src, claudeRel)).map(r => `${claudeRel}/${r}`)
    const codexFiles = walk(path.join(src, codexRel)).map(r => [`.codex/skills/${skill}/${r}`, `${codexRel}/${r}`])

    skillFiles.set(skill, claudeFiles)

    const commands = overlay
      ? retiredCommandsIn([...claudeFiles, ...codexFiles.map(([, from]) => from)], src, manifest.skillOverlay)
      : []

    if (commands.length) skillOverlays[skill] = commands

    const content = (rel, from) =>
      commands.length && path.basename(rel) === 'SKILL.md'
        ? withOverlay(readFileSync(path.join(src, from), 'utf8'), overlay, commands)
        : fromSrc(from)

    for (const r of claudeFiles) add(r, 'skill', content(r, r))
    for (const [to, from] of codexFiles) add(to, 'skill', content(to, from))
  }

  // 3. Código de los CLIs: cierre de imports + datos declarados.
  const closure = await codeClosure(manifest, src)

  for (const rel of [...new Set([...closure.files, ...expandGlobs(src, manifest.code.extra)])].sort()) {
    if (!isTest(rel)) add(rel, 'code', fromSrc(rel))
  }

  // 4. Docs de la allowlist.
  for (const rel of [...expandGlobs(src, manifest.docs.include)].sort()) {
    const hit = manifest.docs.forbiddenRoots.find(root => rel.startsWith(`${root}/`))

    if (hit) throw new Error(`La allowlist de docs incluye ${rel}, bajo la raíz prohibida ${hit}`)
    add(rel, 'doc', fromSrc(rel))
  }

  // 5. package.json generado: base de la plantilla + scripts exportados + dependencias fijadas.
  const base = readJson(path.join(templateDir, 'package.base.json'))
  const srcPkg = readJson(path.join(src, 'package.json'))
  const deps = {}

  for (const name of [...closure.external, 'tsx'].sort()) deps[name] = pinnedVersion(name, src)

  const pkg = {
    ...base,
    packageManager: srcPkg.packageManager,
    scripts: { ...base.scripts, ...exportedScripts(manifest, src) },
    dependencies: deps
  }

  add('package.json', 'generated', Buffer.from(`${JSON.stringify(pkg, null, 2)}\n`))

  // 6. Configuración del destino, derivada de control.json: el equipo nunca escribe nombres de
  //    proyecto, bucket o secreto a mano (un typo ahí es una llave de otro proyecto o un bucket ajeno).
  const { gcp, clientes } = loadControl(src)

  add(
    'workbench.config.json',
    'generated',
    Buffer.from(
      `${JSON.stringify({ gcpProject: gcp.project, canonBucket: gcp.canonBucket, workBucket: gcp.workBucket, clientes }, null, 2)}\n`
    )
  )

  const envLines = [
    '# pnpm doctor copia este archivo a .env.local. NUNCA pongas una llave cruda: estas variables son',
    '# NOMBRES de secretos; los CLIs leen la llave en memoria con tu identidad Google.',
    `GCP_PROJECT=${gcp.project}`,
    `GOOGLE_CLOUD_PROJECT=${gcp.project}`,
    ...Object.entries(gcp.aiSecrets).map(
      ([envName, secret]) => `${envName}_SECRET_REF=projects/${gcp.project}/secrets/${secret}/versions/latest`
    )
  ]

  add('.env.example', 'generated', Buffer.from(`${envLines.join('\n')}\n`))

  // 7. Reporte: por skill, rutas que cita y que NO viajan al workbench (decisión humana, no error).
  const unresolved = {}

  for (const [skill, files] of skillFiles) {
    const missing = new Set()

    for (const rel of files) {
      if (!/\.(md|ya?ml|json)$/.test(rel)) continue

      for (const ref of readFileSync(path.join(src, rel), 'utf8').match(REF_PATTERN) ?? []) {
        const clean = ref.replace(/[.)]+$/, '')

        if (!plan.has(clean) && existsSync(path.join(src, clean))) missing.add(clean)
      }
    }

    if (missing.size) unresolved[skill] = [...missing].sort()
  }

  const report = {
    generatedFrom: commit,
    counts: Object.fromEntries(
      ['template', 'skill', 'code', 'doc', 'generated'].map(k => [
        k,
        [...plan.values()].filter(e => e.kind === k).length
      ])
    ),
    entrypoints: closure.entries,
    externalPackages: Object.keys(deps),
    // Si package.json es nativo, el workbench declara sus dependencias; estas son las que necesitan
    // los engines que greenhouse-eo sigue entregando. `creative:status` compara contra ellas.
    requiredDependencies: deps,
    skillOverlays,
    native,
    nativeSkipped: [...nativeSkipped].sort(),
    unresolvedSkillRefs: unresolved
  }

  add(REPORT_REL, 'generated', Buffer.from(`${JSON.stringify(report, null, 2)}\n`))

  for (const [rel, entry] of plan) {
    if (entry.content.length > manifest.limits.maxFileBytes)
      throw new Error(`${rel} pesa ${entry.content.length} bytes: supera el límite de exportación`)
  }

  return { plan, report, manifest }
}

/**
 * ¿El sello publicado es el que greenhouse-eo habría escrito para su commit de origen?
 *
 * El gate managed-drift del workbench confía en el sello, y el sello vive en el workbench: alguien
 * podría eximirse agregando una ruta a `native` o reescribir una huella. Esto lo detecta desde acá,
 * recalculando el plan del commit que el propio sello declara. `expected` es `planFromSource` de ese
 * commit. Devuelve la lista de anomalías (vacía = íntegro).
 */
// Lo generado que depende de algo más que el commit: el reporte (versión del generador) y package.json
// (versiones transitivas que se resuelven del node_modules de quien sincroniza). El resto de lo generado
// (workbench.config.json, .env.example) sale sólo de control.json y se compara exacto: ahí viven el
// proyecto GCP, los buckets y los nombres de secreto.
const GENERATED_UNVERIFIABLE = new Set([REPORT_REL, 'package.json'])

export function verifySeal(lock, expected) {
  const problems = []

  if (!lock?.source?.commit) return ['el sello no declara su commit de origen: no se puede verificar']

  const sealedNative = [...(lock.native ?? [])].sort()
  const expectedNative = [...(expected.report.native ?? [])].sort()

  if (JSON.stringify(sealedNative) !== JSON.stringify(expectedNative))
    problems.push(`native sellado [${sealedNative.join(', ')}] ≠ manifest de ese commit [${expectedNative.join(', ')}]`)

  for (const [rel, hash] of Object.entries(lock.files ?? {})) {
    if (rel === 'pnpm-lock.yaml') continue
    const entry = expected.plan.get(rel)

    if (!entry) problems.push(`${rel}: sellado, pero ese commit no lo exporta`)
    else if (!GENERATED_UNVERIFIABLE.has(rel) && sha256(entry.content) !== hash)
      problems.push(`${rel}: la huella sellada no es la del commit`)
  }

  for (const rel of expected.plan.keys())
    if (!(rel in (lock.files ?? {}))) problems.push(`${rel}: el commit lo exporta y el sello no lo tiene`)

  return problems
}

export function readLock(target) {
  const file = path.join(target, LOCK_REL)

  return existsSync(file) ? readJson(file) : null
}
