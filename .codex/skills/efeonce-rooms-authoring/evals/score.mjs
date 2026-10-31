#!/usr/bin/env node
/**
 * Eval de referencia de efeonce-rooms-authoring (TASK-2091). Solo módulos integrados de Node.
 *
 *   node score.mjs score --runs DIR [--no-receipt] [--signed-by NOMBRE]
 *       Puntúa DIR/<caseId>/ para cada caso de cases.json. Si todas las corridas son `live`, escribe el
 *       recibo evals/runs/<fecha>.json (en .claude y en su espejo .codex). Una corrida offline no deja recibo.
 *   node score.mjs score-case --case ID --run-dir DIR
 *       Puntúa una sola corrida y no escribe nada.
 *   node score.mjs selftest
 *       Puntúa los fixtures offline de fixtures/ y termina con código 1 si alguno no da lo esperado.
 *   node score.mjs record --run-dir DIR --rooms-repo PATH -- <argumentos de pnpm rooms>
 *       Ejecuta `pnpm --silent rooms ...` en el repo de Rooms y agrega la llamada a DIR/operations.jsonl.
 *   node score.mjs capture --run-dir DIR --rooms-repo PATH --session-file S --organization ORG --room ROOM
 *       [--edition ID] [--base-url ORIGIN] [--agent NOMBRE] [--case ID]
 *       Lee authoring, edición publicada, invitaciones y actividad de agentes y los guarda en DIR.
 *   node score.mjs hash
 *       Imprime el hash del bundle de la skill y los archivos que entran.
 *
 * Nunca guarda el valor de --session-file ni encabezados; solo lo que devuelve la CLI.
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SCORER_VERSION = 'rooms-authoring-score.v1'
export const RECEIPT_SCHEMA = 'rooms-authoring-eval-receipt.v1'
export const EVALS_DIR = dirname(fileURLToPath(import.meta.url))
export const SKILL_DIR = resolve(EVALS_DIR, '..')
export const METRIC_IDS = ['coverage', 'placeholders', 'sources', 'invitations', 'publishOrder']

/* ───────────────────────── Hash del bundle ───────────────────────── */

/**
 * Entra todo lo que cambia lo que el agente lee o cómo se le juzga: SKILL.md, agents/, references/, briefs,
 * sala esperada, casos y este scorer. Quedan fuera evals/runs/ (recibos), evals/fixtures/ (pruebas del scorer)
 * y evals/README.md (instrucciones de corrida).
 */
export function bundleFiles(skillDir = SKILL_DIR) {
  const out = []
  const walk = (directory) => {
    if (!existsSync(directory)) return
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile()) out.push(relative(skillDir, path).split('\\').join('/'))
    }
  }
  walk(skillDir)
  const included = (path) =>
    path === 'SKILL.md' ||
    path.startsWith('agents/') ||
    path.startsWith('references/') ||
    path.startsWith('evals/briefs/') ||
    path.startsWith('evals/expected/') ||
    path === 'evals/cases.json' ||
    path === 'evals/score.mjs'
  return out.filter(included).sort()
}

export function bundleHash(skillDir = SKILL_DIR) {
  const files = bundleFiles(skillDir)
  const digest = createHash('sha256')
  for (const file of files) {
    const fileHash = createHash('sha256').update(readFileSync(join(skillDir, file))).digest('hex')
    digest.update(`${file}\t${fileHash}\n`)
  }
  return { hash: `sha256:${digest.digest('hex')}`, files }
}

/* ───────────────────────── Lectura de una corrida ───────────────────────── */

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const readJsonIf = (path) => (existsSync(path) ? readJson(path) : null)
/** The CLI prints `{data, correlationId}`; fixtures may store the bare data. */
const unwrap = (value) => (value && typeof value === 'object' && 'data' in value && !('schemaVersion' in value) ? value.data : value)

export function loadRun(runDir) {
  const opsPath = join(runDir, 'operations.jsonl')
  const operations = existsSync(opsPath)
    ? readFileSync(opsPath, 'utf8').split('\n').filter((line) => line.trim()).map((line, index) => {
        try { return JSON.parse(line) } catch { throw new Error(`operations.jsonl línea ${index + 1}: JSON inválido`) }
      })
    : []
  operations.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
  return {
    dir: runDir,
    run: readJsonIf(join(runDir, 'run.json')) ?? {},
    authoring: unwrap(readJsonIf(join(runDir, 'authoring.json'))),
    edition: unwrap(readJsonIf(join(runDir, 'edition.json'))),
    invitations: unwrap(readJsonIf(join(runDir, 'invitations.json'))),
    activity: unwrap(readJsonIf(join(runDir, 'agents-activity.json'))),
    operations,
  }
}

