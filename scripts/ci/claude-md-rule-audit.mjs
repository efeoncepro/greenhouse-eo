#!/usr/bin/env node
/**
 * TASK-1160 — CLAUDE.md rule-loss audit (the safety net of the router refactor).
 *
 * The refactor MOVES domain invariant blocks out of CLAUDE.md into their
 * skill/spec and leaves a pointer. The hard requirement (risk matrix): **no
 * load-bearing rule is lost** — every `NUNCA`/`SIEMPRE` line in the ORIGINAL
 * CLAUDE.md must still be reachable, either in the new CLAUDE.md or in a
 * destination doc/skill.
 *
 * This audit is the mechanical proof of that. It:
 *   1. Reads the frozen baseline CLAUDE.md (`git show <BASELINE_SHA>:CLAUDE.md`).
 *   2. Extracts every distinct rule line (contains NUNCA or SIEMPRE).
 *   3. Builds the live corpus = current CLAUDE.md ∪ every tracked .md under
 *      docs/ + .claude/skills/ + .codex/skills/.
 *   4. Reports any baseline rule line NOT found verbatim in the corpus (orphans).
 *
 * Target: ZERO orphans. Run it before AND after every Slice-3 batch.
 *
 * Usage:
 *   node scripts/ci/claude-md-rule-audit.mjs            # summary (exit 0)
 *   node scripts/ci/claude-md-rule-audit.mjs --strict   # exit 1 if any orphan
 *   node scripts/ci/claude-md-rule-audit.mjs --list      # print every orphan line
 */

import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

// Frozen baseline: the last commit where CLAUDE.md is the pre-refactor original.
// (TASK-1160 Slices 1-2 + operator-decision commit did NOT touch CLAUDE.md, so
// this tree's CLAUDE.md == the original spec-store.) Override via env if needed.
const BASELINE_SHA = process.env.CLAUDE_MD_BASELINE_SHA || '27ce06a11'

const STRICT = process.argv.includes('--strict')
const LIST = process.argv.includes('--list')

// Dirs whose .md files count as legitimate relocation destinations.
const CORPUS_DIRS = ['docs', '.claude/skills', '.codex/skills']
const CORPUS_EXTRA_FILES = ['CLAUDE.md', 'AGENTS.md']

const RULE_RE = /(NUNCA|SIEMPRE)/

/** Normalize a line for robust matching: collapse whitespace, trim. */
const norm = s => s.replace(/\s+/g, ' ').trim()

/** Extract distinct rule lines from a markdown blob. */
const ruleLines = blob => {
  const out = new Set()

  for (const raw of blob.split('\n')) {
    if (!RULE_RE.test(raw)) continue
    const n = norm(raw)

    // skip trivially short fragments (a bare word can't be a load-bearing rule)
    if (n.replace(/[^A-Za-zÀ-ÿ]/g, '').length < 12) continue
    out.add(n)
  }

  
return out
}

const walkMd = (dir, out = []) => {
  let entries

  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }

  for (const e of entries) {
    if (e === 'node_modules' || e === '.git') continue
    const full = join(dir, e)
    const st = statSync(full)

    if (st.isDirectory()) walkMd(full, out)
    else if (e.endsWith('.md')) out.push(full)
  }

  
return out
}

const main = () => {
  // 1. baseline
  let baselineBlob

  try {
    baselineBlob = execSync(`git show ${BASELINE_SHA}:CLAUDE.md`, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch (err) {
    console.error(`❌ Could not read baseline CLAUDE.md at ${BASELINE_SHA}: ${err.message}`)
    process.exit(2)
  }

  const baselineRules = ruleLines(baselineBlob)

  // 2. live corpus
  const corpusFiles = new Set()

  for (const d of CORPUS_DIRS) walkMd(join(REPO_ROOT, d)).forEach(f => corpusFiles.add(f))
  for (const f of CORPUS_EXTRA_FILES) corpusFiles.add(join(REPO_ROOT, f))

  const corpus = new Set()

  for (const f of corpusFiles) {
    let blob

    try {
      blob = readFileSync(f, 'utf8')
    } catch {
      continue
    }

    for (const n of ruleLines(blob)) corpus.add(n)
  }

  // 3. orphans = baseline rules not present anywhere live
  const orphans = []

  for (const r of baselineRules) if (!corpus.has(r)) orphans.push(r)

  console.log(`CLAUDE.md rule-loss audit (TASK-1160)`)
  console.log(`  baseline:  ${BASELINE_SHA}  (${baselineRules.size} distinct NUNCA/SIEMPRE rule lines)`)
  console.log(`  corpus:    ${corpusFiles.size} .md files (CLAUDE.md + docs/ + skills)`)
  console.log(`  orphans:   ${orphans.length}  (baseline rules unreachable in the live corpus)`)

  if (orphans.length > 0) {
    if (LIST) {
      console.log(`\n── orphan rule lines ──`)
      for (const o of orphans) console.log(`  • ${o.slice(0, 160)}`)
    } else {
      console.log(`\n  (run with --list to print them)`)
    }

    const msg = `${orphans.length} load-bearing rule line(s) from the original CLAUDE.md are no longer reachable. Re-add them to the destination doc BEFORE trimming the CLAUDE.md block (move-then-pointer).`

    if (STRICT) {
      console.error(`\n❌ ${msg}`)
      process.exit(1)
    }

    console.warn(`\n⚠️  ${msg}`)
    process.exit(0)
  }

  console.log(`\n✅ Zero orphans — every original rule line is still reachable.`)
  process.exit(0)
}

main()
