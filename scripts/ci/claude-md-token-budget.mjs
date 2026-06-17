#!/usr/bin/env node
/**
 * TASK-1160 — CLAUDE.md token budget gate.
 *
 * `CLAUDE.md` is loaded into every agent turn and inherited by every subagent.
 * When it grew to ~190k tokens it broke subagent spawning (system prompt +
 * CLAUDE.md > 200k context limit) and inflated cost/latency ~5×. This gate caps
 * its size so the router-refactor can't re-accrete.
 *
 * Token estimate = chars / 4 (cheap, deterministic, no tokenizer dep — good
 * enough for a budget ceiling; see TASK-1160 Follow-ups for a real tokenizer).
 *
 * Graduated cutover (TASK-1160 Slice 2 → Slice 5):
 *   - Ships in WARN mode at the current size so CI stays green during migration.
 *   - BUDGET_TOKENS is lowered step by step as domain blocks move out.
 *   - Slice 5 flips CI to `--strict` once the real size is under the final target.
 *
 * Usage:
 *   node scripts/ci/claude-md-token-budget.mjs           # warn mode (exit 0, reports)
 *   node scripts/ci/claude-md-token-budget.mjs --strict  # fail build if over budget (exit 1)
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const CLAUDE_MD = join(REPO_ROOT, 'CLAUDE.md')

// ── Budget ceiling (lower this as TASK-1160 Slice 3 moves blocks out) ──────────
// Warm start = current size so the gate ships green. Escalation plan in
// docs/operations/CLAUDE_MD_REFACTOR_MAP_2026-06-16.md §5:
//   200k (warn, now) → 120k → 70k → 40k → 35k (final target, flip to error).
const BUDGET_TOKENS = 200_000
// Final target the refactor is steering toward (informational only).
// Operator decision 2026-06-16: final band 30-35k; gate enforces 35k (band ceiling).
const TARGET_TOKENS = 35_000

const STRICT = process.argv.includes('--strict')

const estTokens = chars => Math.round(chars / 4)

const main = () => {
  const raw = readFileSync(CLAUDE_MD, 'utf8')
  const chars = raw.length
  const tokens = estTokens(chars)
  const lines = raw.split('\n').length

  const over = tokens - BUDGET_TOKENS
  const pct = Math.round((tokens / BUDGET_TOKENS) * 100)

  console.log(`CLAUDE.md token budget gate (TASK-1160)`)
  console.log(`  size:   ${tokens.toLocaleString()} ~tokens  (${lines.toLocaleString()} lines, ${chars.toLocaleString()} chars)`)
  console.log(`  budget: ${BUDGET_TOKENS.toLocaleString()} ~tokens  (${pct}% used)`)
  console.log(`  target: ${TARGET_TOKENS.toLocaleString()} ~tokens  (final, TASK-1160 Slice 5)`)

  if (over > 0) {
    const msg = `CLAUDE.md is ${over.toLocaleString()} ~tokens over budget (${tokens.toLocaleString()} > ${BUDGET_TOKENS.toLocaleString()}). Move domain blocks to their skill/spec (see CLAUDE_MD_REFACTOR_MAP) — do NOT add domain invariants inline.`

    if (STRICT) {
      console.error(`\n❌ ${msg}`)
      process.exit(1)
    }

    console.warn(`\n⚠️  ${msg}`)
    process.exit(0)
  }

  console.log(`\n✅ Under budget.`)
  process.exit(0)
}

main()