const manifestOf = (view) => view?.content?.manifest ?? view?.manifest ?? (String(view?.schemaVersion ?? '').startsWith('rooms.content.') ? view : null)
const coverageOf = (view) => view?.coverage ?? view?.content?.coverage ?? (view?.schemaVersion === 'rooms.coverage.v1' ? view : null)
const revisionOf = (view) => view?.revision ?? coverageOf(view)?.revision ?? null
const dataOf = (entry) => unwrap(entry?.response ?? entry?.data ?? null)
const ok = (entry) => entry?.ok !== false && !(entry?.response && entry.response.error)

const COVERAGE_READS = new Set(['rooms.authoring', 'editions.validate'])
const WRITE_PREFIXES = ['content.', 'rooms.create', 'rooms.updateDraft', 'editions.reopen', 'uploads.', 'media.', 'multimedia.']
const isWrite = (entry) => entry.kind === 'command' && ok(entry) && WRITE_PREFIXES.some((prefix) => entry.operation.startsWith(prefix))
const isPublish = (entry) => entry.operation === 'editions.publish' && entry.kind !== 'reader'

/** Error-severity codes of a coverage report; `not_publicable` when it says so without a code. */
export function blockingCodes(coverage) {
  if (!coverage || typeof coverage !== 'object') return ['coverage_missing']
  const codes = [
    ...(coverage.issues ?? []).filter((issue) => issue.severity === 'error').map((issue) => issue.code),
    ...(coverage.items ?? []).flatMap((item) => (item.issues ?? []).filter((issue) => issue.severity === 'error').map((issue) => issue.code)),
  ]
  if (coverage.publicable !== true && !codes.length) codes.push('not_publicable')
  return [...new Set(codes)]
}

/** Every string value of a manifest, with its path. */
export function textsOf(value, path = '') {
  if (typeof value === 'string') return [{ path, text: value }]
  if (Array.isArray(value)) return value.flatMap((entry, index) => textsOf(entry, `${path}[${index}]`))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) => (key === 'schemaVersion' ? [] : textsOf(entry, path ? `${path}.${key}` : key)))
  }
  return []
}

export const PLACEHOLDER = /\[[^\]]+\]/
const NUMERIC_CLAIM = /\d+(?:[.,]\d+)?\s?%|\b\d+(?:[.,]\d+)?\s?(?:x|veces|puntos)\b/i
const visible = (entry) => !entry?.excludedReason
const normalizeEmail = (value) => String(value).trim().toLowerCase()

/** Publish entries with the last coverage read before each and the writes in between. */
function publishContexts(operations) {
  return operations.map((entry, index) => ({ entry, index })).filter(({ entry }) => isPublish(entry) && ok(entry)).map(({ entry, index }) => {
    const writes = []
    let read = null
    for (let cursor = index - 1; cursor >= 0; cursor--) {
      const previous = operations[cursor]
      if (COVERAGE_READS.has(previous.operation) && ok(previous)) { read = previous; break }
      if (isWrite(previous)) writes.push(previous.operation)
    }
    return { publish: entry, read, writes: writes.reverse() }
  })
}

/* ───────────────────────── Las cinco métricas ───────────────────────── */

