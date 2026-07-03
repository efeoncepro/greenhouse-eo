#!/usr/bin/env tsx
/**
 * LLM ideation for the AI Content Factory (Slice 9).
 *
 * Two modes over the shared GutenbergArticleSpec canvas:
 *   ideate  — an idea (+ context) becomes a full spec.
 *   revise  — steer an existing spec with an operator instruction (co-creation).
 *
 * The produced spec is assembled with authorGutenbergDraft and validated. This
 * command never writes to WordPress. Requires ANTHROPIC_API_KEY / *_SECRET_REF.
 *
 * Run via the server-only shim:
 *   pnpm public-website:content-factory:ideate -- --idea "..." [--out spec.json]
 *   pnpm public-website:content-factory:ideate -- --revise spec.json --instruction "..."
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { authorGutenbergDraft, type GutenbergArticleSpec } from '../../src/lib/public-site/content-factory/article-authoring'
import {
  ideateArticleSpec,
  reviseArticleSpec,
  type ArticleIdeationLocale,
  type ArticleIdeationTone
} from '../../src/lib/public-site/content-factory/article-ideation'
import { validateGeneratedGutenbergDraft } from '../../src/lib/public-site/content-factory/gutenberg-validator'

const arg = (flag: string): string | undefined => {
  const argv = process.argv.slice(2)
  const normalized = argv[0] === '--' ? argv.slice(1) : argv
  const index = normalized.indexOf(flag)

  return index >= 0 ? normalized[index + 1] : undefined
}

const has = (flag: string): boolean => process.argv.slice(2).includes(flag)

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

const main = async () => {
  if (has('--help') || has('-h')) {
    console.log(`Usage:
  pnpm public-website:content-factory:ideate -- --idea "tu idea" [--context ...] [--audience ...] [--keyword ...] [--tone thought_leadership] [--locale es-CL] [--out spec.json]
  pnpm public-website:content-factory:ideate -- --revise ./spec.json --instruction "qué cambiar" [--out spec.json]

Produces a GutenbergArticleSpec, assembles + validates it, and prints the result.
Never writes to WordPress. Requires ANTHROPIC_API_KEY / ANTHROPIC_API_KEY_SECRET_REF.`)

    return
  }

  loadEnv('.env.local')

  const out = arg('--out')
  const revisePath = arg('--revise')

  const result = revisePath
    ? await reviseArticleSpec({
        spec: JSON.parse(readFileSync(resolve(process.cwd(), revisePath), 'utf8')) as GutenbergArticleSpec,
        instruction: arg('--instruction') ?? '',
        locale: arg('--locale') as ArticleIdeationLocale | undefined,
        tone: arg('--tone') as ArticleIdeationTone | undefined,
        model: arg('--model')
      })
    : await ideateArticleSpec({
        idea: arg('--idea') ?? '',
        context: arg('--context'),
        audience: arg('--audience'),
        primaryKeyword: arg('--keyword'),
        tone: arg('--tone') as ArticleIdeationTone | undefined,
        locale: arg('--locale') as ArticleIdeationLocale | undefined,
        model: arg('--model')
      })

  const draft = authorGutenbergDraft(result.spec)
  const validation = validateGeneratedGutenbergDraft(draft)

  if (out) {
    const absolutePath = resolve(process.cwd(), out)

    mkdirSync(resolve(absolutePath, '..'), { recursive: true })
    writeFileSync(absolutePath, `${JSON.stringify(result.spec, null, 2)}\n`)
    console.log(`Wrote article spec: ${absolutePath}`)
  }

  console.log(
    JSON.stringify(
      { mode: revisePath ? 'revise' : 'ideate', model: result.model, usage: result.usage, spec: result.spec, validation },
      null,
      2
    )
  )

  if (validation.status === 'block') process.exitCode = 2
}

main().catch(error => {
  console.error(`public-website:content-factory:ideate failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
