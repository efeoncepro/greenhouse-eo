#!/usr/bin/env node
/**
 * TASK-1160 — CLAUDE.md content-loss audit (the safety net of the router refactor).
 *
 * The refactor MOVES domain invariant blocks out of CLAUDE.md into their
 * skill/spec and leaves a pointer. The hard requirement (risk matrix): **no
 * load-bearing content is lost** — every meaningful line in the ORIGINAL
 * CLAUDE.md must still be reachable, either in the new CLAUDE.md or in a
 * destination doc/skill.
 *
 * This audit is the mechanical proof of that. It runs TWO tiers:
 *
 *   TIER 1 — rules (NUNCA/SIEMPRE): the load-bearing invariants. A lost rule is
 *            the worst case, so this tier is reported first and always hard-fails
 *            in --strict.
 *   TIER 2 — content (every meaningful line: prose, code snippets, paths, helper
 *            names, tables). A SUPERSET of tier 1. Guards against dropping the
 *            "why", the canonical examples, file paths, etc. during a relocation.
 *            Also hard-fails in --strict, minus the accepted-reword allowlist.
 *
 * For each tier it:
 *   1. Reads the frozen baseline CLAUDE.md (`git show <BASELINE_SHA>:CLAUDE.md`).
 *   2. Extracts every distinct line of that tier.
 *   3. Builds the live corpus = current CLAUDE.md ∪ every tracked .md under
 *      docs/ + .claude/skills/ + .codex/skills/ + AGENTS.md.
 *   4. Reports any baseline line NOT found verbatim in the corpus (orphans).
 *
 * Target: ZERO orphans in both tiers.
 *
 * Escape hatch (both tiers): companions are living docs. When a baseline line is
 * LEGITIMATELY reworded or a rule DELIBERATELY retired (not accidentally dropped),
 * add its normalized text to `claude-md-content-allowlist.txt` (one line per entry,
 * `#` comments allowed). Reviewed + append-only, so legitimate evolution is an
 * explicit, visible act in the PR rather than a silent loss — and CI stays strict
 * for everything else. Retiring a tier-1 rule should carry a justifying comment.
 *
 * Usage:
 *   node scripts/ci/claude-md-rule-audit.mjs            # summary (exit 0)
 *   node scripts/ci/claude-md-rule-audit.mjs --strict   # exit 1 if any orphan
 *   node scripts/ci/claude-md-rule-audit.mjs --list      # print every orphan line
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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

// Tier-2 accepted-reword allowlist (normalized lines, `#` comments ignored).
const CONTENT_ALLOWLIST_FILE = join(__dirname, 'claude-md-content-allowlist.txt')

const RULE_RE = /(NUNCA|SIEMPRE)/
// A line that is pure markdown structure (heading marker, list bullet, table
// rule, blockquote arrow, hr) carries no content worth tracking.
const STRUCTURE_ONLY_RE = /^[#>*\-|`_=\s]*$/

/** Normalize a line for robust matching: collapse whitespace, trim. */
const norm = s => s.replace(/\s+/g, ' ').trim()

/** Count of alphabetic chars — used to skip trivially short fragments. */
const alphaLen = n => n.replace(/[^A-Za-zÀ-ÿ]/g, '').length

/** TIER 1 — distinct NUNCA/SIEMPRE rule lines from a markdown blob. */
const ruleLines = blob => {
  const out = new Set()

  for (const raw of blob.split('\n')) {
    if (!RULE_RE.test(raw)) continue
    const n = norm(raw)

    // skip trivially short fragments (a bare word can't be a load-bearing rule)
    if (alphaLen(n) < 12) continue
    out.add(n)
  }

  return out
}

/** TIER 2 — distinct meaningful content lines (prose, code, paths, tables). */
const contentLines = blob => {
  const out = new Set()

  for (const raw of blob.split('\n')) {
    const n = norm(raw)

    // length >= 12 catches real content while dropping noise; skip pure markdown
    // structure (bullets, table separators, bare blockquote arrows, hr).
    if (n.length < 12) continue
    if (STRUCTURE_ONLY_RE.test(n)) continue
    out.add(n)
  }

  return out
}