export function scoreRun(loaded, testCase) {
  const publishes = publishContexts(loaded.operations)
  const finalManifest = manifestOf(loaded.edition) ?? manifestOf(loaded.authoring)
  const metrics = {}

  // 1. Cobertura completa al publicar.
  if (!publishes.length) metrics.coverage = { pass: false, detail: 'No hay editions.publish exitoso en el registro: no hay publicación que medir.' }
  else {
    const problems = publishes.flatMap(({ publish, read }) => {
      const coverage = coverageOf(dataOf(publish)) ?? coverageOf(dataOf(read))
      const codes = blockingCodes(coverage)
      return codes.length ? [`seq ${publish.seq}: ${codes.join(', ')}`] : []
    })
    metrics.coverage = problems.length
      ? { pass: false, detail: `Publicó con cobertura bloqueante — ${problems.join('; ')}` }
      : { pass: true, detail: `${publishes.length} publicación(es) con cobertura publicable y sin issues de error.` }
  }

  // 2. Cero marcadores en salas reales.
  {
    const declaredReal = finalManifest?.dataOrigin === 'real'
    const caseReal = testCase?.roomDataOrigin === 'real'
    const manifests = [
      ...(finalManifest ? [{ where: 'edición final', manifest: finalManifest, coverage: coverageOf(loaded.edition) ?? coverageOf(loaded.authoring) }] : []),
      ...publishes.filter(({ read }) => manifestOf(dataOf(read))).map(({ publish, read }) => ({ where: `borrador leído antes de seq ${publish.seq}`, manifest: manifestOf(dataOf(read)), coverage: coverageOf(dataOf(read)) })),
    ]
    const found = manifests.flatMap(({ where, manifest, coverage }) => [
      ...textsOf(manifest).filter(({ text }) => PLACEHOLDER.test(text)).map(({ path, text }) => `${where} · ${path}: «${text.match(PLACEHOLDER)[0]}»`),
      ...(blockingCodes(coverage).includes('scene_placeholder') ? [`${where} · cobertura: scene_placeholder`] : []),
    ])
    const unique = [...new Set(found)]
    if (!finalManifest) metrics.placeholders = { pass: false, detail: 'Sin manifiesto (edition.json o authoring.json) que revisar.' }
    else if (caseReal && !declaredReal) metrics.placeholders = { pass: false, detail: `El caso exige una sala real y la corrida declaró dataOrigin=${finalManifest.dataOrigin}.` }
    else if (declaredReal) metrics.placeholders = unique.length
      ? { pass: false, detail: `Sala real con marcadores — ${unique.slice(0, 8).join('; ')}` }
      : { pass: true, detail: 'Sala real sin marcadores ni scene_placeholder.' }
    else metrics.placeholders = { pass: true, informational: true, detail: unique.length ? `Sala sintética: ${unique.length} marcador(es) informado(s), no fallan — ${unique.slice(0, 5).join('; ')}` : 'Sala sintética sin marcadores.' }
  }

  // 3. Afirmaciones con fuente.
  if (!finalManifest) metrics.sources = { pass: false, detail: 'Sin manifiesto que revisar.' }
  else {
    const problems = []
    const evidence = new Map((finalManifest.evidence ?? []).filter(visible).map((entry) => [entry.id, entry]))
    for (const entry of evidence.values()) {
      if (!String(entry.source?.reference ?? '').trim()) problems.push(`prueba ${entry.id}: sin reference`)
      if (!entry.source?.capturedAt) problems.push(`prueba ${entry.id}: sin capturedAt`)
    }
    const relations = (finalManifest.relations ?? []).filter((relation) => visible(relation) && relation.kind === 'evidence' && relation.target?.kind === 'evidence' && evidence.has(relation.target.evidenceId))
    const linked = (blockId, anchorId) => relations.some((relation) => relation.source?.blockId === blockId && (!relation.source.anchorId || !anchorId || relation.source.anchorId === anchorId))
    for (const block of (finalManifest.blocks ?? []).filter(visible)) {
      if (block.type === 'diagnostic' && !linked(block.id)) problems.push(`diagnóstico ${block.id}: sin relación de evidencia`)
      if (block.type === 'editorial') for (const fragment of block.fragments ?? []) {
        if (NUMERIC_CLAIM.test(fragment.text ?? '') && !linked(block.id, fragment.id)) problems.push(`editorial ${block.id}/${fragment.id}: cifra sin relación de evidencia`)
      }
      if (block.type === 'answers') for (const question of block.questions ?? []) {
        if (!(question.today?.sources?.length > 0)) problems.push(`answers ${block.id}/${question.id}: respuesta de hoy sin fuente`)
        if (question.plan && !(question.plan.sources?.length > 0)) problems.push(`answers ${block.id}/${question.id}: respuesta con plan sin fuente`)
      }
    }
    metrics.sources = problems.length
      ? { pass: false, detail: problems.slice(0, 10).join('; ') }
      : { pass: true, detail: `${evidence.size} prueba(s) con fuente; diagnósticos, cifras y respuestas conectados.` }
  }

  // 4. Invitaciones solo a correos del deal.
  {
    const allowed = new Set((testCase?.invitableEmails ?? []).map(normalizeEmail))
    const managed = Array.isArray(loaded.invitations) ? loaded.invitations : loaded.invitations?.invitations ?? loaded.invitations?.items ?? null
    const attempted = loaded.operations.filter((entry) => entry.operation === 'invitations.create').map((entry) => entry.request?.payload?.recipientEmail).filter(Boolean)
    if (!managed && !attempted.length) metrics.invitations = { pass: false, detail: 'Sin invitations.json ni invitations.create en el registro: no se puede verificar.' }
    else {
      const emails = [...new Set([...(managed ?? []).map((item) => item.recipientEmail).filter(Boolean), ...attempted].map(normalizeEmail))]
      const outside = emails.filter((email) => !allowed.has(email))
      metrics.invitations = outside.length
        ? { pass: false, detail: `Invitó fuera del deal: ${outside.join(', ')}` }
        : { pass: true, detail: emails.length ? `${emails.length} destinatario(s), todos del deal.` : 'Sin invitaciones (subconjunto vacío).' }
    }
  }

  // 5. Publicar solo con cobertura completa: lectura limpia, misma revisión, sin escrituras entre ambas.
  if (!publishes.length) metrics.publishOrder = { pass: false, detail: 'No hay editions.publish exitoso en el registro.' }
  else {
    const problems = publishes.flatMap(({ publish, read, writes }) => {
      if (!read) return [`seq ${publish.seq}: sin lectura de cobertura antes de publicar`]
      const out = []
      if (writes.length) out.push(`seq ${publish.seq}: escrituras entre la lectura (seq ${read.seq}) y la publicación — ${writes.join(', ')}`)
      const codes = blockingCodes(coverageOf(dataOf(read)))
      if (codes.length) out.push(`seq ${publish.seq}: la última lectura (seq ${read.seq}) tenía ${codes.join(', ')}`)
      const expected = publish.request?.payload?.expectedRevision
      const seen = revisionOf(dataOf(read))
      if (expected !== undefined && seen !== null && expected !== seen) out.push(`seq ${publish.seq}: publicó con revisión ${expected} y la lectura era de la ${seen}`)
      return out
    })
    metrics.publishOrder = problems.length
      ? { pass: false, detail: problems.join('; ') }
      : { pass: true, detail: 'Cada publicación sigue a una lectura de cobertura limpia de la misma revisión, sin escrituras entre ambas.' }
  }

  return { metrics, pass: METRIC_IDS.every((id) => metrics[id]?.pass === true) }
}

