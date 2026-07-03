#!/usr/bin/env tsx
/**
 * AI Content Factory end-to-end orchestrator (Slice 9).
 *
 * Chains the governed pipeline over the shared GutenbergArticleSpec:
 *   [idea → ideate (LLM)] | [--spec spec.json]  →  author  →  validate  →  (--send)
 *
 * By default it is DRY: it produces and validates the draft and prints it, but
 * does NOT write to WordPress — the write is a human-approved step (the base
 * invariant: AI produces drafts, a human approves the write).
 *
 * With --send it executes the governed write (post_status=private, authored by
 * the operator's --author-id), reusing the sanctioned wpcli eval-file path
 * proven on post 250748. It refuses to send unless validation passed.
 *
 * Run via the server-only shim:
 *   pnpm public-website:content-factory:run -- --idea "..." [--audience ...] [--out draft.json]
 *   pnpm public-website:content-factory:run -- --spec spec.json
 *   pnpm public-website:content-factory:run -- --spec spec.json --send --author-id 1
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  authorGutenbergDraft,
  type GutenbergArticleSpec
} from '../../src/lib/public-site/content-factory/article-authoring'
import {
  ideateArticleSpec,
  type ArticleIdeationLocale,
  type ArticleIdeationTone
} from '../../src/lib/public-site/content-factory/article-ideation'
import {
  buildGovernedDraftWriteEval,
  parseGovernedDraftWriteReadback
} from '../../src/lib/public-site/content-factory/draft-write-eval'
import { validateGeneratedGutenbergDraft } from '../../src/lib/public-site/content-factory/gutenberg-validator'

const argv = () => {
  const raw = process.argv.slice(2)

  return raw[0] === '--' ? raw.slice(1) : raw
}

const arg = (flag: string): string | undefined => {
  const list = argv()
  const index = list.indexOf(flag)

  return index >= 0 ? list[index + 1] : undefined
}

const has = (flag: string): boolean => argv().includes(flag)

const loadEnv = (relativePath: string) => {
  try {
    for (const line of readFileSync(resolve(process.cwd(), relativePath), 'utf8').split('\n')) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith('#')) continue

      const normalized = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed
      const eq = normalized.indexOf('=')

      if (eq <= 0) continue

      const key = normalized.slice(0, eq).trim()

      if (process.env[key] !== undefined) continue

      let value = normalized.slice(eq + 1).trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }
  } catch {
    /* optional */
  }
}

const deriveManifest = (slug: string): string => `greenhouse-cf-${slug}`.slice(0, 80)

const main = async () => {
  if (has('--help') || has('-h')) {
    console.log(`Usage:
  pnpm public-website:content-factory:run -- --idea "tu idea" [--audience ...] [--keyword ...] [--tone ...] [--locale es-CL] [--out draft.json]
  pnpm public-website:content-factory:run -- --spec ./spec.json [--out draft.json]
  pnpm public-website:content-factory:run -- --spec ./spec.json --send --author-id 1 [--manifest greenhouse-cf-...] [--allow-warnings]

DRY by default: produces + validates the draft, never writes WordPress.
--send performs the governed write (private, authored by --author-id) only if validation passed.`)

    return
  }

  loadEnv('.env.local')

  const specPath = arg('--spec')

  const spec: GutenbergArticleSpec = specPath
    ? (JSON.parse(readFileSync(resolve(process.cwd(), specPath), 'utf8')) as GutenbergArticleSpec)
    : (
        await ideateArticleSpec({
          idea: arg('--idea') ?? '',
          context: arg('--context'),
          audience: arg('--audience'),
          primaryKeyword: arg('--keyword'),
          tone: arg('--tone') as ArticleIdeationTone | undefined,
          locale: arg('--locale') as ArticleIdeationLocale | undefined,
          model: arg('--model')
        })
      ).spec

  const draft = authorGutenbergDraft(spec)
  const validation = validateGeneratedGutenbergDraft(draft)

  const out = arg('--out')

  if (out) {
    const absolutePath = resolve(process.cwd(), out)

    mkdirSync(resolve(absolutePath, '..'), { recursive: true })
    writeFileSync(absolutePath, `${JSON.stringify(draft, null, 2)}\n`)
    console.log(`Wrote validated draft: ${absolutePath}`)
  }

  const wantsSend = has('--send')

  const summary: Record<string, unknown> = {
    stage: wantsSend ? 'send' : 'dry',
    slug: draft.slug,
    title: draft.title,
    validation
  }

  if (!wantsSend) {
    summary.note = 'Dry run — draft validated, NOT written. Add --send --author-id <id> to write a private post.'
    console.log(JSON.stringify(summary, null, 2))

    if (validation.status === 'block') process.exitCode = 2

    return
  }

  // ── Governed write (gated) ──────────────────────────────────────────────────
  const authorId = Number(arg('--author-id'))

  if (!Number.isInteger(authorId) || authorId <= 0) {
    throw new Error('--send requires a valid --author-id (the operator WordPress user id)')
  }

  if (validation.status === 'block') {
    throw new Error('Refusing to send: validation status is "block". Fix the findings first.')
  }

  if (validation.status === 'warning' && !has('--allow-warnings')) {
    throw new Error('Validation returned warnings. Review them, then re-run with --allow-warnings to send.')
  }

  const manifest = arg('--manifest') ?? deriveManifest(draft.slug)
  const php = buildGovernedDraftWriteEval({ draft, authorId, manifestId: manifest })

  const evalPath = resolve(process.cwd(), `tmp/content-factory-send-${manifest}.php`)

  mkdirSync(resolve(evalPath, '..'), { recursive: true })
  writeFileSync(evalPath, php)

  let stdout = ''

  try {
    stdout = execFileSync(
      'pnpm',
      ['public-website:wpcli', '--', '--eval-file', `./tmp/content-factory-send-${manifest}.php`, '--wp-user', arg('--wp-user') ?? '12'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
    )
  } finally {
    rmSync(evalPath, { force: true })
  }

  const readback = parseGovernedDraftWriteReadback(stdout)

  summary.manifest = manifest
  summary.authorId = authorId
  summary.readback = readback
  console.log(JSON.stringify(summary, null, 2))

  if (!readback || readback.outcome === 'error') process.exitCode = 2
}

main().catch(error => {
  console.error(`public-website:content-factory:run failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