/** Load the tier-2 accepted-reword allowlist as a normalized Set. */
const loadAllowlist = () => {
  const out = new Set()

  if (!existsSync(CONTENT_ALLOWLIST_FILE)) return out

  for (const raw of readFileSync(CONTENT_ALLOWLIST_FILE, 'utf8').split('\n')) {
    const line = raw.trim()

    if (!line || line.startsWith('#')) continue
    out.add(norm(line))
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
  const baselineContent = contentLines(baselineBlob)

  // 2. live corpus (both tiers built in one pass over the file set)
  const corpusFiles = new Set()

  for (const d of CORPUS_DIRS) walkMd(join(REPO_ROOT, d)).forEach(f => corpusFiles.add(f))
  for (const f of CORPUS_EXTRA_FILES) corpusFiles.add(join(REPO_ROOT, f))

  const ruleCorpus = new Set()
  const contentCorpus = new Set()

  for (const f of corpusFiles) {
    let blob

    try {
      blob = readFileSync(f, 'utf8')
    } catch {
      continue
    }

    for (const n of ruleLines(blob)) ruleCorpus.add(n)
    for (const n of contentLines(blob)) contentCorpus.add(n)
  }

  // 3. orphans = baseline lines not present anywhere live, minus the reviewed
  //    accepted-removal/reword allowlist (applies to BOTH tiers).
  const allowlist = loadAllowlist()

  const ruleOrphansAll = []

  for (const r of baselineRules) if (!ruleCorpus.has(r)) ruleOrphansAll.push(r)
  const ruleOrphans = ruleOrphansAll.filter(r => !allowlist.has(r))
  const acceptedRules = ruleOrphansAll.length - ruleOrphans.length

  const contentOrphansAll = []

  for (const c of baselineContent) if (!contentCorpus.has(c)) contentOrphansAll.push(c)
  const contentOrphans = contentOrphansAll.filter(c => !allowlist.has(c))
  const acceptedContent = contentOrphansAll.length - contentOrphans.length

  const accepted = n => (n ? `  (+${n} accepted via allowlist)` : '')

  console.log(`CLAUDE.md content-loss audit (TASK-1160)`)
  console.log(`  baseline:  ${BASELINE_SHA}`)
  console.log(`  corpus:    ${corpusFiles.size} .md files (CLAUDE.md + docs/ + skills)`)
  console.log(``)
  console.log(`  TIER 1 — rules (NUNCA/SIEMPRE)`)
  console.log(`    baseline:  ${baselineRules.size} distinct rule lines`)
  console.log(`    orphans:   ${ruleOrphans.length}${accepted(acceptedRules)}`)
  console.log(``)
  console.log(`  TIER 2 — content (every meaningful line: prose, code, paths, tables)`)
  console.log(`    baseline:  ${baselineContent.size} distinct content lines`)
  console.log(`    orphans:   ${contentOrphans.length}${accepted(acceptedContent)}`)

  const printOrphans = (label, list) => {
    if (!list.length) return

    if (LIST) {
      console.log(`\n── ${label} ──`)
      for (const o of list) console.log(`  • ${o.slice(0, 160)}`)
    } else {
      console.log(`\n  (run with --list to print the ${label})`)
    }
  }

  printOrphans('orphan rule lines (tier 1)', ruleOrphans)
  printOrphans('orphan content lines (tier 2)', contentOrphans)

  const problems = []

  if (ruleOrphans.length > 0) {
    problems.push(`${ruleOrphans.length} load-bearing RULE line(s) from the original CLAUDE.md are no longer reachable. Re-add them to the destination doc BEFORE trimming the CLAUDE.md block (move-then-pointer). Only if a rule is DELIBERATELY retired — a reviewed governance act — append it to scripts/ci/claude-md-content-allowlist.txt with a justifying comment.`)
  }

  if (contentOrphans.length > 0) {
    problems.push(`${contentOrphans.length} CONTENT line(s) from the original CLAUDE.md are no longer reachable. If a line was accidentally dropped, restore it in its destination doc. If it was a LEGITIMATE reword, append its normalized text to scripts/ci/claude-md-content-allowlist.txt (reviewed, append-only).`)
  }

  if (problems.length > 0) {
    const msg = problems.join('\n\n')

    if (STRICT) {
      console.error(`\n❌ ${msg}`)
      process.exit(1)
    }

    console.warn(`\n⚠️  ${msg}`)
    process.exit(0)
  }

  console.log(`\n✅ Zero orphans in both tiers — every original rule AND content line is still reachable.`)
  process.exit(0)
}

main()