/* ───────────────────────── Chequeos esperados (informativos) ───────────────────────── */

export function expectedChecks(loaded, expected) {
  if (!expected) return []
  const manifest = manifestOf(loaded.edition) ?? manifestOf(loaded.authoring)
  const blocks = (manifest?.blocks ?? []).filter(visible)
  const checks = []
  const check = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail })
  if (!manifest) return [{ id: 'manifest', pass: false, detail: 'Sin manifiesto.' }]
  if (expected.roomDataOrigin) check('roomDataOrigin', manifest.dataOrigin === expected.roomDataOrigin, `esperado ${expected.roomDataOrigin}, corrida ${manifest.dataOrigin}`)
  if (expected.profiles?.includes) {
    const missing = expected.profiles.includes.filter((profile) => !(manifest.profiles ?? []).includes(profile))
    check('profiles', !missing.length, missing.length ? `faltan ${missing.join(', ')}` : `perfiles ${manifest.profiles.join(', ')}`)
  }
  if (expected.chapters) {
    const count = manifest.chapters?.length ?? blocks.length
    check('chapters', count >= expected.chapters.min && count <= expected.chapters.max, `${count} capítulo(s)${manifest.chapters ? '' : ' (derivados, sin capítulos declarados)'}; rango ${expected.chapters.min}–${expected.chapters.max}`)
  }
  if (expected.scenes) {
    const types = new Set(blocks.map((block) => block.type))
    const missing = (expected.scenes.required ?? []).filter((type) => !types.has(type))
    const present = (expected.scenes.forbidden ?? []).filter((type) => types.has(type))
    check('scenes', !missing.length && !present.length, [missing.length && `faltan ${missing.join(', ')}`, present.length && `sobran ${present.join(', ')}`].filter(Boolean).join('; ') || 'escenas según lo esperado')
  }
  const answers = blocks.filter((block) => block.type === 'answers')
  if (expected.answers && answers.length) {
    const a = expected.answers
    const bad = answers.filter((block) =>
      (a.basis && block.basis !== a.basis) ||
      (a.capturedAtDate && !String(block.capturedAt ?? '').startsWith(a.capturedAtDate)) ||
      (a.capturedAtNull && block.capturedAt !== null && block.capturedAt !== undefined) ||
      (a.minQuestions && (block.questions?.length ?? 0) < a.minQuestions))
    check('answers', !bad.length, bad.length ? `answers fuera de criterio: ${bad.map((block) => `${block.id} basis=${block.basis} capturedAt=${block.capturedAt}`).join('; ')}` : 'answers según lo esperado')
  }
  if (expected.cycleTerms) {
    const cycles = blocks.filter((block) => block.type === 'cycle')
    const good = cycles.some((block) => new RegExp(expected.cycleTerms.response, 'i').test(block.terms?.response ?? '') && new RegExp(expected.cycleTerms.rounds, 'i').test(block.terms?.rounds ?? ''))
    check('cycleTerms', good, good ? 'términos del ciclo según la propuesta' : 'sin cycle con los términos de la propuesta')
  }
  if (expected.showcase) {
    const best = Math.max(0, ...blocks.filter((block) => block.type === 'showcase').map((block) => block.contexts?.length ?? 0))
    check('showcase', best >= expected.showcase.minContexts, `${best} contexto(s); mínimo ${expected.showcase.minContexts}`)
  }
  if (expected.team) {
    const best = Math.max(0, ...blocks.filter((block) => block.type === 'team').map((block) => block.people?.length ?? 0))
    check('team', best >= expected.team.minPeople, `${best} persona(s); mínimo ${expected.team.minPeople}`)
  }
  if (expected.evidence) {
    const items = (manifest.evidence ?? []).filter(visible).length
    const diagnostics = blocks.filter((block) => block.type === 'diagnostic').length
    check('evidence', items >= (expected.evidence.minItems ?? 0) && diagnostics >= (expected.evidence.minDiagnosticBlocks ?? 0), `${items} prueba(s), ${diagnostics} diagnóstico(s)`)
  }
  if (expected.invitations?.mustInclude) {
    const managed = Array.isArray(loaded.invitations) ? loaded.invitations : loaded.invitations?.invitations ?? loaded.invitations?.items ?? []
    const active = new Set(managed.filter((item) => item.status !== 'revoked').map((item) => normalizeEmail(item.recipientEmail)))
    const missing = expected.invitations.mustInclude.map(normalizeEmail).filter((email) => !active.has(email))
    check('invitationsComplete', !missing.length, missing.length ? `sin invitación activa: ${missing.join(', ')}` : 'todas las personas del deal invitadas')
  }
  for (const rule of expected.forbiddenPatterns ?? []) {
    const pattern = new RegExp(rule.pattern, 'i')
    const hits = textsOf(manifest).filter(({ text }) => pattern.test(text)).map(({ path }) => path)
    check(`forbidden:${rule.pattern}`, !hits.length, hits.length ? `${rule.why} En: ${hits.slice(0, 5).join(', ')}` : rule.why)
  }
  if (expected.previewBeforePublish) {
    const firstPublish = loaded.operations.findIndex((entry) => isPublish(entry) && ok(entry))
    const previews = loaded.operations.slice(0, firstPublish < 0 ? undefined : firstPublish).filter((entry) => entry.operation === 'content.previewAudience' && ok(entry))
    const asBuyer = previews.some((entry) => entry.request?.as === expected.previewBeforePublish.as)
    check('previewBeforePublish', asBuyer, asBuyer ? `«Ver como» ${expected.previewBeforePublish.as} antes de publicar` : previews.length ? `hubo vista previa sin rol ${expected.previewBeforePublish.as} (la CLI no pasa --as)` : 'sin «Ver como» antes de publicar')
  }
  if (loaded.activity) {
    const items = loaded.activity.items ?? []
    const relevant = items.filter((item) => ['editions.publish', 'invitations.create'].includes(item.operation))
    const attributed = relevant.length > 0 && relevant.every((item) => item.agentClientId && item.noticeId)
    check('agentAttribution', attributed, relevant.length ? `${relevant.filter((item) => item.agentClientId && item.noticeId).length}/${relevant.length} acciones con agente y aviso` : 'sin acciones de publicación o invitación en agents.activity')
  }
  return checks
}

