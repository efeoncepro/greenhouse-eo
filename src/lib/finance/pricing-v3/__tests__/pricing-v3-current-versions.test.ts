/**
 * Guard for the one answer to "which versions are current": `data/pricing/v3-operating/current.json`.
 *
 * Every catalog and resource policy is an immutable `*.review-vN.json`, so issuing a new version never changes what
 * anyone quotes with — until the pointer moves. This suite fails on purpose when a higher-numbered version exists
 * and the pointer still names the previous one, and when the pointer no longer matches the files it names. The
 * failure message carries the exact command to run; nothing here hard-codes a version number.
 */
import { execFile, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { catalogDigest } from '../adapters/catalog-local'
import {
  CURRENT_SOURCE_ROLES,
  buildCurrentVersions,
  currentVersionsDigest,
  currentVersionsSchema,
  resolveCurrentSource,
  verifyCurrentVersions
} from '../adapters/current-versions'
import type { CurrentSourceRole, CurrentVersions } from '../adapters/current-versions'
import { validateCatalog } from '../catalog/catalog'
import { PRICING_V3_ADAPTER_ERROR_CODES, PricingV3Error } from '../errors'
import { compositionPolicySchema } from '../resources/composition-contracts'
import { creditCatalogSchema } from '../resources/credit-budget'

const POINTER = 'data/pricing/v3-operating/current.json'
const BASELINE = 'data/pricing/v3-catalog/catalog.review-v1.json'

const dir = mkdtempSync(join(tmpdir(), 'pricing-v3-current-'))

afterAll(() => rmSync(dir, { recursive: true, force: true }))

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const committedBytes = readFileSync(POINTER, 'utf8')
const pointer: CurrentVersions = currentVersionsSchema.parse(JSON.parse(committedBytes))

const documents = {
  catalog: read(pointer.catalog.path),
  policy: read(pointer.policy.path),
  credits: read(pointer.credits.path)
}

const script = ['--import', 'tsx', 'scripts/commercial/pricing-v3.ts']
const cli = (...args: string[]) => spawnSync('node', [...script, ...args], { encoding: 'utf8' })
const failure = (run: { stderr: string }) => JSON.parse(run.stderr).error as { code: string; option?: string }

const file = (name: string, value: unknown) => {
  const path = join(dir, name)

  writeFileSync(path, JSON.stringify(value))

  return path
}

describe('the committed pointer names the current versions', () => {
  // Recomputed here with the parsers the commands use, not through the verifier under test.
  const recomputed = {
    catalog: validateCatalog(documents.catalog),
    policy: compositionPolicySchema.parse(documents.policy),
    credits: creditCatalogSchema.parse(documents.credits)
  }

  it.each(CURRENT_SOURCE_ROLES)('%s: the file exists and carries the version and digest the pointer states', role => {
    expect(pointer[role].version).toBe(recomputed[role].version)
    expect(pointer[role].digest).toBe(catalogDigest(recomputed[role]))
  })

  it('verifies as a whole', () => {
    const verification = verifyCurrentVersions(pointer, documents)

    expect(verification.consistent).toBe(true)
    expect(CURRENT_SOURCE_ROLES.map(role => verification.sources[role].status)).toEqual(['match', 'match', 'match'])
  })

  it('names the highest-numbered version of every family present on disk', () => {
    const highest = (folder: string, family: string) => {
      const numbered = new RegExp(`^${family}\\.review-v(\\d+)\\.json$`)
      const versions = readdirSync(folder).flatMap(name => numbered.exec(name)?.[1] ?? [])

      return `${folder}/${family}.review-v${Math.max(...versions.map(Number))}.json`
    }

    const latest = {
      catalog: highest('data/pricing/v3-operating', 'catalog'),
      policy: highest('data/pricing/v3-operating', 'resources'),
      credits: highest('data/pricing/v3-resources', 'ai-credits')
    }

    const fix =
      `A newer version exists but ${POINTER} still names the previous one, so \`--current\` and every manual that ` +
      `follows it would keep quoting with the old values. Move the pointer:\n\n` +
      `  pnpm pricing:v3 current set --catalog ${latest.catalog} --policy ${latest.policy} ` +
      `--credits ${latest.credits} --reason "<why the current versions changed>" ` +
      `--confirm ${currentVersionsDigest(pointer)}\n`

    for (const role of CURRENT_SOURCE_ROLES) expect(pointer[role].path, fix).toBe(latest[role])
  })
})

describe('the verifier reports what disagrees and never the content', () => {
  const sources = (changed: Partial<Record<CurrentSourceRole, unknown>>) =>
    verifyCurrentVersions(pointer, { ...documents, ...changed }).sources

  it('tells a moved version from a file edited in place', () => {
    const renamed = { ...documents.policy, version: `${documents.policy.version}-next` }

    expect(sources({ policy: renamed }).policy.status).toBe('version_mismatch')

    // Same version label, different content: exactly what an immutable file must never become.
    const edited = structuredClone(documents.credits)

    edited.providers[0].subscription.includedCredits += 1

    const check = sources({ credits: edited }).credits

    expect(check.status).toBe('digest_mismatch')
    expect(check.found).toEqual({ version: pointer.credits.version, digest: expect.stringMatching(/^[a-f0-9]{64}$/) })
    expect(check.found?.digest).not.toBe(pointer.credits.digest)
  })

  it('reports a source its parser rejects and one that could not be read, without throwing', () => {
    const broken = verifyCurrentVersions(pointer, { catalog: { records: 'nope' }, policy: documents.policy })

    expect(broken.consistent).toBe(false)
    expect(broken.sources.catalog).toEqual({ path: pointer.catalog.path, status: 'invalid', found: null })
    expect(broken.sources.policy.status).toBe('match')
    expect(broken.sources.credits).toEqual({ path: pointer.credits.path, status: 'unreadable', found: null })
  })

  it('hands back the document it checked, or rejects with a registered code and nothing else', () => {
    expect(PRICING_V3_ADAPTER_ERROR_CODES).toContain('CURRENT_VERSIONS_MISMATCH')
    expect(resolveCurrentSource(pointer, 'catalog', documents.catalog)).toBe(documents.catalog)

    const stale = { ...pointer, catalog: { ...pointer.catalog, digest: '0'.repeat(64) } }

    const rejected = [
      () => resolveCurrentSource(stale, 'catalog', documents.catalog),
      () => resolveCurrentSource(pointer, 'catalog', read(BASELINE)),
      () => resolveCurrentSource(pointer, 'policy', { tools: 'nope' }),
      () => resolveCurrentSource(pointer, 'credits', undefined)
    ]

    for (const attempt of rejected) {
      let caught: unknown

      try {
        attempt()
      } catch (error) {
        caught = error
      }

      expect(caught).toBeInstanceOf(PricingV3Error)
      expect((caught as PricingV3Error).code).toBe('CURRENT_VERSIONS_MISMATCH')
      // The whole error surface: a code and the option to look at. No path, version, digest or parser message.
      expect((caught as PricingV3Error).message).toBe('CURRENT_VERSIONS_MISMATCH')
      expect((caught as PricingV3Error).detail).toEqual({ option: 'current' })
    }
  })

  it('builds the pointer from the documents and refuses a path that leaves the repository', () => {
    const paths = { catalog: pointer.catalog.path, policy: pointer.policy.path, credits: pointer.credits.path }
    const built = buildCurrentVersions({ paths, documents, reason: 'rebuilt', updatedAt: '2026-10-11' })

    expect(CURRENT_SOURCE_ROLES.map(role => built[role])).toEqual(CURRENT_SOURCE_ROLES.map(role => pointer[role]))
    expect(verifyCurrentVersions(built, documents).consistent).toBe(true)

    for (const catalog of ['../outside.json', '/tmp/outside.json', 'data/../../outside.json', 'data/catalog.yaml'])
      expect(() =>
        buildCurrentVersions({ paths: { ...paths, catalog }, documents, reason: 'x', updatedAt: '2026-10-11' })
      ).toThrow(ZodError)
  })
})

describe('--current fills only the sources the caller did not name', () => {
  // A demand written for the versions the pointer names today. A demand is a dated input: one written for an older
  // policy can stop calculating when a profile recipe changes (it then asks for the allocation it lacks), which is
  // the quoter working, not this flag failing.
  const demand = 'data/pricing/v3-operating/designer-on-demand.demand.json'
  const olderCatalog = 'data/pricing/v3-operating/catalog.review-v3.json'
  const rest = ['--policy', pointer.policy.path, '--credits', pointer.credits.path]

  const withPointer = cli('compose', 'prepare', '--current', '--input', demand)

  it('equals the same command with the three sources spelled out', () => {
    const explicit = cli('compose', 'prepare', '--catalog', pointer.catalog.path, ...rest, '--input', demand)

    expect(read(demand).brief.quoteDate).toBe('2026-10-11')
    expect(withPointer.status).toBe(3)
    expect(explicit.status).toBe(3)
    expect(withPointer.stdout).toBe(explicit.stdout)
    expect(JSON.parse(withPointer.stdout).totals).not.toBeNull()
  })

  it('lets an explicit --catalog win', () => {
    const overridden = cli('compose', 'prepare', '--current', '--catalog', olderCatalog, '--input', demand)
    const explicit = cli('compose', 'prepare', '--catalog', olderCatalog, ...rest, '--input', demand)

    expect(overridden.stdout).toBe(explicit.stdout)
    expect(overridden.status).toBe(explicit.status)
    expect(overridden.stdout).not.toBe(withPointer.stdout)
  })

  it('keeps the historical baseline when neither --current nor --catalog is given', () => {
    const byDefault = JSON.parse(cli('catalog', 'validate').stdout)
    const byPointer = JSON.parse(cli('catalog', 'validate', '--current').stdout)

    expect(byDefault.digest).toBe(catalogDigest(validateCatalog(read(BASELINE))))
    expect(byPointer).toMatchObject({ digest: pointer.catalog.digest, version: pointer.catalog.version })
    expect(byDefault.digest).not.toBe(byPointer.digest)
  })

  it('states the digests `resources inspect` computes, and gives `resources budget` the credit catalog', () => {
    const inspected = JSON.parse(cli('resources', 'inspect', '--current', '--date', '2026-10-11').stdout)

    expect(inspected.policyDigest).toBe(pointer.policy.digest)
    expect(inspected.creditCatalogDigest).toBe(pointer.credits.digest)

    // Here `--catalog` has always meant the credit catalog, so that is what the pointer fills.
    const request = 'data/pricing/v3-resources/examples/higgsfield.request.json'
    const budget = cli('resources', 'budget', '--current', '--input', request)

    expect(budget.status).toBe(3)
    expect(budget.stdout).toBe(cli('resources', 'budget', '--catalog', pointer.credits.path, '--input', request).stdout)
  })

  it('is taken exactly where a source is taken, and is a switch', async () => {
    const run = (args: string[]) =>
      new Promise<{ code: string; option?: string } | null>(resolve =>
        execFile('node', [...script, ...args, '--current'], { encoding: 'utf8', maxBuffer: 1 << 26 }, (_, __, stderr) =>
          resolve(stderr ? JSON.parse(stderr).error : null)
        )
      )

    const takesSources = [
      ['prepare'],
      ['quote'],
      ...['search', 'show', 'validate', 'preview', 'apply'].map(sub => ['catalog', sub]),
      ...['scaffold', 'plan', 'prepare', 'quote'].map(sub => ['compose', sub]),
      ...['inspect', 'portfolio', 'budget', 'preview', 'apply'].map(sub => ['resources', sub])
    ]

    const takesNone = [
      ...['calculate', 'validate', 'explain', 'replay', 'compare', 'export'].map(command => [command]),
      ...['assess', 'preview', 'workload'].map(sub => ['compose', sub]),
      ['current', 'show'],
      ['current', 'set']
    ]

    const [accepted, refused] = await Promise.all([Promise.all(takesSources.map(run)), Promise.all(takesNone.map(run))])

    // Whatever else each one still lacks (an input, a date), the flag itself is never what gets rejected.
    for (const error of accepted) expect(error?.option).not.toBe('current')
    for (const error of refused) expect(error).toMatchObject({ code: 'INVALID_ARGUMENT', option: 'current' })

    expect(failure(cli('catalog', 'validate', '--current=yes'))).toMatchObject({
      code: 'INVALID_ARGUMENT',
      option: 'current'
    })
  }, 60_000)
})

describe('current show', () => {
  it('prints the pointer, its digest and a verdict per source, and exits 0 while they agree', () => {
    const shown = cli('current', 'show')
    const body = JSON.parse(shown.stdout)

    expect(shown.status).toBe(0)
    expect(Object.keys(body)).toEqual(['binding', 'pointerDigest', 'consistent', 'sources', 'pointer'])
    expect(body).toMatchObject({ binding: false, consistent: true, pointerDigest: currentVersionsDigest(pointer) })
    expect(body.pointer).toEqual(pointer)
    expect(cli('current').stdout).toBe(shown.stdout)
  })

  it('exits 2 for a pointer that drifted, saying which source and nothing about its content', () => {
    const drifted = file('drifted.json', {
      ...pointer,
      catalog: { ...pointer.catalog, digest: 'f'.repeat(64) },
      policy: { ...pointer.policy, path: 'data/pricing/v3-operating/resources.review-v0.json' }
    })

    const shown = cli('current', 'show', '--input', drifted)
    const body = JSON.parse(shown.stdout)

    expect(shown.status).toBe(2)
    expect(body.consistent).toBe(false)
    expect(body.sources.catalog).toEqual({
      path: pointer.catalog.path,
      status: 'digest_mismatch',
      found: { version: pointer.catalog.version, digest: pointer.catalog.digest }
    })
    expect(body.sources.policy).toMatchObject({ status: 'unreadable', found: null })
    expect(body.sources.credits.status).toBe('match')
  })
})

describe('current set replaces only the pointer, atomically and under a lock', () => {
  const home = join(dir, 'pointer-home')
  const target = join(home, 'current.json')
  const SENTINEL = `leak-probe-${process.pid}-${Date.now()}`

  mkdirSync(home)

  const set = (catalog: string, ...extra: string[]) =>
    cli('current', 'set', '--catalog', catalog, ...rest(), '--out', target, ...extra)

  const rest = () => ['--policy', pointer.policy.path, '--credits', pointer.credits.path]
  const olderCatalog = 'data/pricing/v3-operating/catalog.review-v3.json'

  it('refuses without a reason, and a source outside the repository', () => {
    expect(failure(set(pointer.catalog.path))).toMatchObject({ code: 'MISSING_ARGUMENT', option: 'reason' })

    const outside = set(file('outside.catalog.json', documents.catalog), '--reason', 'x')

    expect(failure(outside)).toMatchObject({ code: 'INVALID_ARGUMENT', option: 'catalog' })
    expect(readdirSync(home)).toEqual([])
  })

  it('writes a first pointer that `current show` accepts, leaving nothing else behind', () => {
    const written = set(olderCatalog, '--reason', 'first pointer of this folder')
    const body = JSON.parse(written.stdout)

    expect(written.status).toBe(0)
    expect(body).toMatchObject({ updated: true, binding: false, replaced: null })
    expect(readdirSync(home)).toEqual(['current.json'])
    expect(read(target)).toEqual(body.pointer)
    expect(body.pointer.catalog.path).toBe(olderCatalog)
    expect(body.pointerDigest).toBe(currentVersionsDigest(read(target)))

    const shown = cli('current', 'show', '--input', target)

    expect(shown.status).toBe(0)
    expect(JSON.parse(shown.stdout)).toMatchObject({ consistent: true, pointerDigest: body.pointerDigest })
  })

  it('replaces it only for the caller who read the pointer being replaced', () => {
    const before = readFileSync(target, 'utf8')
    const lock = currentVersionsDigest(JSON.parse(before))
    const reason = ['--reason', `move to the current catalog ${SENTINEL}`]

    expect(failure(set(pointer.catalog.path, ...reason))).toMatchObject({ code: 'MISSING_ARGUMENT', option: 'confirm' })

    const stale = set(pointer.catalog.path, ...reason, '--confirm', '0'.repeat(64))

    expect(stale.status).toBe(1)
    expect(stale.stdout).toBe('')
    expect(failure(stale)).toMatchObject({ code: 'CURRENT_VERSIONS_CONFLICT', option: 'confirm' })
    expect(stale.stderr).not.toContain(SENTINEL)
    expect(stale.stderr).not.toContain(dir)
    expect(readFileSync(target, 'utf8')).toBe(before)

    const moved = set(pointer.catalog.path, ...reason, '--confirm', lock)
    const body = JSON.parse(moved.stdout)

    expect(moved.status).toBe(0)
    expect(body.replaced).toBe(lock)
    expect(read(target).catalog).toEqual(pointer.catalog)
    expect(readdirSync(home)).toEqual(['current.json'])
    expect(JSON.parse(cli('current', 'show', '--input', target).stdout).pointerDigest).toBe(body.pointerDigest)
  })

  it('offers no lock to a pointer that does not exist', () => {
    const missing = join(home, 'absent.json')

    const run = cli(
      ...['current', 'set', '--catalog', pointer.catalog.path, ...rest(), '--reason', 'x'],
      ...['--out', missing, '--confirm', '0'.repeat(64)]
    )

    expect(failure(run)).toMatchObject({ code: 'CURRENT_VERSIONS_CONFLICT', option: 'confirm' })
    expect(readdirSync(home)).toEqual(['current.json'])
  })

  it('never touched the committed pointer', () => {
    expect(readFileSync(POINTER, 'utf8')).toBe(committedBytes)
  })
})