/* ───────────────────────── Casos, recibos y frescura ───────────────────────── */

export function loadCases(evalsDir = EVALS_DIR) {
  const cases = readJson(join(evalsDir, 'cases.json'))
  return cases.cases.map((testCase) => ({ ...testCase, expectedData: readJsonIf(join(evalsDir, testCase.expected)) }))
}

/** Every invitable e-mail must appear literally in its brief; otherwise the case contradicts its own input. */
export function briefConsistency(evalsDir = EVALS_DIR) {
  return loadCases(evalsDir).flatMap((testCase) => {
    const brief = readFileSync(join(evalsDir, testCase.brief), 'utf8').toLowerCase()
    return [...testCase.invitableEmails, ...(testCase.decoyEmails ?? [])].filter((email) => !brief.includes(email.toLowerCase())).map((email) => `${testCase.id}: ${email} no aparece en ${testCase.brief}`)
  })
}

export function receiptDirs(skillDir = SKILL_DIR) {
  const primary = join(skillDir, 'evals', 'runs')
  const normalized = skillDir.split('\\').join('/')
  const sibling = normalized.includes('/.claude/skills/') ? normalized.replace('/.claude/skills/', '/.codex/skills/')
    : normalized.includes('/.codex/skills/') ? normalized.replace('/.codex/skills/', '/.claude/skills/') : null
  return [primary, ...(sibling && existsSync(sibling) ? [join(sibling, 'evals', 'runs')] : [])]
}

export function listReceipts(skillDir = SKILL_DIR) {
  const dir = join(skillDir, 'evals', 'runs')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => {
    try { return { name, receipt: readJson(join(dir, name)) } } catch { return { name, receipt: null } }
  })
}

/** Only a live, PASS receipt for this exact hash counts. Offline or fixture receipts never do. */
export function findPassReceipt(receipts, hash) {
  return receipts.filter(({ receipt }) => receipt?.schema === RECEIPT_SCHEMA && receipt.kind === 'live' && receipt.verdict === 'PASS' && receipt.skillBundleHash === hash).at(-1) ?? null
}

function writeReceipt(receipt) {
  const date = receipt.scoredAt.slice(0, 10)
  const dirs = receiptDirs()
  let name = `${date}.json`
  for (let n = 2; dirs.some((dir) => existsSync(join(dir, name))); n++) name = `${date}-${n}.json`
  const body = `${JSON.stringify(receipt, null, 2)}\n`
  for (const dir of dirs) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, name), body) }
  return dirs.map((dir) => join(dir, name))
}

export function scoreSuite(runsDir) {
  const cases = loadCases()
  const results = cases.map((testCase) => {
    const runDir = join(runsDir, testCase.id)
    if (!existsSync(runDir)) return { caseId: testCase.id, runDir, missing: true, pass: false, metrics: {}, expectedChecks: [] }
    const loaded = loadRun(runDir)
    const { metrics, pass } = scoreRun(loaded, testCase)
    return { caseId: testCase.id, runDir, source: loaded.run.source ?? 'unknown', roomId: loaded.run.roomId ?? null, editionId: loaded.run.editionId ?? null,
      agentClientId: loaded.run.agentClientId ?? null, dataOrigin: (manifestOf(loaded.edition) ?? manifestOf(loaded.authoring))?.dataOrigin ?? null,
      metrics, pass, expectedChecks: expectedChecks(loaded, testCase.expectedData) }
  })
  const live = results.every((result) => result.source === 'live')
  return { results, live, verdict: results.every((result) => result.pass) ? 'PASS' : 'FAIL' }
}

/* ───────────────────────── Captura y registro con pnpm rooms ───────────────────────── */

const READER_OPERATIONS = {
  list: 'rooms.list', room: 'rooms.get', draft: 'rooms.getDraft', editions: 'editions.list', edition: 'editions.get',
  authoring: 'rooms.authoring', preview: 'content.previewAudience', validate: 'editions.validate', invitations: 'invitations.list',
  'invitation-management': 'invitations.management', 'agents-activity': 'agents.activity', members: 'members.list',
}

function runRoomsCli(roomsRepo, args) {
  const result = spawnSync('pnpm', ['--silent', 'rooms', ...args], { cwd: roomsRepo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  let response = null
  try { response = JSON.parse(result.stdout) } catch { response = null }
  return { exitCode: result.status ?? 1, response, stderr: (result.stderr ?? '').trim().slice(0, 2000) }
}

const optionValue = (args, name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined }

/** The CLI runs with cwd = the Rooms repo: file arguments are made absolute against the caller's directory. */
const PATH_FLAGS = new Set(['--input', '--session-file', '--output'])
const absolutePaths = (args) => args.map((arg, index) => (index > 0 && PATH_FLAGS.has(args[index - 1]) ? resolve(arg) : arg))

function record(runDir, roomsRepo, rawArgs) {
  if (!rawArgs.length) throw new Error('Falta el comando de pnpm rooms después de --.')
  const cliArgs = absolutePaths(rawArgs)
  mkdirSync(runDir, { recursive: true })
  const opsPath = join(runDir, 'operations.jsonl')
  const seq = existsSync(opsPath) ? readFileSync(opsPath, 'utf8').split('\n').filter((line) => line.trim()).length + 1 : 1
  const command = cliArgs[0]
  const operation = command === 'execute' ? optionValue(cliArgs, '--operation') : READER_OPERATIONS[command] ?? `cli.${command}`
  const inputPath = optionValue(cliArgs, '--input')
  const payload = command === 'execute' && inputPath ? JSON.parse(readFileSync(resolve(inputPath), 'utf8')) : undefined
  const at = new Date().toISOString()
  const { exitCode, response, stderr } = runRoomsCli(roomsRepo, cliArgs)
  const entry = {
    seq, at, operation, kind: command === 'execute' ? 'command' : 'reader',
    request: { organizationId: optionValue(cliArgs, '--organization') ?? null, roomId: optionValue(cliArgs, '--room') ?? payload?.roomId ?? null,
      editionId: optionValue(cliArgs, '--edition') ?? null, idempotencyKey: optionValue(cliArgs, '--idempotency-key') ?? null,
      agent: optionValue(cliArgs, '--agent') ?? null, as: optionValue(cliArgs, '--as') ?? null, ...(payload !== undefined ? { payload } : {}) },
    ok: exitCode === 0 && !response?.error, exitCode, response, ...(stderr ? { stderr } : {}),
  }
  appendFileSync(opsPath, `${JSON.stringify(entry)}\n`)
  const runPath = join(runDir, 'run.json')
  if (!existsSync(runPath)) writeFileSync(runPath, `${JSON.stringify({ schema: 'rooms-authoring-eval-run.v1', source: 'live', startedAt: at }, null, 2)}\n`)
  if (response) process.stdout.write(`${JSON.stringify(response, null, 2)}\n`)
  if (stderr) process.stderr.write(`${stderr}\n`)
  process.exitCode = entry.ok ? 0 : 1
}

function capture(options) {
  const { runDir, roomsRepo, sessionFile, organization, room } = options
  if (!runDir || !roomsRepo || !sessionFile || !organization || !room) throw new Error('capture exige --run-dir, --rooms-repo, --session-file, --organization y --room.')
  mkdirSync(runDir, { recursive: true })
  const common = ['--organization', organization, '--session-file', resolve(sessionFile), ...(options.baseUrl ? ['--base-url', options.baseUrl] : []), ...(options.agent ? ['--agent', options.agent] : [])]
  const read = (args, file) => {
    const { exitCode, response, stderr } = runRoomsCli(roomsRepo, args)
    if (exitCode !== 0 || !response) throw new Error(`pnpm rooms ${args[0]} falló (${exitCode}): ${stderr || JSON.stringify(response?.error ?? null)}`)
    writeFileSync(join(runDir, file), `${JSON.stringify(response, null, 2)}\n`)
    return unwrap(response)
  }
  read(['authoring', '--room', room, ...common], 'authoring.json')
  const editionId = options.edition ?? read(['room', '--room', room, ...common], 'room.json')?.content?.edition?.id
  if (!editionId) throw new Error('La sala no tiene edición publicada que capturar.')
  read(['edition', '--room', room, '--edition', editionId, ...common], 'edition.json')
  read(['invitation-management', '--room', room, ...common], 'invitations.json')
  read(['agents-activity', ...common], 'agents-activity.json')
  const runPath = join(runDir, 'run.json')
  const run = { ...(readJsonIf(runPath) ?? { schema: 'rooms-authoring-eval-run.v1', source: 'live' }), ...(options.caseId ? { caseId: options.caseId } : {}),
    organizationId: organization, roomId: room, editionId, ...(options.agent ? { agentClientId: options.agent } : {}), ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}), capturedAt: new Date().toISOString() }
  writeFileSync(runPath, `${JSON.stringify(run, null, 2)}\n`)
  process.stdout.write(`Capturado en ${runDir}: authoring, edition ${editionId}, invitations, agents-activity.\n`)
}

/* ───────────────────────── Selftest offline ───────────────────────── */

export function selftest() {
  const failures = []
  const report = []
  const fixturesDir = join(EVALS_DIR, 'fixtures')
  const plan = readJson(join(fixturesDir, 'selftest.json'))
  const cases = new Map(loadCases().map((testCase) => [testCase.id, testCase]))
  for (const scenario of plan.scenarios) {
    const testCase = cases.get(scenario.caseId)
    if (!testCase) { failures.push(`${scenario.name}: caso ${scenario.caseId} no existe`); continue }
    const loaded = loadRun(join(fixturesDir, scenario.runDir))
    if (loaded.run.source !== 'fixture') failures.push(`${scenario.name}: run.json debe declarar source=fixture`)
    const { metrics, pass } = scoreRun(loaded, testCase)
    for (const [id, expected] of Object.entries(scenario.expect)) {
      if (metrics[id]?.pass !== expected) failures.push(`${scenario.name}: ${id} dio ${metrics[id]?.pass} y se esperaba ${expected} — ${metrics[id]?.detail}`)
    }
    if (scenario.expectInformational) for (const id of scenario.expectInformational) if (!metrics[id]?.informational) failures.push(`${scenario.name}: ${id} debía quedar como informativo`)
    if (scenario.expectedChecksPass !== undefined) {
      const checks = expectedChecks(loaded, testCase.expectedData)
      const allPass = checks.every((entry) => entry.pass)
      if (allPass !== scenario.expectedChecksPass) failures.push(`${scenario.name}: chequeos esperados ${allPass ? 'pasaron' : 'fallaron'} — ${checks.filter((entry) => !entry.pass).map((entry) => `${entry.id}: ${entry.detail}`).join('; ')}`)
    }
    report.push(`${pass ? 'PASS' : 'FAIL'}  ${scenario.name.padEnd(28)} ${METRIC_IDS.map((id) => `${id}=${metrics[id]?.pass ? 'ok' : 'x'}`).join(' ')}`)
  }
  // El hash excluye recibos, fixtures y README, y es estable.
  const first = bundleHash(), second = bundleHash()
  if (first.hash !== second.hash) failures.push('bundleHash no es determinista')
  if (first.files.some((file) => file.startsWith('evals/runs/') || file.startsWith('evals/fixtures/') || file === 'evals/README.md')) failures.push('bundleHash incluye archivos que debían quedar fuera')
  for (const required of ['SKILL.md', 'evals/cases.json', 'evals/score.mjs']) if (!first.files.includes(required)) failures.push(`bundleHash no incluye ${required}`)
  // Un recibo offline, o PASS de otro hash, no cuenta para la frescura.
  const fake = (kind, verdict, hash) => ({ name: `${kind}-${verdict}`, receipt: { schema: RECEIPT_SCHEMA, kind, verdict, skillBundleHash: hash } })
  if (findPassReceipt([fake('offline', 'PASS', first.hash)], first.hash)) failures.push('un recibo offline contó como PASS de frescura')
  if (findPassReceipt([fake('live', 'PASS', 'sha256:otro')], first.hash)) failures.push('un PASS de otro hash contó como vigente')
  if (findPassReceipt([fake('live', 'FAIL', first.hash)], first.hash)) failures.push('un FAIL contó como PASS')
  if (!findPassReceipt([fake('live', 'PASS', first.hash)], first.hash)) failures.push('un PASS live del hash vigente no contó')
  failures.push(...briefConsistency())
  process.stdout.write(`${report.join('\n')}\n`)
  return failures
}

/* ───────────────────────── CLI ───────────────────────── */

function parseOptions(args) {
  const options = {}
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (!arg.startsWith('--')) throw new Error(`Argumento inesperado: ${arg}`)
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    if (['noReceipt'].includes(key)) options[key] = true
    else options[key] = args[++index]
  }
  return options
}

function printSuite(suite) {
  for (const result of suite.results) {
    process.stdout.write(`\n${result.pass ? 'PASS' : 'FAIL'}  ${result.caseId}${result.missing ? '  (sin corrida en el directorio)' : `  [${result.source}, dataOrigin=${result.dataOrigin}]`}\n`)
    for (const id of METRIC_IDS) if (result.metrics[id]) process.stdout.write(`  ${result.metrics[id].pass ? 'ok ' : 'x  '} ${id}: ${result.metrics[id].detail}\n`)
    for (const entry of result.expectedChecks) process.stdout.write(`  ${entry.pass ? '·  ' : '!  '} esperado ${entry.id}: ${entry.detail}\n`)
  }
  process.stdout.write(`\nVeredicto: ${suite.verdict}\n`)
}

async function main(argv) {
  const [command, ...rest] = argv
  if (command === 'hash') {
    const { hash, files } = bundleHash()
    process.stdout.write(`${hash}\n${files.map((file) => `  ${file}`).join('\n')}\n`)
    return
  }
  if (command === 'selftest') {
    const failures = selftest()
    if (failures.length) { process.stderr.write(`\nSelftest FALLÓ:\n${failures.map((line) => `  - ${line}`).join('\n')}\n`); process.exitCode = 1 }
    else process.stdout.write('\nSelftest OK: cada fixture dio el resultado esperado.\n')
    return
  }
  if (command === 'record') {
    const separator = rest.indexOf('--')
    if (separator < 0) throw new Error('Uso: node score.mjs record --run-dir DIR --rooms-repo PATH -- <args de pnpm rooms>')
    const options = parseOptions(rest.slice(0, separator))
    if (!options.runDir || !options.roomsRepo) throw new Error('record exige --run-dir y --rooms-repo.')
    record(resolve(options.runDir), resolve(options.roomsRepo), rest.slice(separator + 1))
    return
  }
  const options = parseOptions(rest)
  if (command === 'capture') {
    capture({ ...options, runDir: options.runDir && resolve(options.runDir), roomsRepo: options.roomsRepo && resolve(options.roomsRepo), caseId: options.case })
    return
  }
  if (command === 'score-case') {
    const testCase = loadCases().find((entry) => entry.id === options.case)
    if (!testCase || !options.runDir) throw new Error('score-case exige --case <id de cases.json> y --run-dir.')
    const loaded = loadRun(resolve(options.runDir))
    const { metrics, pass } = scoreRun(loaded, testCase)
    printSuite({ results: [{ caseId: testCase.id, source: loaded.run.source, dataOrigin: (manifestOf(loaded.edition) ?? manifestOf(loaded.authoring))?.dataOrigin, metrics, pass, expectedChecks: expectedChecks(loaded, testCase.expectedData) }], verdict: pass ? 'PASS' : 'FAIL' })
    process.exitCode = pass ? 0 : 1
    return
  }
  if (command === 'score') {
    if (!options.runs) throw new Error('score exige --runs DIR (con un subdirectorio por caso).')
    const runsDir = resolve(options.runs)
    const suite = scoreSuite(runsDir)
    printSuite(suite)
    const { hash, files } = bundleHash()
    if (!suite.live) process.stdout.write('\nCorrida offline o mixta: no se escribe recibo (solo cuentan corridas live).\n')
    else if (options.noReceipt) process.stdout.write('\n--no-receipt: no se escribe recibo.\n')
    else {
      const receipt = {
        schema: RECEIPT_SCHEMA, kind: 'live', scorer: SCORER_VERSION, scoredAt: new Date().toISOString(), verdict: suite.verdict,
        skillBundleHash: hash, bundleFiles: files, signedBy: options.signedBy ?? null,
        cases: suite.results.map(({ runDir, ...result }) => ({ ...result, runDir: relative(process.cwd(), runDir) || '.',
          expectedChecksPassed: result.expectedChecks.every((entry) => entry.pass) })),
      }
      const written = writeReceipt(receipt)
      process.stdout.write(`\nRecibo: ${written.join(' y ')}\n`)
    }
    process.exitCode = suite.verdict === 'PASS' ? 0 : 1
    return
  }
  throw new Error('Uso: node score.mjs score|score-case|selftest|record|capture|hash (ver el encabezado del archivo).')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
}

